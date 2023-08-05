import { sha256 } from "../my-hashes/sha256.mjs";
import { packTx } from "./messages.create.mjs";

/**
 *
 * @param {ArrayBuffer} buf
 * @returns {[number, ArrayBuffer]}
 */
export function readVarInt(buf) {
  const view = new DataView(buf);
  let count = view.getUint8(0);
  let startAt = 1;

  if (count === 0xfd) {
    startAt = 3;
    count = view.getUint16(1, true);
  } else if (count === 0xfe) {
    startAt = 5;
    count = view.getUint32(1, true);
  } else if (count === 0xff) {
    startAt = 9;
    const countBig = view.getBigUint64(1);
    if (countBig > Number.MAX_SAFE_INTEGER) {
      throw new Error("Too big");
    } else {
      count = parseInt(countBig.toString());
    }
  }

  return [count, buf.slice(startAt)];
}

/**
 *
 * @param {ArrayBuffer} buf
 * @returns {[import("./types").BitcoinTransactionIn, ArrayBuffer]}
 */
export function readTxIn(buf) {
  const outpointHash =
    /** @type {import("./messages.types").TransactionHash} */ (
      buf.slice(0, 32)
    );
  const outpointIndex = new DataView(buf).getUint32(32, true);

  let scriptLen;
  [scriptLen, buf] = readVarInt(buf.slice(36));
  const script = /** @type {import("./messages.types").SignatureScript} */ (
    buf.slice(0, scriptLen)
  );

  buf = buf.slice(scriptLen);
  const sequence = new DataView(buf).getUint32(0, true);
  buf = buf.slice(4);
  return [
    {
      outpointHash,
      outpointIndex,
      script,
      sequence,
      witness:
        /** @type { undefined | import("./messages.types").WitnessStackItem[]} */ (
          undefined
        ),
    },
    buf,
  ];
}

/**
 *
 * @param {ArrayBuffer} buf
 * @returns {[import("./types").BitcoinTransactionOut, ArrayBuffer]}
 */
export function readTxOut(buf) {
  const value = new DataView(buf).getBigUint64(0, true);

  buf = buf.slice(8);

  let scriptLen;
  [scriptLen, buf] = readVarInt(buf);
  const script = /** @type {import("./messages.types").PkScript} */ (
    buf.slice(0, scriptLen)
  );
  buf = buf.slice(scriptLen);
  return [
    {
      value,
      script,
    },
    buf,
  ];
}

/**
 *
 * @param {import("./messages.types").TransactionPayload} payload
 * @returns {[import("./types").BitcoinTransaction, ArrayBuffer]}
 */
export function readTx(payload) {
  /** @type {ArrayBuffer} */
  let buf = payload;

  const version = new DataView(buf).getUint32(0, true);

  const isWitness = new Uint8Array(buf)[4] === 0;
  if (isWitness && new Uint8Array(buf)[5] !== 1) {
    throw new Error(
      `Unknown flag ${new Uint8Array(buf)[4]} ${new Uint8Array(buf)[5]}`
    );
  }

  buf = isWitness ? buf.slice(6) : buf.slice(4);

  let txInCount;
  [txInCount, buf] = readVarInt(buf);
  if (txInCount === 0) {
    throw new Error("LOL tx_in count is zero");
  }
  /** @type {import("./types").BitcoinTransactionIn[]} */
  const txIn = [];
  while (txInCount > 0) {
    let tx;
    [tx, buf] = readTxIn(buf);
    txIn.push(tx);
    txInCount--;
  }

  let txOutCount;
  [txOutCount, buf] = readVarInt(buf);
  /** @type {import("./types").BitcoinTransactionOut[]} */
  const txOut = [];
  while (txOutCount > 0) {
    let tx;
    [tx, buf] = readTxOut(buf);
    txOut.push(tx);
    txOutCount--;
  }

  if (isWitness) {
    for (let i = 0; i < txIn.length; i++) {
      /** @type {import("./messages.types").WitnessStackItem[]} */
      let witness = [];
      let witnessesCount;
      [witnessesCount, buf] = readVarInt(buf);
      for (let ii = 0; ii < witnessesCount; ii++) {
        let witnessItemLen;
        [witnessItemLen, buf] = readVarInt(buf);
        const witnessItem =
          /** @type {import("./messages.types").WitnessStackItem} */
          (buf.slice(0, witnessItemLen));
        buf = buf.slice(witnessItemLen);
        witness.push(witnessItem);
      }
      txIn[i] = {
        ...txIn[i],
        witness,
      };
    }
  }

  const lockTime = new DataView(buf).getUint32(0, true);

  buf = buf.slice(4);

  const txNoHashes = {
    version,
    txIn,
    txOut,
    lockTime,
    isWitness,
  };

  const fullTransactionBuf =
    /** @type {import("./messages.types").TransactionPayload} */
    (payload.slice(0, payload.byteLength - buf.byteLength));
  /** @type {import("./messages.types").TransactionHash} */
  let txid;
  if (!isWitness) {
    txid = /** @type {import("./messages.types").TransactionHash} */ (
      sha256(sha256(fullTransactionBuf))
    );
  } else {
    const packedWithNoWitness = packTx({
      ...txNoHashes,
      isWitness: false,

      txid: /** @type {import("./messages.types").TransactionHash} */ (
        new ArrayBuffer(0)
      ),
      wtxid: /** @type {import("./messages.types").TransactionHash} */ (
        new ArrayBuffer(0)
      ),
      payload: /** @type {import("./messages.types").TransactionPayload} */ (
        new ArrayBuffer(0)
      ),
    });
    txid = /** @type {import("./messages.types").TransactionHash} */ (
      sha256(sha256(packedWithNoWitness))
    );
  }

  /** @type {import("./messages.types").TransactionHash} */
  let wtxid;
  const isAllTxInAreNoWitness = txIn.every(
    (tx) => !tx.witness || tx.witness.length === 0
  );

  if (isWitness && !isAllTxInAreNoWitness) {
    if (
      txIn.length === 1 &&
      txIn[0].outpointHash.byteLength === 32 &&
      new Uint8Array(txIn[0].outpointHash).every((byte) => byte === 0) &&
      txIn[0].outpointIndex === 0xffffffff
    ) {
      // Looks like coinbase
      wtxid = /** @type {import("./messages.types").TransactionHash} */ (
        new ArrayBuffer(32)
      );
    } else {
      wtxid = /** @type {import("./messages.types").TransactionHash} */ (
        sha256(sha256(fullTransactionBuf))
      );
    }
  } else {
    wtxid = txid;
  }

  const rest = buf;
  return [
    {
      ...txNoHashes,
      txid,
      wtxid,
      // We might want to clone buffer here to prevent memory leak.
      // If we read big block and keep reference to one tx then
      // subarray of the buffer will still point into block raw data
      payload: fullTransactionBuf,
    },
    rest,
  ];
}
