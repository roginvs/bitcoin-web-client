import { double_sha256 } from "../my-hashes/sha256.mjs";
import { describe, eq } from "../tests.mjs";
import { parseHexToBuf } from "./arraybuffer-hex.mjs";
import { base58encode } from "./base58.mjs";
import { joinBuffers } from "./joinBuffers.mjs";

/**
 *
 * @param {ArrayBuffer} privKey
 * @param {boolean} [isCompressed=true]
 */
export function exportPrivateKeyWifP2WPKH(privKey, isCompressed = true) {
  // https://en.bitcoin.it/wiki/Wallet_import_format
  const step2 = joinBuffers(
    new Uint8Array([0x80]),
    new Uint8Array(privKey),
    new Uint8Array(isCompressed ? [1] : [])
  );
  const hash = double_sha256(step2);
  const step6 = joinBuffers(step2, new Uint8Array(hash.slice(0, 4)));
  return "p2wpkh:" + base58encode(step6);
}

describe(`exportPrivateKey`, () => {
  eq(
    exportPrivateKeyWifP2WPKH(
      parseHexToBuf(
        "0C28FCA386C7A227600B2FE50B7CAE11EC86D3BF1FBE471BE89827E19D72AA1D"
      ),
      false
    ),
    "p2wpkh:5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ"
  );
});
