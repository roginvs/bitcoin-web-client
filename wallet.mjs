import { modulo_power_point } from "./bitcoin/my-elliptic-curves/curves.mjs";
import { Secp256k1 } from "./bitcoin/my-elliptic-curves/curves.named.mjs";
import { ripemd160 } from "./bitcoin/my-hashes/ripemd160.mjs";
import { sha256 } from "./bitcoin/my-hashes/sha256.mjs";
import { packTx } from "./bitcoin/protocol/messages.create.mjs";
import {
  arrayToBigint,
  bigintToArray,
} from "./bitcoin/utils/arraybuffer-bigint.mjs";
import { bitcoin_address_P2WPKH_from_public_key } from "./bitcoin/utils/bech32/address.mjs";

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
