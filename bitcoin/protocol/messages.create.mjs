import { bufToHex, parseHexToBuf } from "../utils/arraybuffer-hex.mjs";
import { joinBuffers } from "../utils/joinBuffers.mjs";

/**
 *
 * @param {number} value
 * @returns
 */
export function packVarInt(value) {
  if (value < 0xfd) {
    const b = new Uint8Array(1);
    b[0] = value;
    return b;
  } else if (value < 0xffff) {
    const b = new Uint8Array(3);
    b[0] = 0xfd;
    new DataView(b.buffer).setUint16(1, value, true);
    return b;
  } else if (value < 0xffffffff) {
    const b = new Uint8Array(5);
    b[0] = 0xfe;
    new DataView(b.buffer).setUint32(1, value, true);
    return b;
  } else {
    const b = new Uint8Array(9);
    b[0] = 0xff;
    new DataView(b.buffer).setBigUint64(1, BigInt(value), true);
    return b;
  }
}
/**
 * @param {import("./types").BitcoinTransactionIn} txin
 */
export function packTxIn(txin) {
  const outpointIndex = new Uint8Array(4);
  new DataView(outpointIndex.buffer).setUint32(0, txin.outpointIndex, true);

  const scriptLen = packVarInt(txin.script.byteLength);
  const sequence = new Uint8Array(4);
  new DataView(sequence.buffer).setUint32(0, txin.sequence, true);

  return joinBuffers(
    new Uint8Array(txin.outpointHash),
    outpointIndex,
    scriptLen,
    new Uint8Array(txin.script),
    sequence
  );
}
/**
 *
 * @param {import("./types").BitcoinTransactionOut} txout
 */
export function packTxOut(txout) {
  const value = new Uint8Array(8);
  new DataView(value.buffer).setBigUint64(0, txout.value, true);
  const pkScriptLen = packVarInt(txout.script.byteLength);
  return joinBuffers(value, pkScriptLen, new Uint8Array(txout.script));
}
/**
 *
 * @param {import("./types").BitcoinTransaction} tx
 */
export function packTx(tx) {
  const version = new Uint8Array(4);
  new DataView(version.buffer).setUint32(0, tx.version, true);

  const witnessFlag = tx.isWitness ? new Uint8Array([0, 1]) : new Uint8Array(0);
  const txInCount = packVarInt(tx.txIn.length);
  const txInList = tx.txIn.map((txIn) => packTxIn(txIn));

  const txOutCount = packVarInt(tx.txOut.length);
  const txOutList = tx.txOut.map((txOut) => packTxOut(txOut));

  const witness = /** @type {Uint8Array[]} */ ([]);
  if (tx.isWitness) {
    for (const txIn of tx.txIn) {
      const count = txIn.witness ? txIn.witness.length : 0;
      witness.push(packVarInt(count));
      if (txIn.witness) {
        for (const witnessItem of txIn.witness) {
          witness.push(packVarInt(witnessItem.byteLength));
          witness.push(new Uint8Array(witnessItem));
        }
      }
    }
  }

  const lockTime = new Uint8Array(4);
  new DataView(lockTime.buffer).setUint32(0, tx.lockTime, true);

  const result = joinBuffers(
    version,
    witnessFlag,
    txInCount,
    ...txInList,
    txOutCount,
    ...txOutList,
    ...witness,
    lockTime
  ).buffer;
  return /** @type {import("./messages.types").TransactionPayload} */ (result);
}

function test() {
  const tx = {
    version: 2,
    txIn: [
      {
        outpointHash: parseHexToBuf(
          "9b 1f f0 2b 6d 2d 72 bb 48 be d7 6e ed 11 10 9d 9d c6 b3 d9 1f 3b af b6 be 35 64 96 7d 3a 56 1d"
            .split(" ")
            .join("")
        ),
        outpointIndex: 1,
        script: new ArrayBuffer(0),
        sequence: 4294967294,
        witness: [
          parseHexToBuf(
            "304402205e0e3b114ca3c888c1f697c8a2d9a447758876a56f0cf0b1ea43a15638e36f2d02202739791dca0c833d61d1255096ef1f648868ff3b4ba2483467b5e8caf2a4de6c01"
          ),
          parseHexToBuf(
            "033af4fdd4e09d642d18e2d7137cce3070c2a3a7387985d5c4f56ee76a617a4e16"
          ),
        ],
      },
    ],
    txOut: [
      {
        value: 4000n,
        script: parseHexToBuf(
          "00 20 ee 6b b8 6b 44 33 93 92 ba e6 31 c8 f6 1d d8 f0 09 24 3c 63 5a da b3 3c 0b 20 92 3a 27 94 bf 22"
            .split(" ")
            .join("")
        ),
      },
      {
        value: 36419n,
        script: parseHexToBuf(
          "00 14 9c fa d0 0d 40 51 30 ea 4e 8a 4d 5d 38 1a 5c 8a 46 42 fa 2e"
            .split(" ")
            .join("")
        ),
      },
    ],
    lockTime: 0,
    isWitness: true,
    txid: new ArrayBuffer(0),
    wtxid: new ArrayBuffer(0),
    payload: new ArrayBuffer(0),
  };

  const packed = bufToHex(packTx(/** @type {any} */ (tx)));
  if (
    packed !==
    "020000000001019b1ff02b6d2d72bb48bed76eed11109d9dc6b3d91f3bafb6be3564967d3a561d0100000000feffffff02a00f000000000000220020ee6bb86b44339392bae631c8f61dd8f009243c635adab33c0b20923a2794bf22438e0000000000001600149cfad00d405130ea4e8a4d5d381a5c8a4642fa2e0247304402205e0e3b114ca3c888c1f697c8a2d9a447758876a56f0cf0b1ea43a15638e36f2d02202739791dca0c833d61d1255096ef1f648868ff3b4ba2483467b5e8caf2a4de6c0121033af4fdd4e09d642d18e2d7137cce3070c2a3a7387985d5c4f56ee76a617a4e1600000000"
  ) {
    throw new Error("Packed incorrectly");
  } else {
    console.info(`Test: packed ok`);
  }
}
