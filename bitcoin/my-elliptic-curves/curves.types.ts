export type NonZeroPoint = readonly [bigint, bigint];
export type Point = null | NonZeroPoint;
export interface CurveParams {
  p: bigint;
  a: bigint;
  b: bigint;
  G: Point;
  n: bigint;
}
