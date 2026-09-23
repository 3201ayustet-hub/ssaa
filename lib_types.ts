export type PrefectureStatus = "unclaimed" | "blank" | "excluded" | "owned";

export type Player = {
  id: string;
  name: string;
  color: string;
  periodPoints: number;
  cumulativePoints: number;
  ownedCount: number;
};

export type PrefectureView = {
  id: string;
  name: string;
  status: PrefectureStatus;
  ownerId?: string;
  acquiredAt?: string;
};

export type GameState = {
  players: Player[];
  prefectures: PrefectureView[];
};
