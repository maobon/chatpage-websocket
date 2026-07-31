import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../../hooks/useAuth';
import * as authLib from '../../lib/auth';

vi.mock('../../lib/auth', async () => {
  const actual = await vi.importActual('../../lib/auth');
  return {
    ...actual,
    verifyAuthSession: vi.fn(),
  };
});

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    // 强制刷新 snapshot
    window.dispatchEvent(new Event('storage'));
  });

  it('should return unauthenticated when no session exists', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.status).toBe('unauthenticated');
  });

  it('should transition to authenticated when session exists and is verified', async () => {
    const mockSession = {
      accessToken: 'valid_token',
      tokenType: 'Bearer',
      username: 'testuser'
    };

    // 模拟已存储的会话
    vi.spyOn(authLib, 'getAuthSnapshot').mockReturnValue(JSON.stringify(mockSession));
    vi.mocked(authLib.verifyAuthSession).mockResolvedValue({ username: 'testuser' });

    const { result } = renderHook(() => useAuth());

    // 初始状态应为 checking
    expect(result.current.status).toBe('checking');

    await waitFor(() => {
      expect(result.current.status).toBe('authenticated');
    });
  });

  it('should clear session if verification fails', async () => {
    const mockSession = {
      accessToken: 'invalid_token',
      tokenType: 'Bearer',
      username: 'testuser'
    };

    vi.spyOn(authLib, 'getAuthSnapshot').mockReturnValue(JSON.stringify(mockSession));
    vi.mocked(authLib.verifyAuthSession).mockResolvedValue(false); // 验证失败
    const clearSpy = vi.spyOn(authLib, 'clearAuthSession');

    renderHook(() => useAuth());

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
