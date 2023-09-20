export interface ECPrivateKey {
  readonly privateKey: ArrayBuffer;
  readonly compressedPubkey: Uint8Array;
  sign(dataToSig: ArrayBuffer): Uint8Array;
}
