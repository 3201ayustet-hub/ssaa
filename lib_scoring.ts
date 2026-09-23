export type ScoringSettings = {
  homeRegionPoint: number;
  otherRegionPoint: number;
  completionMultiplier: number;
};

export function monthlyPoints(
  basePoint: number,
  hasRegionCompletion: boolean,
  settings: ScoringSettings,
) {
  const multiplier = hasRegionCompletion ? settings.completionMultiplier : 1;
  return Math.ceil(basePoint * multiplier);
}

export function pointForPrefecture(
  isHomeRegion: boolean,
  hasRegionCompletion: boolean,
  settings: ScoringSettings,
) {
  const base = isHomeRegion ? settings.homeRegionPoint : settings.otherRegionPoint;
  return monthlyPoints(base, hasRegionCompletion, settings);
}
