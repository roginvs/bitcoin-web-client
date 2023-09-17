/** @type {import("./types").CurveParams} */
export const Secp256k1 = {
  p: `FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFE FFFFFC2F`
    .split(" ")
    .map((x) => parseInt(x, 16)),
  a: [0, 0, 0, 0, 0, 0, 0, 0],
  b: [0, 0, 0, 0, 0, 0, 0, 7],
  G: [
    "79BE667E F9DCBBAC 55A06295 CE870B07 029BFCDB 2DCE28D9 59F2815B 16F81798"
      .split(" ")
      .map((x) => parseInt(x, 16)),

    "483ADA77 26A3C465 5DA4FBFC 0E1108A8 FD17B448 A6855419 9C47D08F FB10D4B8"
      .split(" ")
      .map((x) => parseInt(x, 16)),
  ],
  n: "FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFE BAAEDCE6 AF48A03B BFD25E8C D0364141"
    .split(" ")
    .map((x) => parseInt(x, 16)),
};
