import { modulo_power_point } from "./bitcoin/my-elliptic-curves/curves.mjs";
import { Secp256k1 } from "./bitcoin/my-elliptic-curves/curves.named.mjs";
import { arrayToBigint } from "./bitcoin/utils/array-bigint.mjs";

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

  /**
   * @returns {Promise<import("./wallet.defs.mjs").Utxo[]>}
   */
  async getUtxo() {
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
    // asd
    return "3hereiswalletaddress";
  }
}
