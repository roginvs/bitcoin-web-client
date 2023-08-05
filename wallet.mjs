import { modulo_power_point } from "./bitcoin/my-elliptic-curves/curves.mjs";
import { Secp256k1 } from "./bitcoin/my-elliptic-curves/curves.named.mjs";
import { ripemd160 } from "./bitcoin/my-hashes/ripemd160.mjs";
import { sha256 } from "./bitcoin/my-hashes/sha256.mjs";
import { packTx } from "./bitcoin/protocol/messages.create.mjs";
import { addressToPkScript } from "./bitcoin/utils/address_to_pkscript.mjs";
import {
  arrayToBigint,
  bigintToArray,
} from "./bitcoin/utils/arraybuffer-bigint.mjs";
import { parseHexToBuf } from "./bitcoin/utils/arraybuffer-hex.mjs";
import { bitcoin_address_P2WPKH_from_public_key } from "./bitcoin/utils/bech32/address.mjs";

const DUST_LIMIT = 1000;
/**
 *
 * @param {import("./wallet.defs.js").Utxo} utxo
 */
export function isDust(utxo) {
  return utxo.value < DUST_LIMIT;
}

export class BitcoinWallet {
  /**
   *
   * @param {Uint8Array | bigint} privKey
   */
  constructor(privKey) {
    this.#privkey =
      typeof privKey === "bigint" ? privKey : arrayToBigint(privKey);
  }
  /** @type {bigint} */
  #privkey;

  #getPublicPoint() {
    const publicKeyPoint = modulo_power_point(
      Secp256k1.G,
      this.#privkey,
      Secp256k1.a,
      Secp256k1.p
    );
    if (!publicKeyPoint) {
      throw new Error(`Got zero as pub key!`);
    }
    return publicKeyPoint;
  }
  #getCompressedPubkey() {
    const point = this.#getPublicPoint();
    const buf = bigintToArray(point[0]);
    const out = new Uint8Array(new ArrayBuffer(buf.byteLength + 1));
    out.set(new Uint8Array(buf), 1);
    out[0] = point[1] % 2n == 0n ? 2 : 3;
    return out.buffer;
  }

  /**
   * @returns {Promise<import("./wallet.defs.js").Utxo[]>}
   */
  async getUtxo() {
    const url = `https://blockstream.info/api/address/${this.getAddress()}/utxo`;
    //return await fetch(url).then((res) => res.json());

    await new Promise((r) => setTimeout(r, 100));
    return [
      {
        /** @type {any} */
        txid: "989774a2e572e2d7eb20f011781df3d68c5634c9e50514d809f075fa685773ae",
        vout: 0,
        status: {
          confirmed: true,
          block_height: 799063,
          /** @type {any} */
          block_hash:
            "0000000000000000000267694975538c71524f4c80bdfcbd4c4b9aed7ea2ef74",
          block_time: 1689587071,
        },
        value: 42643,
      },
      {
        /** @type {any} */
        txid: "aaaa74a2e572e2d7eb20f011781df3d68c5634c9e50514d809f075fa685773ae",
        vout: 10,
        status: {
          confirmed: true,
          block_height: 799063,
          /** @type {any} */
          block_hash:
            "0000000000000000000267694975538c71524f4c80bdfcbd4c4b9aed7ea2ef74",
          block_time: 1689587071,
        },
        value: 26433,
      },
    ];
  }

  /**
   *
   * @param {import("./wallet.defs.js").Utxo[]} utxos
   * @param {string} dstAddr
   * @param {number} amount
   * @param {number} fee
   */
  createTx(utxos, dstAddr, amount, fee) {
    const totalValue = utxos.reduce((acc, cur) => acc + cur.value, 0);
    if (totalValue < amount + fee) {
      throw new Error(`Total value is lower than amount and fee!`);
    }
    if (utxos.some((x) => isDust(x))) {
      throw new Error(`I will not spend dust utxo!`);
    }

    const dstPkScript = addressToPkScript(dstAddr);
    const changePkScript = addressToPkScript(this.getAddress());

    const myPublicKey = this.#getCompressedPubkey();

    const changeValue = totalValue - amount - fee;

    /** @type {import("./bitcoin/protocol/types.js").BitcoinTransaction} */
    const tx = {
      version: 2,
      txIn: utxos.map((utxo) => ({
        outpointHash:
          /** @type {import("./bitcoin/protocol/messages.types.js").TransactionHash} */ (
            parseHexToBuf(utxo.txid)
          ),
        outpointIndex: utxo.vout,
        sequence: 0xfffffffe,
        script:
          /** @type {import("./bitcoin/protocol/messages.types.js").SignatureScript} */ (
            new ArrayBuffer(0)
          ),
        witness: [
          // This is signature+hashCodeType. Adding here to estimate size, we will replace it later
          /** @type {import("./bitcoin/protocol/messages.types.js").WitnessStackItem} */ (
            new ArrayBuffer(73)
          ),
          /** @type {import("./bitcoin/protocol/messages.types.js").WitnessStackItem} */ (
            myPublicKey
          ),
        ],
      })),

      txOut: [
        {
          value: BigInt(amount),
          script: dstPkScript,
        },
        ...(changeValue > DUST_LIMIT
          ? [
              {
                value: BigInt(changeValue),
                script: changePkScript,
              },
            ]
          : []),
      ],
      lockTime: 0,
      isWitness: true,
      txid: /** @type {import("./bitcoin/protocol/messages.types.js").TransactionHash} */ (
        new ArrayBuffer(0)
      ),
      wtxid:
        /** @type {import("./bitcoin/protocol/messages.types.js").TransactionHash} */ (
          new ArrayBuffer(0)
        ),
      payload:
        /** @type {import("./bitcoin/protocol/messages.types.js").TransactionPayload} */ (
          new ArrayBuffer(0)
        ),
    };

    console.info(tx);
    return tx;
  }

  /**
   *
   * @param {Uint8Array} txData
   */
  async sendTx(txData) {
    // TODO
  }

  getAddress() {
    const pubKey = this.#getCompressedPubkey();
    const address = bitcoin_address_P2WPKH_from_public_key(pubKey);
    if (!address) {
      throw new Error(`Something wrong with address`);
    }
    return address;
  }
}
