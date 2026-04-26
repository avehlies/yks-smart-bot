type GlobalRateClient = {
  globalRates: Map<string, Set<string>>;
};

const getOrCreateGuildRateSet = (client: GlobalRateClient, guildId: string): Set<string> => {
  if (!client.globalRates.get(guildId)) {
    client.globalRates.set(guildId, new Set());
  }

  return client.globalRates.get(guildId)!;
};

export const canRunForGuild = (
  client: GlobalRateClient,
  guildId: string,
  commandKey: string,
): boolean => {
  const guildRateSet = getOrCreateGuildRateSet(client, guildId);
  return !guildRateSet.has(commandKey);
};

export const markGuildRate = (
  client: GlobalRateClient,
  guildId: string,
  commandKey: string,
  ttlMs: number,
): void => {
  const guildRateSet = getOrCreateGuildRateSet(client, guildId);
  guildRateSet.add(commandKey);

  setTimeout(() => {
    client.globalRates.get(guildId)?.delete(commandKey);
  }, ttlMs);
};
