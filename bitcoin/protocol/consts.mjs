import { parseHexToBuf } from "../utils/array-bigint.mjs";

export const protocolVersion = new Uint8Array([0xf9, 0xbe, 0xb4, 0xd9]).buffer;

export const bitcoinMessageMagic = new Uint8Array([0xf9, 0xbe, 0xb4, 0xd9])
  .buffer;

export const genesisBlockHash =
  /** @type { import("./messages.types").BlockHash} */ (
    parseHexToBuf(
      "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
      true
    )
  );

export const servicesData = /** @type {const} */ ([
  [1, "NODE_NETWORK"],
  [2, "NODE_GETUTXO"],
  [4, "NODE_BLOOM"],
  [8, "NODE_WITNESS"],
  [16, "NODE_XTHIN"],
  [64, "NODE_COMPACT_FILTERS"],
  [1024, "NODE_NETWORK_LIMITED"],
]);
