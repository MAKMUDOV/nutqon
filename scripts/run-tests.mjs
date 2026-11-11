// Server mantig'i sinovlari: lib/ ni TypeScript bilan yig'adi va handlerlarni soxta AI + xotira bazasi bilan sinaydi.
import { execSync } from "node:child_process";
execSync("npx tsc -p tests/tsconfig.json", { stdio: "inherit" });
execSync("node tests/server.test.cjs", { stdio: "inherit" });
