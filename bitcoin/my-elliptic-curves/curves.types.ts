export type Point = null | readonly [bigint, bigint];
export interface CurveParams {
  p: bigint;
  a: bigint;
  b: bigint;
  G: Point;
  n: bigint;
}
