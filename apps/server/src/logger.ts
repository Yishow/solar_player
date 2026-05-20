import type { FastifyServerOptions } from "fastify";

function isNodeTestRuntime() {
  return process.execArgv.includes("--test");
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
