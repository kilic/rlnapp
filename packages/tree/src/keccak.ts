import { ethers } from 'ethers';
import { Hasher, HF } from './hasher';

export function newKeccakHasher(dataType: string = 'bytes32'): Hasher {
	let hf: HF = (x: string[]): string => {
		if (x.length === 1) {
			return ethers.utils.solidityKeccak256([dataType], [x[0]]);
		} else if (x.length === 2) {
			return ethers.utils.solidityKeccak256([dataType, dataType], [x[0], x[1]]);
		} else {
			throw new Error('not implemented');
		}
	};
	return Hasher.new(hf);
}
