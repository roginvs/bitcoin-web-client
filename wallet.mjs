import { assertNever } from "./assertNever.mjs";
import { Secp256k1 } from "./bitcoin/my-elliptic-curves/curves.named.mjs";
import { sha256 } from "./bitcoin/my-hashes/sha256.mjs";
import { taggedTash } from "./bitcoin/my-hashes/taggedHash.mjs";
import { ECPrivateKeyBigints } from "./bitcoin/myCrypto.mjs";
import { signSchnorr } from "./bitcoin/myCryptoSchnorr.mjs";
import { packTx, packVarInt } from "./bitcoin/protocol/messages.create.mjs";
import { readTx } from "./bitcoin/protocol/messages.parse.mjs";
import { getOpChecksigSignatureValueTapRoot } from "./bitcoin/script/op_checksig_sigvalue_taproot.mjs";
import {
  getOpChecksigSignatureValueWitness,
  p2wpkhProgramForOpChecksig,
} from "./bitcoin/script/op_checksig_sigvalue_witness.mjs";
import { addressToPkScript } from "./bitcoin/utils/address_to_pkscript.mjs";
import { arrayToBigint } from "./bitcoin/utils/arraybuffer-bigint.mjs";
import { bufToHex, parseHexToBuf } from "./bitcoin/utils/arraybuffer-hex.mjs";
import { get_bitcoin_address } from "./bitcoin/utils/bech32/address.mjs";
import { encodeArrayToBase64 } from "./bitcoin/utils/encodeArrayToBase64.mjs";
import { joinBuffers } from "./bitcoin/utils/joinBuffers.mjs";
import { stringToUTF8Array } from "./bitcoin/utils/stringToUtf8Array.mjs";
import { encodePrefixedWif, parsePrefixedWif } from "./bitcoin/utils/wif.mjs";
import { packTxToPSBT } from "./psbt.mjs";

const DUST_LIMIT = 1000;
/**
 * @param {number} value
 */
function isDust(value) {
  return value < DUST_LIMIT;
}

/**
 * @param {string} address
 * @returns {Promise<import("./wallet.defs.js").UtxoFromApi[] | undefined>}
 */
async function getUtxoFromBlockstreamInfo(address) {
  const url = `https://blockstream.info/api/address/${address}/utxo`;
  /** @type {import("./wallet.defs.js").BlockstreamUtxo[] | null}  */
  const apiResult = await fetch(url)
    .then((res) => res.json())
    .catch((e) => {
      console.warn(`Failed to fetch ${url}`);
      console.warn(e);
      return undefined;
    });
  return apiResult?.map((utxo) => ({
    txid: utxo.txid,
    vout: utxo.vout,
    value: utxo.value,
    isConfirmed: utxo.status.confirmed,
    confirmedAt: utxo.status.block_time
      ? new Date(utxo.status.block_time * 1000)
      : undefined,
    confirmations: undefined,
  }));
}

/**
 * @param {string} address
 * @returns {Promise<import("./wallet.defs.js").UtxoFromApi[] | undefined>}
 */
async function getUtxoFromBlockhainInfo(address) {
  const url = `https://blockchain.info/unspent?active=${address}`;
  /** @type {import("./wallet.defs.js").BlockchainInfoResult | null}  */
  const apiResult = await fetch(url)
    .then((res) => res.json())
    .catch((e) => {
      console.warn(`Failed to fetch ${url}`);
      console.warn(e);
      return undefined;
    });
  return apiResult?.unspent_outputs.map((utxo) => ({
    txid: utxo.tx_hash_big_endian,
    vout: utxo.tx_output_n,
    value: utxo.value,
    isConfirmed: !!utxo.confirmations,
    confirmedAt: undefined,
    confirmations: utxo.confirmations || undefined,
  }));
}

export class BitcoinWallet {
  /**
   *
   * @param {(ReturnType<typeof parsePrefixedWif>)[]} privKeys
   */
  constructor(privKeys) {
    this.#privkeys = privKeys.map((key) => ({
      ...key,
      crypto: new ECPrivateKeyBigints(key.key),
    }));
    if (this.#privkeys.length === 0) {
      throw new Error(`No private keys provided!`);
    }
  }
  /** @type {(ReturnType<typeof parsePrefixedWif> & {crypto: import("./bitcoin/ecKey.js").ECPrivateKey})[]} */
  #privkeys;

  /**
   * @returns {Promise<import("./wallet.defs.js").Utxo[]>}
   */
  async getUtxo() {
    const FETCH_ONE_BY_ONE = true;
    if (FETCH_ONE_BY_ONE) {
      /** @type {import("./wallet.defs.js").Utxo[]} */
      const result = [];
      for (const keyIndex of this.#getPrivKeysIndexes()) {
        const address = this.getAddress(keyIndex);

        const utxoApi =
          (await getUtxoFromBlockstreamInfo(address)) ||
          (await getUtxoFromBlockhainInfo(address));
        if (!utxoApi) {
          throw new Error(`All api endpoints failed`);
        }

        utxoApi.forEach((utxo) =>
          result.push({
            ...utxo,
            keyIndex,
            wallet: address,
            isIgnored: !utxo.isConfirmed,
            isDust: isDust(utxo.value),
          })
        );
      }
      return result;
    }

    return (
      await Promise.all(
        this.#getPrivKeysIndexes().map(async (keyIndex) => {
          const address = this.getAddress(keyIndex);
          const utxoApi =
            (await getUtxoFromBlockstreamInfo(address)) ||
            (await getUtxoFromBlockhainInfo(address));
          if (!utxoApi) {
            throw new Error(`All api endpoints failed`);
          }
          return utxoApi.map((utxo) => ({
            ...utxo,
            keyIndex,
            wallet: address,
            isIgnored: !utxo.isConfirmed,
            isDust: isDust(utxo.value),
          }));
        })
      )
    ).flat(1);
  }

  /**
   *
   * @param {import("./wallet.defs.js").Utxo[]} utxos
   * @param {string} dstAddr
   * @param {number} amount
   * @param {number} fee
   */
  createTx(utxos, dstAddr, amount, fee) {
    const possibleUtxos = utxos
      .slice()
      .filter((utxo) => !utxo.isDust)
      .filter((utxo) => !utxo.isIgnored)
      .sort((a, b) => a.value - b.value);

    const totalPossibleValue = possibleUtxos.reduce(
      (acc, cur) => acc + cur.value,
      0
    );
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

    const myPublicKeys = this.#privkeys.map(
      (privKey) => privKey.crypto.compressedPubkey.buffer
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
        sequence: 0xfffffffd,
        script:
          /** @type {import("./bitcoin/protocol/messages.types.js").SignatureScript} */ (
            new ArrayBuffer(0)
          ),
        witness: [],
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

    const spendingPkScripts = spendingUtxos.map((utxo) =>
      addressToPkScript(this.getAddress(utxo.keyIndex))
    );
    const spendingValues = spendingUtxos.map((utxo) => BigInt(utxo.value));

    {
      const psbt = packTxToPSBT(spendingTx, spendingPkScripts, spendingValues);
      console.info("PSBT (to use in lnd):");
      console.info(btoa(String.fromCharCode(...psbt)));
    }

    for (let utxoIndex = 0; utxoIndex < spendingUtxos.length; utxoIndex++) {
      const utxo = spendingUtxos[utxoIndex];

      const key = this.#privkeys[utxo.keyIndex];

      const witness = spendingTx.txIn[utxoIndex].witness;
      if (!witness) {
        throw new Error(`Internal error`);
      }
      if (witness.length !== 0) {
        throw new Error(`Internel error: witness have items`);
      }

      if (key.type === "p2wpkh") {
        const spendingPkScript = spendingPkScripts[utxoIndex];

        const dataToSig = getOpChecksigSignatureValueWitness(
          spendingTx,
          utxoIndex,
          p2wpkhProgramForOpChecksig(spendingPkScript.slice(2)),
          spendingValues[utxoIndex],
          0x01
        );

        const sigDer =
          this.#privkeys[utxo.keyIndex].crypto.signECDSA(dataToSig).der;

        const signatureWithHashType = joinBuffers(
          sigDer,
          new Uint8Array([0x01])
        );

        witness.push(
          /** @type {import("./bitcoin/protocol/messages.types.js").WitnessStackItem}*/ (
            signatureWithHashType.buffer
          )
        );
        witness.push(
          /** @type {import("./bitcoin/protocol/messages.types.js").WitnessStackItem} */ (
            myPublicKeys[utxo.keyIndex]
          )
        );
      } else if (key.type === "p2tr") {
        const message = getOpChecksigSignatureValueTapRoot(
          spendingTx,
          utxoIndex,
          spendingPkScripts,
          spendingValues,
          0x00
        );
        const dataToSig = taggedTash(
          "TapSighash",
          joinBuffers(new Uint8Array([0]), message)
        );
        const signature = signSchnorr(
          new Uint8Array(key.key),
          new Uint8Array(dataToSig)
        );
        witness.push(
          /** @type {import("./bitcoin/protocol/messages.types.js").WitnessStackItem} */ (
            signature.buffer
          )
        );
      } else {
        assertNever(key);
      }
    }

    const packedTx = packTx(spendingTx);

    console.info("Signed transaction:");
    console.info(bufToHex(packedTx));
    console.info(readTx(packedTx)[0]);

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
    // TODO: Fallback to another service if this one fails
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
    const pubKey = this.#privkeys[keyIndex].crypto.compressedPubkey;
    const address = get_bitcoin_address(pubKey, this.#privkeys[keyIndex].type);
    if (!address) {
      throw new Error(`Something wrong with address`);
    }
    return address;
  }

  getAddresses() {
    return this.#getPrivKeysIndexes().map((index) => this.getAddress(index));
  }

  /**
   * @param {number} keyIndex
   */
  exportPrivateKey(keyIndex) {
    return encodePrefixedWif(this.#privkeys[keyIndex], true);
  }

  exportPrivateKeys() {
    return this.#getPrivKeysIndexes().map((index) =>
      this.exportPrivateKey(index)
    );
  }

  #getPrivKeysIndexes() {
    return this.#privkeys.map((_, index) => index);
  }

  /**
   *
   * @param {string} messageText
   * @returns {ArrayBuffer}
   */
  #getSignatureMsgHash(messageText) {
    const MESSAGE_MAGIC = "Bitcoin Signed Message:\n";
    const stringBytes = stringToUTF8Array(messageText);

    const messageTextArray = [
      ...packVarInt(MESSAGE_MAGIC.length),
      ...stringToUTF8Array(MESSAGE_MAGIC),
      ...packVarInt(stringBytes.length),
      ...stringBytes,
    ];
    const dataBuf = Uint8Array.from(messageTextArray).buffer;

    const msgHashBuf = sha256(dataBuf);
    return msgHashBuf;
  }
  /**
   * @param {string} walletAddress
   * @param {string} messageText
   * */
  signMessage(messageText, walletAddress) {
    const msgHash = this.#getSignatureMsgHash(messageText);
    const privKey = this.#privkeys.find(
      (p, index) => this.getAddress(index) === walletAddress
    );
    if (!privKey) {
      throw new Error(`Do not have private key for this address!`);
    }

    const sig = privKey.crypto.signECDSA(msgHash);
    const SEGWIT_BECH32 = 39;
    const sigWithHeader = [
      SEGWIT_BECH32 + sig.raw.recId,
      ...sig.raw.r,
      ...sig.raw.s,
    ];

    return encodeArrayToBase64(sigWithHeader);
  }
}
