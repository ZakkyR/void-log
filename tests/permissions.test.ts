import { describe, it, expect, vi } from 'vitest';
import { hasRequiredHostPermissions, requestRequiredHostPermissions } from '@/lib/permissions';

vi.mock('wxt/browser', () => ({
  browser: {
    permissions: {
      contains: vi.fn().mockResolvedValue(true),
      request: vi.fn().mockResolvedValue(true),
    },
  },
}));

describe('permissions helpers', () => {
  it('checks required host permissions', async () => {
    await expect(hasRequiredHostPermissions()).resolves.toBe(true);
  });

  it('requests required host permissions', async () => {
    await expect(requestRequiredHostPermissions()).resolves.toBe(true);
  });
});
