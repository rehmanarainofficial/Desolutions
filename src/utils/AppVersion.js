export const APP_VERSION = '1.0';

/**
 * Compares two semantic version strings ('1.0' vs '1.1').
 * Returns true if installedVersion < minRequiredVersion.
 */
export const isVersionOutdated = (installedVersion, minRequiredVersion) => {
  if (!minRequiredVersion) return false;
  if (!installedVersion) return true;

  const installedParts = String(installedVersion)
    .split('.')
    .map(v => parseInt(v, 10) || 0);
  const minParts = String(minRequiredVersion)
    .split('.')
    .map(v => parseInt(v, 10) || 0);

  const maxLength = Math.max(installedParts.length, minParts.length);

  for (let i = 0; i < maxLength; i++) {
    const inst = installedParts[i] || 0;
    const min = minParts[i] || 0;

    if (inst < min) {
      return true;
    }
    if (inst > min) {
      return false;
    }
  }

  return false;
};
