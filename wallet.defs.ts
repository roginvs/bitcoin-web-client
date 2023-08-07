export type UtxoStatus = {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
};
export type Utxo = {
  txid: string;
  vout: number;
  status: UtxoStatus;
  value: number;
};

export type UtxoWithKeyIndex = Utxo & {
  keyIndex: number;
};
