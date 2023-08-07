import { modulo_power_point } from "./bitcoin/my-elliptic-curves/curves.mjs";
import { Secp256k1 } from "./bitcoin/my-elliptic-curves/curves.named.mjs";
import {
  check_signature,
  signature,
} from "./bitcoin/my-elliptic-curves/ecdsa.mjs";
import { ripemd160 } from "./bitcoin/my-hashes/ripemd160.mjs";
import { sha256 } from "./bitcoin/my-hashes/sha256.mjs";
import { packTx } from "./bitcoin/protocol/messages.create.mjs";
import { readTx } from "./bitcoin/protocol/messages.parse.mjs";
import { packAsn1PairOfIntegers } from "./bitcoin/script/asn1.mjs";
import {
  getOpChecksigSignatureValueWitness,
  p2wpkhProgramForOpChecksig,
} from "./bitcoin/script/op_checksig_sigvalue_witness.mjs";
import { addressToPkScript } from "./bitcoin/utils/address_to_pkscript.mjs";
import {
  arrayToBigint,
  bigintToArray,
} from "./bitcoin/utils/arraybuffer-bigint.mjs";
import { bufToHex, parseHexToBuf } from "./bitcoin/utils/arraybuffer-hex.mjs";
import { bitcoin_address_P2WPKH_from_public_key } from "./bitcoin/utils/bech32/address.mjs";
import { joinBuffers } from "./bitcoin/utils/joinBuffers.mjs";
import { exportPrivateKeyWifP2WPKH } from "./bitcoin/utils/wif.mjs";

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
   * @param {(Uint8Array | bigint)[]} privKeys
   */
  constructor(privKeys) {
    this.#privkeys = privKeys.map((privKey) =>
      typeof privKey === "bigint" ? privKey : arrayToBigint(privKey)
    );
  }
  /** @type {bigint[]} */
  #privkeys;

  /**
   * @param {number} keyIndex
   */
  #getPublicPoint(keyIndex) {
    const publicKeyPoint = modulo_power_point(
      Secp256k1.G,
      this.#privkeys[keyIndex],
      Secp256k1.a,
      Secp256k1.p
    );
    if (!publicKeyPoint) {
      throw new Error(`Got zero as pub key!`);
    }
    return publicKeyPoint;
  }

  /**
   * @param {number} keyIndex
   */
  #getCompressedPubkey(keyIndex) {
    const point = this.#getPublicPoint(keyIndex);
    const buf = bigintToArray(point[0]);
    const out = new Uint8Array(new ArrayBuffer(buf.byteLength + 1));
    out.set(new Uint8Array(buf), 1);
    out[0] = point[1] % 2n == 0n ? 2 : 3;
    return out.buffer;
  }

  /**
   * @returns {Promise<import("./wallet.defs.js").UtxoWithKeyIndex[]>}
   */
  async getUtxo() {
    const result =
      /** @type {Promise<import("./wallet.defs.js").UtxoWithKeyIndex[]} */ [];
    for (let keyIndex = 0; keyIndex < this.#privkeys.length; keyIndex++) {
      const url = `https://blockstream.info/api/address/${this.getAddress(
        keyIndex
      )}/utxo`;

      /** @type {import("./wallet.defs.js").Utxo[]}  */
      const utxos = await fetch(url).then((res) => res.json());
      for (const utxo of utxos) {
        result.push({ ...utxo, keyIndex });
      }
    }
    return result;

    // Possible to use this endpoint
    // https://blockchain.info/unspent?active=$address
  }

  /**
   *
   * @param {import("./wallet.defs.js").UtxoWithKeyIndex[]} utxos
   * @param {string} dstAddr
   * @param {number} amount
   * @param {number} fee
   */
  createTx(utxos, dstAddr, amount, fee) {
    const possibleUtxos = utxos
      .slice()
      .filter((utxo) => !isDust(utxo))
      .sort((a, b) => a.value - b.value);

    const totalPossibleValue = possibleUtxos
      .filter((utxo) => !isDust(utxo))
      .reduce((acc, cur) => acc + cur.value, 0);
    if (totalPossibleValue < amount + fee) {
      throw new Error(`Total value is lower than amount and fee!`);
    }
    /** @type {typeof possibleUtxos} */
    const spendingUtxos = [];
    while (
      spendingUtxos.reduce((acc, cur) => acc + cur.value, 0) <
      amount + fee
    ) {
      const utxo = possibleUtxos.pop();
      if (!utxo) {
        throw new Error(`Internal error`);
      }
      spendingUtxos.push(utxo);
    }

    const dstPkScript = addressToPkScript(dstAddr);

    const changePkScript = addressToPkScript(this.getAddress(0));

    const myPublicKeys = this.#privkeys.map((_, index) =>
      this.#getCompressedPubkey(index)
    );

    const changeValue =
      spendingUtxos.reduce((acc, cur) => acc + cur.value, 0) - amount - fee;

    /** @type {import("./bitcoin/protocol/types.js").BitcoinTransaction} */
    const spendingTx = {
      version: 2,
      txIn: spendingUtxos.map((utxo) => ({
        outpointHash:
          /** @type {import("./bitcoin/protocol/messages.types.js").TransactionHash} */ (
            parseHexToBuf(utxo.txid, true)
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
            myPublicKeys[utxo.keyIndex]
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

    for (let i = 0; i < spendingUtxos.length; i++) {
      const utxo = spendingUtxos[i];

      const spendingPkScript = addressToPkScript(
        this.getAddress(utxo.keyIndex)
      );

      const dataToSig = getOpChecksigSignatureValueWitness(
        spendingTx,
        i,
        p2wpkhProgramForOpChecksig(spendingPkScript.slice(2)),
        BigInt(utxo.value),
        0x01
      );

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
        privateKey: this.#privkeys[utxo.keyIndex],
      });

      if (
        !check_signature({
          curve: Secp256k1,
          msgHash: signingInt,
          publicKey: this.#getPublicPoint(utxo.keyIndex),
          r: sig.r,
          s: sig.s,
        })
      ) {
        throw new Error("Something wrong with signatures");
      }

      const s = sig.s > Secp256k1.n / BigInt(2) ? Secp256k1.n - sig.s : sig.s;

      const sigDer = packAsn1PairOfIntegers(
        bigintToArray(sig.r),
        bigintToArray(s)
      );

      const signatureWithHashType = joinBuffers(sigDer, new Uint8Array([0x01]));

      const witness = spendingTx.txIn[i].witness;
      if (!witness) {
        throw new Error(`Internal error`);
      }
      witness[0] =
        /** @type {import("./bitcoin/protocol/messages.types.js").WitnessStackItem}*/ (
          signatureWithHashType.buffer
        );
    }

    const packedTx = packTx(spendingTx);

    console.info(bufToHex(packedTx));
    // console.info(readTx(packedTx)[0]);

    const spendingUtxosSum = spendingUtxos.reduce(
      (acc, cur) => acc + Number(cur.value),
      0
    );

    return /** @type {const} */ ([packedTx, spendingUtxosSum]);
  }

  /**
   *
   * @param {import("./bitcoin/protocol/messages.types.js").TransactionPayload} txData
   */
  async sendTx(txData) {
    const url = `https://blockstream.info/api/tx`;

    const txHex = bufToHex(txData);
    const result = await fetch(url, {
      method: "POST",
      body: txHex,
    }).then((res) => res.text());
    if (!result.match(/^[0-9a-z]{64}$/)) {
      throw new Error(result);
    }
    console.info(result);
  }

  /**
   * @param {number} keyIndex
   */
  getAddress(keyIndex) {
    const pubKey = this.#getCompressedPubkey(keyIndex);
    const address = bitcoin_address_P2WPKH_from_public_key(pubKey);
    if (!address) {
      throw new Error(`Something wrong with address`);
    }
    return address;
  }

  getAddresses() {
    return this.#privkeys.map((_, index) => this.getAddress(index));
  }

  /**
   * @param {number} keyIndex
   */
  exportPrivateKey(keyIndex) {
    return exportPrivateKeyWifP2WPKH(
      bigintToArray(this.#privkeys[keyIndex]),
      true
    );
  }

  exportPrivateKeys() {
    return this.#privkeys.map((_, index) => this.exportPrivateKey(index));
  }
}

export function generateRandomWif() {
  const keyBuf = new Uint8Array(32);
  crypto.getRandomValues(keyBuf);
  const key = arrayToBigint(keyBuf);
  if (key >= Secp256k1.n || key <= BigInt(1)) {
    throw new Error(`Bad luck!`);
  }
  return exportPrivateKeyWifP2WPKH(keyBuf.buffer, true);
}
