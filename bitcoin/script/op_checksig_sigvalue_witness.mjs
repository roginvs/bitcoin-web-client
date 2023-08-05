import { double_sha256, sha256 } from "../my-hashes/sha256.mjs";
import {
  packTxOut,
  packUint32,
  packVarInt,
} from "../protocol/messages.create.mjs";
import { readTx } from "../protocol/messages.parse.mjs";
import { describe, eq } from "../tests.mjs";
import { bufToHex, parseHexToBuf } from "../utils/arraybuffer-hex.mjs";
import { joinBuffers } from "../utils/joinBuffers.mjs";
import { packHashCodeType, readHashCodeType } from "./hashCode.mjs";

/**
 * Check BIP-0143 for more details
 * @param {import("../protocol/types").BitcoinTransaction} spending
 * @param {number} spendingIndex
 * @param {import("../protocol/messages.types").PkScript} sourcePkScript
 * @param {bigint} sourceAmount
 * @param {number | ReturnType<typeof readHashCodeType>} hashCodeType
 */
export function getOpChecksigSignatureValueWitness(
  spending,
  spendingIndex,
  /**
   * We expect that it already:
   *   - removed code before last OP_CODESEPARATORS
   */
  sourcePkScript,
  sourceAmount,
  /**
   * We accept number to be able to contact exactly the same number
   * 0x01 is SIGHASH_ALL default
   */
  hashCodeType
) {
  const hashCode =
    typeof hashCodeType === "number"
      ? readHashCodeType(hashCodeType)
      : hashCodeType;

  /** @type {ArrayBuffer[]} */
  const bufs = [];

  bufs.push(packUint32(spending.version));

  {
    const hashPrevouts = !hashCode.isSigHashAnyoneCanPay
      ? double_sha256(
          joinBuffers(
            ...spending.txIn.flatMap((txIn) => [
              new Uint8Array(txIn.outpointHash),
              new Uint8Array(packUint32(txIn.outpointIndex)),
            ])
          )
        )
      : new ArrayBuffer(32);

    bufs.push(hashPrevouts);
  }
  {
    const hashSequence =
      !hashCode.isSigHashAnyoneCanPay &&
      !hashCode.isSigHashSingle &&
      !hashCode.isSigHashNone
        ? double_sha256(
            joinBuffers(
              ...spending.txIn.map(
                (txIn) => new Uint8Array(packUint32(txIn.sequence))
              )
            )
          )
        : new ArrayBuffer(32);
    bufs.push(hashSequence);
  }

  {
    const prevOut = joinBuffers(
      new Uint8Array(spending.txIn[spendingIndex].outpointHash),
      new Uint8Array(packUint32(spending.txIn[spendingIndex].outpointIndex))
    );
    bufs.push(prevOut);
  }

  {
    const scriptCode = joinBuffers(
      packVarInt(sourcePkScript.byteLength),
      new Uint8Array(sourcePkScript)
    );
    bufs.push(scriptCode);
  }

  {
    const amount = new ArrayBuffer(8);
    new DataView(amount).setBigUint64(0, sourceAmount, true);
    bufs.push(amount);
  }

  {
    const nSequence = packUint32(spending.txIn[spendingIndex].sequence);
    bufs.push(nSequence);
  }

  {
    const hashOutputs =
      !hashCode.isSigHashSingle && !hashCode.isSigHashNone
        ? double_sha256(
            joinBuffers(...spending.txOut.map((txOut) => packTxOut(txOut)))
          )
        : hashCode.isSigHashSingle && spendingIndex < spending.txOut.length
        ? double_sha256(packTxOut(spending.txOut[spendingIndex]))
        : new ArrayBuffer(32);
    bufs.push(hashOutputs);
  }

  bufs.push(packUint32(spending.lockTime));
  bufs.push(
    packUint32(
      typeof hashCodeType === "number"
        ? hashCodeType
        : packHashCodeType(hashCodeType)
    )
  );

  const buf = joinBuffers(...bufs.map((buf) => new Uint8Array(buf)));

  const hash = sha256(buf);
  return hash;
}

/**
 * If it is P2WPKH then script is implied as this one
 * @param {ArrayBuffer} keyHash
 */
export function p2wpkhProgramForOpChecksig(keyHash) {
  if (keyHash.byteLength !== 20) {
    throw new Error(`Wrong data`);
  }
  return /** @type {import("../protocol/messages.types").PkScript} */ (
    joinBuffers(
      new Uint8Array([0x76, 0xa9, 0x14]),

      new Uint8Array(keyHash),

      new Uint8Array([0x88, 0xac])
    ).buffer
  );
}

describe("getOpChecksigSignatureValueWitness", () => {
  const txRaw =
    /** @type {import("../protocol/messages.types").TransactionPayload} */ (
      parseHexToBuf(
        "0100000002fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f0000000000eeffffffef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a0100000000ffffffff02202cb206000000001976a9148280b37df378db99f66f85c95a783a76ac7a6d5988ac9093510d000000001976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac11000000"
      )
    );
  const [tx, rest1] = readTx(txRaw);
  if (rest1.byteLength !== 0) {
    throw new Error(`Some bytes are left`);
  }

  const input0 = {
    // P2PK
    script: /** @type {import("../protocol/messages.types").PkScript} */ (
      parseHexToBuf(
        // 03c9f4836b9a4f77fc0d81f7bcb01b7f1b35916864b9476c241ce9fc198bd25432 OP_CHECKSIG
        "2103c9f4836b9a4f77fc0d81f7bcb01b7f1b35916864b9476c241ce9fc198bd25432ac"
      )
    ),
    // This private key is for public key above
    privateKey: parseHexToBuf(
      "bbc27228ddcb9209d7fd6f36b02f7dfa6252af40bb2f1cbc7a557da8027ff866"
    ),
  };

  const input1 = {
    // P2WPKH
    script: /** @type {import("../protocol/messages.types").PkScript} */ (
      parseHexToBuf("00141d0f172a0ecb48aee1be1f2687d2963ae33f71a1")
    ),
    privateKey: parseHexToBuf(
      "619c335025c7f4012e556c2a58b2506e30b8511b53ade95ea316fd8c3286feb9"
    ),
    // This is public key for the private key above
    // Hash of this key (1d0f172a0ecb48aee1be1f2687d2963ae33f71a1) is in pkScript above
    publicKey: parseHexToBuf(
      "025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357"
    ),
  };

  eq(
    bufToHex(
      sha256(
        getOpChecksigSignatureValueWitness(
          tx,
          // Input 1 is witness
          1,
          p2wpkhProgramForOpChecksig(
            parseHexToBuf("1d0f172a0ecb48aee1be1f2687d2963ae33f71a1")
          ),
          // Amount
          BigInt(6 * 100000000),
          // SIGHASH_ALL
          0x01
        )
      )
    ),
    "c37af31116d1b27caf68aae9e3ac82f1477929014d5b917657d0eb49478cb670",
    "getOpChecksigSignatureValueWitness"
  );
});
