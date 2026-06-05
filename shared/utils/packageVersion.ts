import packageJson from "../../package.json";

interface PackageManifest {
  version: string;
  subVersion?: number;
}

const manifest = packageJson as PackageManifest;

/**
 * Returns the upstream open-source semver from package.json.
 *
 * @return base version string (e.g. "1.7.1").
 */
export function getBaseVersion(): string {
  return manifest.version;
}

/**
 * Returns the fork sub-version used to track local changes on top of the base.
 *
 * @return non-negative integer sub-version.
 */
export function getSubVersion(): number {
  const subVersion = manifest.subVersion;
  if (typeof subVersion === "number" && Number.isInteger(subVersion) && subVersion >= 0) {
    return subVersion;
  }
  return 0;
}

/**
 * Returns the full installation version as `{base}_{sub}`.
 *
 * @return full version string (e.g. "1.7.1_3").
 */
export function getFullVersion(): string {
  return `${getBaseVersion()}_${getSubVersion()}`;
}

/**
 * Extracts the upstream semver from a full or base version string.
 *
 * @param version full (`1.7.1_2`) or base (`1.7.1`) version.
 * @return upstream semver portion.
 */
export function parseBaseVersion(version: string): string {
  const separatorIndex = version.lastIndexOf("_");
  if (separatorIndex === -1) {
    return version;
  }

  const baseVersion = version.slice(0, separatorIndex);
  const subVersionPart = version.slice(separatorIndex + 1);

  if (!/^\d+$/.test(subVersionPart)) {
    return version;
  }

  return baseVersion;
}
