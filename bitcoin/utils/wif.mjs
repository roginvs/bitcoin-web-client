import { double_sha256 } from "../my-hashes/sha256.mjs";
import { describe, eq } from "../tests.mjs";
import { bufToHex, parseHexToBuf } from "./arraybuffer-hex.mjs";
import { base58decode, base58encode } from "./base58.mjs";
import { joinBuffers } from "./joinBuffers.mjs";

/**
 *
 * @param {ReturnType<typeof parsePrefixedWif>} privKey
 * @param {boolean} [isCompressed=true]
 */
export function encodePrefixedWif(privKey, isCompressed = true) {
  // https://en.bitcoin.it/wiki/Wallet_import_format
  const step2 = joinBuffers(
    new Uint8Array([0x80]),
    new Uint8Array(privKey.key),
    new Uint8Array(isCompressed ? [1] : [])
  );
  const hash = double_sha256(step2);
  const step6 = joinBuffers(step2, new Uint8Array(hash.slice(0, 4)));
  return privKey.type + ":" + base58encode(step6);
}

/**
 *
 * @param {string} str
 */
export function parsePrefixedWif(str) {
  const [wif, prefix] = str.split(":").reverse();
  const key = readPrivateKeyFromWif(wif);
  if (prefix === "p2wpkh" || !prefix) {
    return {
      type: /** @type {const} */ ("p2wpkh"),
      key: key,
    };
  } else if (prefix === "p2tr") {
    return {
      type: /** @type {const} */ ("p2tr"),
      key: key,
    };
  } else {
    throw new Error(`Unknown prefix`);
  }
}

describe(`exportPrivateKey`, () => {
  eq(
    encodePrefixedWif(
      {
        key: parseHexToBuf(
          "0C28FCA386C7A227600B2FE50B7CAE11EC86D3BF1FBE471BE89827E19D72AA1D"
        ),
        type: "p2wpkh",
      },
      false
    ),
    "p2wpkh:5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ"
  );

  eq(
    encodePrefixedWif(
      {
        key: parseHexToBuf(
          "0C28FCA386C7A227600B2FE50B7CAE11EC86D3BF1FBE471BE89827E19D72AA1D"
        ),
        type: "p2wpkh",
      },
      true
    ),
    "p2wpkh:KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617"
  );
});

/**
 *
 * @param {string} wif
 */
export function readPrivateKeyFromWif(wif) {
  const step6 = base58decode(wif);
  const step2 = step6.slice(0, step6.byteLength - 4);
  const checksum = step6.slice(step6.byteLength - 4);
  if (bufToHex(checksum) !== bufToHex(double_sha256(step2).slice(0, 4))) {
    throw new Error(`Wrong checksum`);
  }

  const step2view = new Uint8Array(step2);
  if (step2view[0] !== 0x80) {
    throw new Error(`Unknown first byte ${step2view[0]}`);
  }

  if (step2view[step2view.length - 1] !== 0x1) {
    throw new Error(`Unknown last byte ${step2view[step2view.length - 1]}`);
  }
  const privKey = step2.slice(1, step2.byteLength - 1);
  return privKey;
}

describe(`importPrivateKey`, () => {
  eq(
    bufToHex(
      readPrivateKeyFromWif(
        "KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617"
      )
    ).toUpperCase(),
    "0C28FCA386C7A227600B2FE50B7CAE11EC86D3BF1FBE471BE89827E19D72AA1D"
  );
});

describe("parseWifStringWithPrefix", () => {
  {
    const r = parsePrefixedWif(
      "p2wpkh:KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617"
    );
    eq(r.type, "p2wpkh");
    eq(
      bufToHex(r.key).toUpperCase(),
      "0C28FCA386C7A227600B2FE50B7CAE11EC86D3BF1FBE471BE89827E19D72AA1D"
    );
  }
  {
    const r = parsePrefixedWif(
      "KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617"
    );
    eq(r.type, "p2wpkh");
    eq(
      bufToHex(r.key).toUpperCase(),
      "0C28FCA386C7A227600B2FE50B7CAE11EC86D3BF1FBE471BE89827E19D72AA1D"
    );
  }
  {
    const r = parsePrefixedWif(
      "p2tr:KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617"
    );
    eq(r.type, "p2tr");
    eq(
      bufToHex(r.key).toUpperCase(),
      "0C28FCA386C7A227600B2FE50B7CAE11EC86D3BF1FBE471BE89827E19D72AA1D"
    );
  }

  {
    let r;
    try {
      r = parsePrefixedWif(
        "kek:KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617"
      );
    } catch (e) {
      r = "throw";
    }
    eq(r, "throw");
  }
});
