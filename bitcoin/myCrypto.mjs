import { modulo_power_point } from "./my-elliptic-curves/curves.mjs";
import { Secp256k1 } from "./my-elliptic-curves/curves.named.mjs";
import { check_signature, signature } from "./my-elliptic-curves/ecdsa.mjs";
import { sha256 } from "./my-hashes/sha256.mjs";
import { packAsn1PairOfIntegers } from "./script/asn1.mjs";
import { describe } from "./tests.mjs";
import { arrayToBigint, bigintToArray } from "./utils/arraybuffer-bigint.mjs";

/** @typedef {import("./ecKey").ECPrivateKey} ECPrivateKey */

/** @implements {ECPrivateKey} */
export class ECPrivateKeyBigints {
  /**
   * @param {ArrayBuffer} privateKey
   */
  constructor(privateKey) {
    if (privateKey.byteLength > 32) {
      throw new Error(`Too long private key`);
    }
    /** @readonly */
    this.privateKey = privateKey;

    /** @readonly @private */
    this.privateKeyInt = arrayToBigint(privateKey);

    /** @readonly @private */
    this.publicPoint = modulo_power_point(
      Secp256k1.G,
      this.privateKeyInt,
      Secp256k1.a,
      Secp256k1.p
    );

    if (!this.publicPoint) {
      throw new Error(`Got zero as public key!`);
    }

    const buf = bigintToArray(this.publicPoint[0]);
    /** @readonly */
    this.compressedPubkey = new Uint8Array(new ArrayBuffer(buf.byteLength + 1));
    this.compressedPubkey.set(new Uint8Array(buf), 1);
    this.compressedPubkey[0] = this.publicPoint[1] % 2n == 0n ? 2 : 3;
  }

  /**
   * @param {ArrayBuffer} dataToSig
   */
  signECDSA(dataToSig) {
    const signingInt = arrayToBigint(sha256(dataToSig));

    const kBuf = new Uint8Array(32);
    crypto.getRandomValues(kBuf);

    const k = arrayToBigint(kBuf);
    if (k >= Secp256k1.n || k <= BigInt(1)) {
      throw new Error(`Not this time LOL`);
    }
    const sig = signature({
      curve: Secp256k1,
      k,
      msgHash: signingInt,
      privateKey: this.privateKeyInt,
    });

    if (
      !check_signature({
        curve: Secp256k1,
        msgHash: signingInt,
        publicKey: this.publicPoint,
        r: sig.r,
        s: sig.s,
      })
    ) {
      throw new Error("Something wrong with signatures");
    }

    const s = sig.s > Secp256k1.n / BigInt(2) ? Secp256k1.n - sig.s : sig.s;

    const rBuf = bigintToArray(sig.r);
    const sBuf = bigintToArray(s);
    const sigDer = packAsn1PairOfIntegers(rBuf, sBuf);
    return {
      der: sigDer,
      raw: {
        r: new Uint8Array(rBuf),
        s: new Uint8Array(bigintToArray(sig.s)),
        recId: sig.recId,
      },
    };
  }
}
