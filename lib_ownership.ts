export type Stay = {
  playerId: string;
  prefectureId: string;
  stayDate: string;
};

export function resolveOwnership(stays: Stay[]) {
  const byDate = new Map<string, Stay[]>();

  for (const stay of stays) {
    const list = byDate.get(stay.stayDate) ?? [];
    list.push(stay);
    byDate.set(stay.stayDate, list);
  }

  const latestDate = [...byDate.keys()].sort().at(-1);
  if (!latestDate) return { status: "unclaimed" as const };

  const candidates = byDate.get(latestDate)!;
  if (candidates.length > 1) return { status: "blank" as const };

  return { status: "owned" as const, ownerId: candidates[0].playerId, acquiredAt: latestDate };
}
