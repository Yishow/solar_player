import { config as loadDotenv } from "dotenv";
import { resolveEnvFilePath } from "./env.js";
import { isExecutedAsMainModule, startServer } from "./server-startup.js";

loadDotenv({
  path: resolveEnvFilePath(import.meta.url)
});

if (isExecutedAsMainModule(import.meta.url)) {
  void startServer();
}
