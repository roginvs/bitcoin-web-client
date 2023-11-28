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
 * @param {Uint8Array | null} annex
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
  extFlag = 0,
  annex = null
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

  bufs.push(new Uint8Array([extFlag * 2 + (annex ? 1 : 0)]));

  if (hashCode.isSigHashAnyoneCanPay) {
    bufs.push(
      joinBuffers(
        new Uint8Array(spending.txIn[spendingIndex].outpointHash),
        new Uint8Array(packUint32(spending.txIn[spendingIndex].outpointIndex))
      )
    );

    bufs.push(new Uint8Array(packUint64(sourceAmounts[spendingIndex])));

    bufs.push(
      joinBuffers(
        new Uint8Array(packVarInt(sourcePkScripts[spendingIndex].byteLength)),
        new Uint8Array(sourcePkScripts[spendingIndex])
      )
    );

    bufs.push(
      new Uint8Array(packUint32(spending.txIn[spendingIndex].sequence))
    );
  } else {
    bufs.push(new Uint8Array(packUint32(spendingIndex)));
  }
  if (annex) {
    throw new Error("Annex is not implemented. Quite simple to add by the way");
  }

  if (hashCode.isSigHashSingle) {
    bufs.push(sha256(packTxOut(spending.txOut[spendingIndex])));
  }

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

  for (const [index, hashType, sigMsg] of /** @type {const} */ ([
    [
      0,
      3,
      "0003020000000065cd1de3b33bb4ef3a52ad1fffb555c0d82828eb22737036eaeb02a235d82b909c4c3f58a6964a4f5f8f0b642ded0a8a553be7622a719da71d1f5befcefcdee8e0fde623ad0f61ad2bca5ba6a7693f50fce988e17c3780bf2b1e720cfbb38fbdd52e2118959c7221ab5ce9e26c3cd67b22c24f8baa54bac281d8e6b05e400e6c3a957e0000000000d0418f0e9a36245b9a50ec87f8bf5be5bcae434337b87139c3a5b1f56e33cba0",
    ],
    [
      1,
      131,
      "0083020000000065cd1d00d7b7cab57b1393ace2d064f4d4a2cb8af6def61273e127517d44759b6dafdd9900000000808f891b00000000225120147c9c57132f6e7ecddba9800bb0c4449251c92a1e60371ee77557b6620f3ea3ffffffffffcef8fb4ca7efc5433f591ecfc57391811ce1e186a3793024def5c884cba51d",
    ],
    [
      3,
      1,
      "0001020000000065cd1de3b33bb4ef3a52ad1fffb555c0d82828eb22737036eaeb02a235d82b909c4c3f58a6964a4f5f8f0b642ded0a8a553be7622a719da71d1f5befcefcdee8e0fde623ad0f61ad2bca5ba6a7693f50fce988e17c3780bf2b1e720cfbb38fbdd52e2118959c7221ab5ce9e26c3cd67b22c24f8baa54bac281d8e6b05e400e6c3a957ea2e6dab7c1f0dcd297c8d61647fd17d821541ea69c3cc37dcbad7f90d4eb4bc50003000000",
    ],
    [
      4,
      0,
      "0000020000000065cd1de3b33bb4ef3a52ad1fffb555c0d82828eb22737036eaeb02a235d82b909c4c3f58a6964a4f5f8f0b642ded0a8a553be7622a719da71d1f5befcefcdee8e0fde623ad0f61ad2bca5ba6a7693f50fce988e17c3780bf2b1e720cfbb38fbdd52e2118959c7221ab5ce9e26c3cd67b22c24f8baa54bac281d8e6b05e400e6c3a957ea2e6dab7c1f0dcd297c8d61647fd17d821541ea69c3cc37dcbad7f90d4eb4bc50004000000",
    ],
    [
      6,
      2,
      "0002020000000065cd1de3b33bb4ef3a52ad1fffb555c0d82828eb22737036eaeb02a235d82b909c4c3f58a6964a4f5f8f0b642ded0a8a553be7622a719da71d1f5befcefcdee8e0fde623ad0f61ad2bca5ba6a7693f50fce988e17c3780bf2b1e720cfbb38fbdd52e2118959c7221ab5ce9e26c3cd67b22c24f8baa54bac281d8e6b05e400e6c3a957e0006000000",
    ],
    [
      7,
      130,
      "0082020000000065cd1d00e9aa6b8e6c9de67619e6a3924ae25696bb7b694bb677a632a74ef7eadfd4eabf00000000804c8b2000000000225120712447206d7a5238acc7ff53fbe94a3b64539ad291c7cdbc490b7577e4b17df5ffffffff",
    ],
    [
      8,
      129,
      "0081020000000065cd1da2e6dab7c1f0dcd297c8d61647fd17d821541ea69c3cc37dcbad7f90d4eb4bc500a778eb6a263dc090464cd125c466b5a99667720b1c110468831d058aa1b82af101000000002b0c230000000022512077e30a5522dd9f894c3f8b8bd4c4b2cf82ca7da8a3ea6a239655c39c050ab220ffffffff",
    ],
  ])) {
    const sigHash = getOpChecksigSignatureValueTapRoot(
      tx,
      index,
      sourcePkScripts,
      sourceAmounts,
      hashType,
      0
    );
    eq("00" + bufToHex(sigHash), sigMsg, `Index ${index}`);
  }
});
