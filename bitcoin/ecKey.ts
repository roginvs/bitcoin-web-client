export interface ECPrivateKey {
  readonly privateKey: ArrayBuffer;
  readonly compressedPubkey: Uint8Array;
  signECDSA(dataToSig: ArrayBuffer): {
    der: Uint8Array;
    raw: {
      r: Uint8Array;
      s: Uint8Array;
      recId: 0 | 1 | 2 | 3;
    };
  };
}
