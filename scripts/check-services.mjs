import net from 'net';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '../logs/connection_status.log');

function logToFile(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, formattedMessage);
}

function checkPostgres(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on('connect', () => {
      socket.destroy();
      resolve({ service: 'PostgreSQL', status: 'OK', address: `${host}:${port}` });
    });

    socket.on('error', (err) => {
      resolve({ service: 'PostgreSQL', status: 'FAILED', address: `${host}:${port}`, error: err.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ service: 'PostgreSQL', status: 'TIMEOUT', address: `${host}:${port}` });
    });

    socket.connect(port, host);
  });
}

function checkMinio(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve({ service: 'MinIO', status: 'OK', address: url });
      } else {
        resolve({ service: 'MinIO', status: 'FAILED', address: url, error: `HTTP ${res.statusCode}` });
      }
    });

    req.on('error', (err) => {
      resolve({ service: 'MinIO', status: 'FAILED', address: url, error: err.message });
    });

    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ service: 'MinIO', status: 'TIMEOUT', address: url });
    });
  });
}

async function runChecks() {
  logToFile('--- Starting service connection checks ---');

  const results = await Promise.all([
    checkPostgres('localhost', 5432),
    checkMinio('http://localhost:9000/minio/health/live')
  ]);

  results.forEach(res => {
    if (res.status === 'OK') {
      logToFile(`✅ ${res.service} at ${res.address}: Connected`);
    } else {
      logToFile(`❌ ${res.service} at ${res.address}: ${res.status} ${res.error ? `(${res.error})` : ''}`);
    }
  });

  logToFile('--- Checks completed ---');
}

runChecks().catch(err => {
  console.error('Fatal error during checks:', err);
  process.exit(1);
});
