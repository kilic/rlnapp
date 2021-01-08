import { providers, Signer, Wallet } from 'ethers';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';

const URL = 'http://127.0.0.1:8545';
const downURL = 'http://127.0.0.1:9545';
// const MNEMONIC = 'myth like bonus scare over problem client lizard pioneer submit female collect';
const MNEMONIC = 'test test test test test test test test test test test junk';
const PATH = "m/44'/60'/0'/0";

export const provider = new JsonRpcProvider(URL);
export const downProvider = new JsonRpcProvider(downURL);
(provider as JsonRpcProvider).pollingInterval = 250;
export const wallet = Wallet.fromMnemonic(MNEMONIC, PATH).connect(provider);
