import type { FastifyServerOptions } from "fastify";

function isNodeTestRuntime() {
  return (
    process.execArgv.includes("--test")
    || process.argv.includes("--test")
    || typeof process.env.NODE_TEST_CONTEXT === "string"
    || typeof process.env.NODE_TEST_WORKER_ID === "string"
  );
}

export function createLoggerOptions(
  nodeEnv: string | undefined = process.env.NODE_ENV
): FastifyServerOptions["logger"] {
  if (nodeEnv === "production") {
    return true;
  }

  if (nodeEnv === "test" || isNodeTestRuntime()) {
    return false;
  }

  return {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname",
        levelFirst: true,
        singleLine: true,
        translateTime: "SYS:HH:MM:ss"
      }
    }
  };
}
