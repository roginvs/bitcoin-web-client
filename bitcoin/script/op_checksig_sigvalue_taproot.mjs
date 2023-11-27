import { double_sha256, sha256 } from "../my-hashes/sha256.mjs";
import {
  packTxOut,
  packUint32,
  packUint64,
  packVarInt,
} from "../protocol/messages.create.mjs";
import { readTx } from "../protocol/messages.parse.mjs";
import { describe, eq } from "../tests.mjs";
import { bufToHex, parseHexToBuf } from "../utils/arraybuffer-hex.mjs";
import { joinBuffers } from "../utils/joinBuffers.mjs";
import { packHashCodeType, readHashCodeType } from "./hashCode.mjs";

/**
 * https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#common-signature-message
 *
 * This is SigMsg function
 *
 * @param {import("../protocol/types").BitcoinTransaction} spending
 * @param {number} spendingIndex
 * @param {import("../protocol/messages.types").PkScript[]} sourcePkScripts
 * @param {bigint[]} sourceAmounts
 * @param {number | ReturnType<typeof readHashCodeType>} hashCodeType
 * @param {number} extFlag
 */
export function getOpChecksigSignatureValueTapRoot(
  spending,
  spendingIndex,
  /**
   * We expect that it already:
   *   - removed code before last OP_CODESEPARATORS
   */
  sourcePkScripts,
  sourceAmounts,
  /**
   * We accept number to be able to contact exactly the same number
   * 0x01 is SIGHASH_ALL default
   */
  hashCodeType,
  extFlag
) {
  const hashCode =
    typeof hashCodeType === "number"
      ? readHashCodeType(hashCodeType)
      : hashCodeType;

  /** @type {ArrayBuffer[]} */
  const bufs = [];

  bufs.push(
    new Uint8Array([
      typeof hashCodeType === "number"
        ? hashCodeType
        : packHashCodeType(hashCodeType),
    ])
  );

  bufs.push(packUint32(spending.version));
  bufs.push(packUint32(spending.lockTime));

  if (!hashCode.isSigHashAnyoneCanPay) {
    bufs.push(
      sha256(
        joinBuffers(
          ...spending.txIn.map((outpoint) =>
            joinBuffers(
              new Uint8Array(outpoint.outpointHash),
              new Uint8Array(packUint32(outpoint.outpointIndex))
            )
          )
        )
      )
    );

    bufs.push(
      sha256(
        joinBuffers(
          ...sourceAmounts.map((amount) => new Uint8Array(packUint64(amount)))
        )
      )
    );

    bufs.push(
      sha256(
        joinBuffers(
          ...sourcePkScripts.map((script) =>
            joinBuffers(
              new Uint8Array(packVarInt(script.byteLength)),
              new Uint8Array(script)
            )
          )
        )
      )
    );

    bufs.push(
      sha256(
        joinBuffers(
          ...spending.txIn.map((outpoint) =>
            joinBuffers(new Uint8Array(packUint32(outpoint.sequence)))
          )
        )
      )
    );
  }

  if (!hashCode.isSigHashSingle && !hashCode.isSigHashNone) {
    bufs.push(
      sha256(joinBuffers(...spending.txOut.map((txout) => packTxOut(txout))))
    );
  }

  for (const b of bufs) {
    console.info(bufToHex(b));
  }
  //bufs.push(packUint32(spending.version));

  /*
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
      */

  const buf = joinBuffers(...bufs.map((buf) => new Uint8Array(buf)));

  return buf;
}

/**
 * If it is P2WPKH then script is implied as this one
 * @param {ArrayBuffer} keyHash
 */
function p2wpkhProgramForOpChecksig(keyHash) {
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

describe("getOpChecksigSignatureValueTapRoot", () => {
  const txRaw =
    /** @type {import("../protocol/messages.types").TransactionPayload} */ (
      parseHexToBuf(
        "02000000097de20cbff686da83a54981d2b9bab3586f4ca7e48f57f5b55963115f3b334e9c010000000000000000d7b7cab57b1393ace2d064f4d4a2cb8af6def61273e127517d44759b6dafdd990000000000fffffffff8e1f583384333689228c5d28eac13366be082dc57441760d957275419a418420000000000fffffffff0689180aa63b30cb162a73c6d2a38b7eeda2a83ece74310fda0843ad604853b0100000000feffffffaa5202bdf6d8ccd2ee0f0202afbbb7461d9264a25e5bfd3c5a52ee1239e0ba6c0000000000feffffff956149bdc66faa968eb2be2d2faa29718acbfe3941215893a2a3446d32acd050000000000000000000e664b9773b88c09c32cb70a2a3e4da0ced63b7ba3b22f848531bbb1d5d5f4c94010000000000000000e9aa6b8e6c9de67619e6a3924ae25696bb7b694bb677a632a74ef7eadfd4eabf0000000000ffffffffa778eb6a263dc090464cd125c466b5a99667720b1c110468831d058aa1b82af10100000000ffffffff0200ca9a3b000000001976a91406afd46bcdfd22ef94ac122aa11f241244a37ecc88ac807840cb0000000020ac9a87f5594be208f8532db38cff670c450ed2fea8fcdefcc9a663f78bab962b0065cd1d"
      )
    );
  const [tx, rest1] = readTx(txRaw);
  if (rest1.byteLength !== 0) {
    throw new Error(`Some bytes are left`);
  }

  const utxosSpent = [
    {
      scriptPubKey:
        "512053a1f6e454df1aa2776a2814a721372d6258050de330b3c6d10ee8f4e0dda343",
      amountSats: 420000000,
    },
    {
      scriptPubKey:
        "5120147c9c57132f6e7ecddba9800bb0c4449251c92a1e60371ee77557b6620f3ea3",
      amountSats: 462000000,
    },
    {
      scriptPubKey: "76a914751e76e8199196d454941c45d1b3a323f1433bd688ac",
      amountSats: 294000000,
    },
    {
      scriptPubKey:
        "5120e4d810fd50586274face62b8a807eb9719cef49c04177cc6b76a9a4251d5450e",
      amountSats: 504000000,
    },
    {
      scriptPubKey:
        "512091b64d5324723a985170e4dc5a0f84c041804f2cd12660fa5dec09fc21783605",
      amountSats: 630000000,
    },
    {
      scriptPubKey: "00147dd65592d0ab2fe0d0257d571abf032cd9db93dc",
      amountSats: 378000000,
    },
    {
      scriptPubKey:
        "512075169f4001aa68f15bbed28b218df1d0a62cbbcf1188c6665110c293c907b831",
      amountSats: 672000000,
    },
    {
      scriptPubKey:
        "5120712447206d7a5238acc7ff53fbe94a3b64539ad291c7cdbc490b7577e4b17df5",
      amountSats: 546000000,
    },
    {
      scriptPubKey:
        "512077e30a5522dd9f894c3f8b8bd4c4b2cf82ca7da8a3ea6a239655c39c050ab220",
      amountSats: 588000000,
    },
  ];
  const sourcePkScripts = utxosSpent.map(
    (utxo) =>
      /** @type {import("../protocol/messages.types").PkScript} */ (
        parseHexToBuf(utxo.scriptPubKey)
      )
  );
  const sourceAmounts = utxosSpent.map((utxo) => BigInt(utxo.amountSats));

  {
    getOpChecksigSignatureValueTapRoot(
      tx,
      0,
      sourcePkScripts,
      sourceAmounts,
      0x01,
      0
    );
  }

  //  const input0 = {
  //    // P2PK
  //    script: /** @type {import("../protocol/messages.types").PkScript} */ (
  //      parseHexToBuf(
  //        // 03c9f4836b9a4f77fc0d81f7bcb01b7f1b35916864b9476c241ce9fc198bd25432 OP_CHECKSIG
  //        "2103c9f4836b9a4f77fc0d81f7bcb01b7f1b35916864b9476c241ce9fc198bd25432ac"
  //      )
  //    ),
  //    // This private key is for public key above
  //    privateKey: parseHexToBuf(
  //      "bbc27228ddcb9209d7fd6f36b02f7dfa6252af40bb2f1cbc7a557da8027ff866"
  //    ),
  //  };
  //
  //  const input1 = {
  //    // P2WPKH
  //    script: /** @type {import("../protocol/messages.types").PkScript} */ (
  //      parseHexToBuf("00141d0f172a0ecb48aee1be1f2687d2963ae33f71a1")
  //    ),
  //    privateKey: parseHexToBuf(
  //      "619c335025c7f4012e556c2a58b2506e30b8511b53ade95ea316fd8c3286feb9"
  //    ),
  //    // This is public key for the private key above
  //    // Hash of this key (1d0f172a0ecb48aee1be1f2687d2963ae33f71a1) is in pkScript above
  //    publicKey: parseHexToBuf(
  //      "025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357"
  //    ),
  //  };
  //
  //  eq(
  //    bufToHex(
  //      sha256(
  //        getOpChecksigSignatureValueWitness(
  //          tx,
  //          // Input 1 is witness
  //          1,
  //          p2wpkhProgramForOpChecksig(
  //            parseHexToBuf("1d0f172a0ecb48aee1be1f2687d2963ae33f71a1")
  //          ),
  //          // Amount
  //          BigInt(6 * 100000000),
  //          // SIGHASH_ALL
  //          0x01
  //        )
  //      )
  //    ),
  //    "c37af31116d1b27caf68aae9e3ac82f1477929014d5b917657d0eb49478cb670",
  //    "getOpChecksigSignatureValueWitness"
  //  );
});
