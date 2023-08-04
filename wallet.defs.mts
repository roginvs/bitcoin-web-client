export type BlockHash = string & { _nominal: "block hash" };
export type TxId = string & { _nominal: "tx id" };

export type UtxoStatus = {
  confirmed: boolean;
  block_height: number;
  block_hash: BlockHash;
  block_time: number;
};
export type Utxo = {
  txid: TxId;
  vout: number;
  status: UtxoStatus;
  value: number;
};
