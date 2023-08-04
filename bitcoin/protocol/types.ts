import { servicesData } from "./consts.mjs";
import {
  BlockHash,
  BlockHeaderPayload,
  MerkleRootHash,
  PkScript,
  SignatureScript,
  TransactionHash,
  TransactionPayload,
  WitnessStackItem,
} from "./messages.types";

export type BitcoinService = (typeof servicesData)[number][1];

export type BitcoinAddr = {
  readonly services: BitcoinService[];
  readonly host: string;
  readonly port: number;
  readonly ipFamily: 4 | 6;
};

export type BitcoinAddrWithTime = {
  readonly time: Date;
} & BitcoinAddr;

export type BitcoinTransactionIn = {
  readonly outpointHash: TransactionHash;
  readonly outpointIndex: number;
  readonly script: SignatureScript;
  readonly sequence: number;
  readonly witness: WitnessStackItem[] | undefined;
};

export type BitcoinTransactionOut = {
  readonly value: bigint;
  readonly script: PkScript;
};

export type BitcoinTransaction = {
  readonly txid: TransactionHash;
  readonly wtxid: TransactionHash;
  readonly payload: TransactionPayload;
  readonly version: number;
  readonly txIn: BitcoinTransactionIn[];
  readonly txOut: BitcoinTransactionOut[];
  readonly lockTime: number;
  readonly isWitness: boolean;
};

export type BitcoinBlock = {
  readonly version: number;
  readonly prevBlock: BlockHash;
  readonly merkleRoot: MerkleRootHash;
  readonly timestamp: Date;
  readonly bits: any;
  readonly nonce: any;
  readonly txCount: number;
  readonly hash: BlockHash;
  readonly transactions: BitcoinTransaction[];
  readonly headerPayload: BlockHeaderPayload;
};
