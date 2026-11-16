import { ensurePassesBucket } from "../src/storage.ts";
import { config } from "../src/config.ts";

await ensurePassesBucket();
console.log(`bucket ready: ${config.minio.passesBucket}`);
