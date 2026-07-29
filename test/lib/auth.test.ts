import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, register, verifyAuthSession, normalizeAvatarUrl, saveAuthSession, clearAuthSession, getAuthSnapshot, parseAuthSession } from '../../lib/auth';

describe('auth lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  describe('normalizeAvatarUrl', () => {
    it('should return undefined for empty input', () => {
      expect(normalizeAvatarUrl(null)).toBeUndefined();
      expect(normalizeAvatarUrl('')).toBeUndefined();
    });

    it('should return original url for full urls', () => {
      const url = 'https://example.com/avatar.png';
      expect(normalizeAvatarUrl(url)).toBe(url);
    });

    it('should prepend base url for relative paths', () => {
      const path = '/avatars/1.png';
      const result = normalizeAvatarUrl(path);
      expect(result).toContain('http://127.0.0.1:8000/avatars/1.png');
    });
  });

  describe('login', () => {
    it('should throw error when api returns invalid token', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await expect(login({ username: 'test', password: 'password' }))
        .rejects.toThrow('登录接口未返回有效的 access token。');
    });

    it('should return auth session on success', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'valid_token',
          token_type: 'bearer'
        })
      });

      const session = await login({ username: 'test', password: 'password' });
      expect(session).toEqual({
        accessToken: 'valid_token',
        tokenType: 'Bearer', // normalized
        username: 'test'
      });
    });
  });

  describe('session management', () => {
    it('should save and retrieve session', () => {
      const session = {
        accessToken: 'token',
        tokenType: 'Bearer',
        username: 'user'
      };
      saveAuthSession(session);

      const snapshot = getAuthSnapshot();
      expect(snapshot).not.toBeNull();

      const parsed = parseAuthSession(snapshot);
      expect(parsed).toEqual(session);
    });

    it('should clear session', () => {
      window.localStorage.setItem('chat_auth_session_v1', 'something');
      clearAuthSession();
      expect(getAuthSnapshot()).toBeNull();
    });
  });
});
