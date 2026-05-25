/* oxlint-disable @typescript-eslint/no-var-requires */

const exec = require("child_process").execSync;
const fs = require("fs");
const path = require("path");

const sslDir = path.join(__dirname, "..", "config", "certs");
const sslCert = path.join(sslDir, "public.cert");
const sslKey = path.join(sslDir, "private.key");
const projectRoot = path.join(__dirname, "..", "..");

/**
 * Collects extra hostnames from env files for mkcert.
 *
 * @return Space-separated quoted hostnames for mkcert.
 */
function getExtraCertHosts() {
  const hosts = new Set(['"*.outline.dev"']);
  const envFiles = [".env.local", ".env.development", ".env"];

  for (const file of envFiles) {
    const filePath = path.join(projectRoot, file);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const match = content.match(/^URL=(.+)$/m);

    if (!match) {
      continue;
    }

    try {
      const hostname = new URL(match[1].trim()).hostname;

      if (hostname && hostname !== "localhost") {
        hosts.add(`"${hostname}"`);
      }
    } catch {
      // Invalid URL in env file
    }
  }

  return Array.from(hosts).join(" ");
}

if (!fs.existsSync(sslKey) || !fs.existsSync(sslCert)) {
  try {
    const certHosts = getExtraCertHosts();
    exec(
      `mkcert -cert-file ${sslDir}/public.cert -key-file ${sslDir}/private.key ${certHosts} && mkcert -install`
    );
    console.log("🔒 Local SSL certificate created");
  } catch (e) {
    console.log(
      "SSL certificates could not be generated. Ensure mkcert is installed and in your PATH"
    );
    console.log(e.message);
  }
}
