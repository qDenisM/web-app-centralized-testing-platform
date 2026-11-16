import { ensureDocumentsBucket } from "../src/storage.ts";
import { config } from "../src/config.ts";

await ensureDocumentsBucket();
console.log(`bucket ready: ${config.minio.documentsBucket}`);
