export type ManagedSourceAdapter = {
  handleMessage: (topic: string, rawPayload: string) => Promise<void> | void;
  subscriptionFilters: readonly string[];
};
