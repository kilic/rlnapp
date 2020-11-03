import { ethers } from 'ethers';

const poseidon = require('@rln/poseidon').poseidon;

export type Node = string;

const ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000';

export type HF = (input: string[]) => any;

export class Hasher {
	private hf: HF;
	public readonly identity: string;

	public static new(hf: HF): Hasher {
		return new Hasher(hf);
	}

	constructor(hf: HF) {
		this.hf = hf;
		this.identity = this.hf([ZERO]);
	}

	public toLeaf(data: string): string {
		return this.hash(data);
	}

	public hash(x0: string) {
		return this.hf([x0]);
	}

	public hash2(x0: string, x1: string) {
		return this.hf([x0, x1]);
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
