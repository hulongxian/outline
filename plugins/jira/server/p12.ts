import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import https from "node:https";
import type { Agent } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSecureContext } from "node:tls";

const MaxP12Bytes = 256 * 1024;

let opensslSupportsLegacy: boolean | undefined;

interface PemMaterial {
  cert: string;
  key: string;
}

/**
 * Decodes a base64 P12/PFX payload from the connect form.
 *
 * @param p12Base64 - Base64-encoded certificate file.
 * @return Raw PKCS#12 bytes.
 */
export function decodeP12Base64(p12Base64: string): Buffer {
  const normalized = p12Base64.replace(/\s/g, "");

  if (!normalized.length) {
    throw new Error("P12 certificate is empty");
  }

  const pfx = Buffer.from(normalized, "base64");

  if (!pfx.length) {
    throw new Error("P12 certificate is not valid base64");
  }

  return pfx;
}

/**
 * Returns whether Node can load the PKCS#12 bundle for TLS.
 *
 * @param pfx - Raw PKCS#12 bytes.
 * @param passphrase - Optional export passphrase.
 * @return True when `pfx` works with the platform TLS stack.
 */
export function canLoadPkcs12WithNode(
  pfx: Buffer,
  passphrase?: string
): boolean {
  try {
    createSecureContext({
      pfx,
      passphrase: passphrase || undefined,
    });
    return true;
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "ERR_CRYPTO_UNSUPPORTED_OPERATION"
    ) {
      return false;
    }

    throw err;
  }
}

/**
 * Returns whether the installed OpenSSL CLI supports the `-legacy` flag.
 *
 * @return True for OpenSSL 3.x.
 */
export function opensslCliSupportsLegacyFlag(): boolean {
  if (opensslSupportsLegacy !== undefined) {
    return opensslSupportsLegacy;
  }

  try {
    const version = execFileSync("openssl", ["version"], {
      encoding: "utf8",
    }).trim();
    opensslSupportsLegacy = /^OpenSSL 3\./.test(version);
  } catch {
    opensslSupportsLegacy = false;
  }

  return opensslSupportsLegacy;
}

/**
 * Parses PEM certificate chain and private key from OpenSSL output.
 *
 * @param output - PEM text from `openssl pkcs12 -nodes`.
 * @return Certificate chain and private key.
 */
export function parsePemFromOpenSSLOutput(output: string): PemMaterial {
  const certs = output.match(
    /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g
  );
  const keyMatch = output.match(
    /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC )?PRIVATE KEY-----/
  );

  if (!certs?.length || !keyMatch) {
    throw new Error(
      "P12 file does not contain a certificate and private key pair"
    );
  }

  const cert = certs.join("\n");
  const key = keyMatch[0];

  createSecureContext({ cert, key });

  return { cert, key };
}

/**
 * Runs `openssl pkcs12` against a temporary file.
 *
 * @param pfx - Raw PKCS#12 bytes.
 * @param passphrase - Optional export passphrase.
 * @param legacy - Whether to pass `-legacy` (OpenSSL 3+ only).
 * @return PEM output from OpenSSL.
 */
function runOpenSslPkcs12Export(
  pfx: Buffer,
  passphrase: string | undefined,
  legacy: boolean
): string {
  const dir = mkdtempSync(join(tmpdir(), `outline-jira-p12-${randomBytes(4).toString("hex")}-`));
  const inPath = join(dir, "client.pfx");

  try {
    writeFileSync(inPath, pfx, { mode: 0o600 });

    const args = [
      "pkcs12",
      "-in",
      inPath,
      "-nodes",
      "-passin",
      passphrase ? `pass:${passphrase}` : "pass:",
    ];

    if (legacy) {
      args.push("-legacy");
    }

    return execFileSync("openssl", args, {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
    });
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup failures.
    }
  }
}

/**
 * Decrypts a PKCS#12 file with OpenSSL and returns PEM material.
 *
 * @param pfx - Raw PKCS#12 bytes.
 * @param passphrase - Optional export passphrase.
 * @return Certificate chain and private key in PEM form.
 */
export function extractPemFromP12WithOpenSSL(
  pfx: Buffer,
  passphrase?: string
): PemMaterial {
  const attempts: boolean[] = opensslCliSupportsLegacyFlag()
    ? [false, true]
    : [false];

  let lastMessage = "OpenSSL could not read the P12 file";

  for (const legacy of attempts) {
    try {
      const output = runOpenSslPkcs12Export(pfx, passphrase, legacy);
      return parsePemFromOpenSSLOutput(output);
    } catch (err) {
      if (err instanceof Error && err.message) {
        lastMessage = err.message.replace(/pass:[^\s]+/g, "pass:***");
      }
    }
  }

  throw new Error(
    `Unable to decrypt the P12 certificate. Check the passphrase and file. ${lastMessage}`
  );
}

/**
 * Creates an HTTPS agent for Jira mTLS, including legacy PKCS#12 ciphers.
 *
 * @param p12Base64 - Base64-encoded P12/PFX file contents.
 * @param p12Passphrase - Passphrase for the P12 file.
 * @return HTTPS agent configured for client certificate authentication.
 */
export function createJiraHttpsAgentFromP12(
  p12Base64: string,
  p12Passphrase?: string
): Agent {
  const pfx = decodeP12Base64(p12Base64);

  if (pfx.length > MaxP12Bytes) {
    throw new Error("P12 certificate exceeds maximum allowed size");
  }

  const passphrase = p12Passphrase || undefined;

  if (canLoadPkcs12WithNode(pfx, passphrase)) {
    return new https.Agent({
      pfx,
      passphrase,
      keepAlive: true,
      maxSockets: 20,
    });
  }

  const { cert, key } = extractPemFromP12WithOpenSSL(pfx, passphrase);

  return new https.Agent({
    cert,
    key,
    keepAlive: true,
    maxSockets: 20,
  });
}
