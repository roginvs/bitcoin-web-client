import { BlockHash, TransactionHash } from "./bitcoin/protocol/messages.types";

export type UtxoStatus = {
  confirmed: boolean;
  block_height: number;
  block_hash: BlockHash;
  block_time: number;
};
export type Utxo = {
  txid: TransactionHash;
  vout: number;
  status: UtxoStatus;
  value: number;
};
