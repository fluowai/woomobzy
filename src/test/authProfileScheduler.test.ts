import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleAuthProfileLoad } from '../../context/AuthContext';

describe('scheduleAuthProfileLoad', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('defers the profile query until the auth callback has returned', async () => {
    vi.useFakeTimers();
    const loadProfile = vi.fn().mockResolvedValue(undefined);

    const result = scheduleAuthProfileLoad(loadProfile, 'user-123');

    expect(result).toBeUndefined();
    expect(loadProfile).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    expect(loadProfile).toHaveBeenCalledOnce();
    expect(loadProfile).toHaveBeenCalledWith('user-123');
  });
});
