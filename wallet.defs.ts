export type BlockstreamUtxoStatus = {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
  confirmations?: number;
};
export type BlockstreamUtxo = {
  txid: string;
  vout: number;
  status: BlockstreamUtxoStatus;
  value: number;
};

export type UtxoFromApi = {
  txid: string;
  vout: number;
  value: number;
  isConfirmed: boolean;
  confirmedAt?: Date;
  confirmations?: number;
};
export type Utxo = UtxoFromApi & {
  keyIndex: number;
  wallet: string;
  isIgnored: boolean;
  isDust: boolean;
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
