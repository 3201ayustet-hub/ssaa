import type { GameState } from "./types";

export const initialGameState: GameState = {
  players: [
    { id: "p1", name: "Aさん", color: "#E85D75", periodPoints: 320, cumulativePoints: 1240, ownedCount: 12 },
    { id: "p2", name: "Bさん", color: "#4C7DDB", periodPoints: 280, cumulativePoints: 1100, ownedCount: 10 },
    { id: "p3", name: "Cさん", color: "#4DAA72", periodPoints: 250, cumulativePoints: 980, ownedCount: 9 },
    { id: "p4", name: "Dさん", color: "#D9A441", periodPoints: 190, cumulativePoints: 760, ownedCount: 7 },
  ],
  prefectures: [
    { id: "tokyo", name: "東京", status: "excluded" },
    { id: "osaka", name: "大阪", status: "excluded" },
    { id: "hokkaido", name: "北海道", status: "owned", ownerId: "p2", acquiredAt: "2026-09-20" },
    { id: "aomori", name: "青森", status: "owned", ownerId: "p1", acquiredAt: "2026-08-14" },
    { id: "kyoto", name: "京都", status: "owned", ownerId: "p3", acquiredAt: "2026-07-01" },
    { id: "kochi", name: "高知", status: "blank" },
  ],
};
