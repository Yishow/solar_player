import type { FastifyReply } from "fastify";

export type RecordLike = Record<string, unknown>;

export function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function sendBadRequest(reply: FastifyReply, error: string) {
  return reply.status(400).send({
    success: false,
    error,
    timestamp: new Date().toISOString()
  });
}

export function sendNotFound(reply: FastifyReply, error: string) {
  return reply.status(404).send({
    success: false,
    error,
    timestamp: new Date().toISOString()
  });
}
