import { describe, eq } from "../tests.mjs";
import { bufToHex, parseHexToBuf } from "../utils/arraybuffer-hex.mjs";
import { joinBuffers } from "../utils/joinBuffers.mjs";
import { stringToUTF8Array } from "../utils/stringToUtf8Array.mjs";
import { sha256 } from "./sha256.mjs";

/**
 * @param {string} tag
 * @param {ArrayBuffer} data
 */
export function taggedTash(tag, data) {
  const tagBuf = stringToUTF8Array(tag);
  const tagHash = sha256(new Uint8Array(tagBuf));
  const dataToHash = joinBuffers(
    new Uint8Array(tagHash),
    new Uint8Array(tagHash),
    new Uint8Array(data)
  );
  return sha256(dataToHash);
}

describe("taggedHash", () => {
  eq(
    bufToHex(
      taggedTash(
        "TapSighash",
        parseHexToBuf(
          "0081020000000065cd1da2e6dab7c1f0dcd297c8d61647fd17d821541ea69c3cc37dcbad7f90d4eb4bc500a778eb6a263dc090464cd125c466b5a99667720b1c110468831d058aa1b82af101000000002b0c230000000022512077e30a5522dd9f894c3f8b8bd4c4b2cf82ca7da8a3ea6a239655c39c050ab220ffffffff"
        )
      )
    ),
    "cccb739eca6c13a8a89e6e5cd317ffe55669bbda23f2fd37b0f18755e008edd2"
  );
});
