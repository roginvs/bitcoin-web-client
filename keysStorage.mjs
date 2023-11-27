import { describe, eq } from "./bitcoin/tests.mjs";
import { bufToHex, parseHexToBuf } from "./bitcoin/utils/arraybuffer-hex.mjs";
import {
  encodePrefixedWif as encodePrefixedWif,
  parsePrefixedWif,
  readPrivateKeyFromWif,
} from "./bitcoin/utils/wif.mjs";

const LOCAL_STORAGE_PRIVATE_KEY_KEY = "bitcoin_wallet_private_key";

export function loadSavedKeysFromStorage() {
  const privateKeysString = localStorage.getItem(LOCAL_STORAGE_PRIVATE_KEY_KEY);
  if (!privateKeysString) {
    return null;
  }
  if (privateKeysString.startsWith("v2 ")) {
    const items = privateKeysString.split(" ").slice(1);
    return items.map((item) => parsePrefixedWif(item));
  }
  const privKeys = privateKeysString
    .split(" ")
    .map((keyHex) => parseHexToBuf(keyHex));
  return privKeys.map((key) => ({
    type: /** @type {const} */ ("p2wpkh"),
    key: key,
  }));
}

/**
 *
 * @param {ReturnType<typeof parsePrefixedWif>[] | null} keys
 */
export function saveKeysToStorage(keys) {
  if (keys === null) {
    localStorage.removeItem(LOCAL_STORAGE_PRIVATE_KEY_KEY);
    return;
  }

  localStorage.setItem(
    LOCAL_STORAGE_PRIVATE_KEY_KEY,
    keys.map((key) => encodePrefixedWif(key)).join(" ")
  );
}
