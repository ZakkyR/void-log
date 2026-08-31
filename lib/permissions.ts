import { browser } from 'wxt/browser';

const REQUIRED_ORIGINS = ['*://www.youtube.com/*'];

export async function hasRequiredHostPermissions(): Promise<boolean> {
  if (!browser.permissions) return true;
  return browser.permissions.contains({ origins: REQUIRED_ORIGINS });
}

export async function requestRequiredHostPermissions(): Promise<boolean> {
  if (!browser.permissions) return true;
  return browser.permissions.request({ origins: REQUIRED_ORIGINS });
}
