export type MyBigNumber = number[];

export type NonZeroPoint = readonly [MyBigNumber, MyBigNumber];
export type Point = null | NonZeroPoint;
export interface CurveParams {
  p: MyBigNumber;
  a: MyBigNumber;
  b: MyBigNumber;
  G: NonZeroPoint;
  n: MyBigNumber;
}

export interface Signature {
  r: MyBigNumber;
  s: MyBigNumber;
}
