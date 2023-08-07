export type UtxoStatus = {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
  confirmations?: number;
};
export type Utxo = {
  txid: string;
  vout: number;
  status: UtxoStatus;
  value: number;
};

export type UtxoWithMeta = Utxo & {
  keyIndex: number;
  wallet: string;
};

export type BlockchainInfoUtxo = {
  /** This one is used in blockchain.com explorer */
  tx_hash_big_endian: string;
  tx_hash: string;
  tx_output_n: number;
  script: string;
  value: number;
  value_hex: string;
  confirmations: number;
  tx_index: number;
};
export type BlockchainInfoResult = {
  notice: string;
  unspent_outputs: BlockchainInfoUtxo[];
};
