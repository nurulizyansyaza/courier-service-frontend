/** Format offer distance range for display */
export function formatOfferDist(o: { minDistance: number; maxDistance: number }): string {
  return o.minDistance === 0 ? `< ${o.maxDistance}` : `${o.minDistance} - ${o.maxDistance}`;
}
