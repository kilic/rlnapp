import { Wallet } from 'ethers';
import { JsonRpcProvider } from 'ethers/providers';

const URL = 'http://127.0.0.1:8545';
const MNEMONIC = 'myth like bonus scare over problem client lizard pioneer submit female collect';

export const provider = new JsonRpcProvider(URL);
provider.pollingInterval = 250;
export const wallet = Wallet.fromMnemonic(MNEMONIC).connect(provider);
