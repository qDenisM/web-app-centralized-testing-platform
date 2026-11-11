import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const keysDir = join(root, "keys");
const privatePath = join(keysDir, "private.pem");
const publicPath = join(keysDir, "public.pem");

if (existsSync(privatePath) && existsSync(publicPath)) {
  console.log("RSA keys already exist in keys/");
  process.exit(0);
}

mkdirSync(keysDir, { recursive: true });

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

writeFileSync(privatePath, privateKey, { mode: 0o600 });
writeFileSync(publicPath, publicKey, { mode: 0o644 });

console.log("Generated keys/private.pem and keys/public.pem");
