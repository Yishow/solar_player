import { randomUUID } from "node:crypto";

export function createDiscoveryClient(connectionRef: string) {
  return {
    canPublish: false,
    clean: true,
    clientId: `solar-discover-${randomUUID()}`,
    connectionRef,
    sharedSubscription: false
  };
}
