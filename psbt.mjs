import {
  packTx,
  packUint64,
  packVarInt,
} from "./bitcoin/protocol/messages.create.mjs";
import { joinBuffers } from "./bitcoin/utils/joinBuffers.mjs";

/**
 * @typedef {{
 *   keyType: number;
 *   keyData?: Uint8Array;
 *   valueData: Uint8Array | Uint8Array[]
 * }} KeyPair
 */

/**
 * @param {KeyPair} keyPair
 */
function packKeyPair(keyPair) {
  const keyType = packVarInt(keyPair.keyType);
  const keyLen = packVarInt(
    keyType.length + (keyPair.keyData ? keyPair.keyData.length : 0)
  );
  /**
   * @type {Uint8Array[]}
   */
  const out = [];
  out.push(keyLen, keyType);
  if (keyPair.keyData) {
    out.push(keyPair.keyData);
  }

  const valueLen = packVarInt(
    Array.isArray(keyPair.valueData)
      ? keyPair.valueData.reduce((acc, cur) => acc + cur.length, 0)
      : keyPair.valueData.length
  );
  out.push(valueLen);
  if (Array.isArray(keyPair.valueData)) {
    for (const valueDataItem of keyPair.valueData) {
      out.push(valueDataItem);
    }
  } else {
    out.push(keyPair.valueData);
  }
  return out;
}

/**
 * @param {KeyPair[]} keyPairs
 */
function packMap(keyPairs) {
  /**
   * @type {Uint8Array[]}
   */
  const out = [];
  for (const keyPair of keyPairs) {
    out.push(...packKeyPair(keyPair));
  }
  out.push(new Uint8Array([0]));
  return out;
}

const PSBT_GLOBAL_UNSIGNED_TX = 0x00;

const PSBT_IN_WITNESS_UTXO = 0x01;

/**
 * @param {import("./bitcoin/protocol/types.js").BitcoinTransaction} tx
 * @param {import("./bitcoin/protocol/messages.types.js").PkScript[]} spendingPkScripts
 * @param {bigint[]} spendingValues
 */
export function packTxToPSBT(tx, spendingPkScripts, spendingValues) {
  if (tx.txIn.length !== spendingPkScripts.length) {
    throw new Error(`Mismatch spendingPkScripts length`);
  }
  if (tx.txIn.length !== spendingValues.length) {
    throw new Error(`Mismatch spendingValues length`);
  }

  const packedTx = packTx({
    ...tx,
    txIn: tx.txIn.map((txIn) => ({
      ...txIn,
      script:
        /** @type {import("./bitcoin/protocol/messages.types.js").SignatureScript} */ (
          new ArrayBuffer(0)
        ),
      witness: undefined,
    })),
    isWitness: false,
  });

  const globalMap = packMap([
    {
      keyType: PSBT_GLOBAL_UNSIGNED_TX,
      valueData: new Uint8Array(packedTx),
    },
  ]);

  const inputMaps = tx.txIn
    .map((txIn, index) =>
      packMap([
        {
          keyType: PSBT_IN_WITNESS_UTXO,
          valueData: [
            new Uint8Array(packUint64(spendingValues[index])),
            packVarInt(spendingPkScripts.length),
            new Uint8Array(spendingPkScripts[index]),
          ],
        },
      ])
    )
    .reduce((acc, cur) => [...acc, ...cur], []);
  const outputMaps = tx.txOut
    .map((txOut) => packMap([]))
    .reduce((acc, cur) => [...acc, ...cur], []);

  const magic = new Uint8Array([0x70, 0x73, 0x62, 0x74, 0xff]);

  const out = joinBuffers(magic, ...globalMap, ...inputMaps, ...outputMaps);

  return out;
}
