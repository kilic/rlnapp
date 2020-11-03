import { Hasher } from './hasher';
const poseidon = require('@rln/poseidon').poseidon;

export interface PoseidonConstructor {
	t?: number;
	rf?: number;
	rp?: number;
	personC?: Buffer;
	personM?: Buffer;
	seed?: Buffer;
}

export function newPoseidonHasher(constructor: PoseidonConstructor): Hasher {
	const { hasher } = poseidon.createHasher(...Object.values(constructor));
	return Hasher.new(hasher);
}
