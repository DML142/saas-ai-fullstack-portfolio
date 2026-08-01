export function getUsageKey(userId: string): string {
  const month = new Date().toISOString().slice(0, 7);
  return `usage:messages:${userId}:${month}`;
}
