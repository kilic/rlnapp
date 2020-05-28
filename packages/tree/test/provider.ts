import { Wallet } from 'ethers';
import { JsonRpcProvider, Provider } from 'ethers/providers';

const URL = 'http://127.0.0.1:8545';
const downURL = 'http://127.0.0.1:9545';
const MNEMONIC = 'myth like bonus scare over problem client lizard pioneer submit female collect';

export const provider: Provider = new JsonRpcProvider(URL);
export const downProvider: Provider = new JsonRpcProvider(downURL);
(provider as JsonRpcProvider).pollingInterval = 250;
export const wallet = Wallet.fromMnemonic(MNEMONIC).connect(provider);
