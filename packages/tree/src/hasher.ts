const poseidon = require('@rln/poseidon').poseidon;

export type Node = string;

const ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000';

export interface PoseidonConstructor {
	t?: number;
	rf?: number;
	rp?: number;
	personC?: Buffer;
	personM?: Buffer;
	seed?: Buffer;
}

type HF = (input: string[]) => any;

export class Hasher {
	private hf: HF;
	public readonly identity: string;

	public static new(constructor: PoseidonConstructor): Hasher {
		const { hasher } = poseidon.createHasher(...Object.values(constructor));
		return new Hasher(hasher);
	}

	constructor(hf: HF) {
		this.hf = hf;
		this.identity = this.hf(['0x00']);
	}

	public hash(x0: string) {
		return '0x' + this.hf([x0]).toString(16);
	}

	public hash2(x0: string, x1: string) {
		return '0x' + this.hf([x0, x1]).toString(16);
	}

	public zeros(depth: number): Array<Node> {
		const N = depth + 1;
		const zeros = Array(N).fill(ZERO);
		for (let i = 1; i < N; i++) {
			zeros[N - 1 - i] = this.hash2(zeros[N - i], zeros[N - i]);
		}
		return zeros;
	}
}
