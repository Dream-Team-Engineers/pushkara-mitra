/** India-time day (YYYY-MM-DD) and hour (YYYY-MM-DDTHH) for a moment in seconds (ADR 0018). */
export function istPeriods(nowSeconds: number): readonly [string, string] {
  const shifted = new Date((nowSeconds + 5.5 * 3600) * 1000).toISOString();
  return [shifted.slice(0, 10), shifted.slice(0, 13)];
}
