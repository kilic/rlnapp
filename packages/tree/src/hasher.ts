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

	public calculateRootFromWitness(index: number, witness: Array<Node>, leaf?: Node) {
		if (!leaf) leaf = ZERO;
		let path = index;
		let depth = witness.length;
		let acc = leaf;
		for (let i = 0; i < depth; i++) {
			if ((path & 1) == 1) {
				acc = this.hash2(witness[i], acc);
			} else {
				acc = this.hash2(acc, witness[i]);
			}
			path >>= 1;
		}
		return acc;
	}

	public calculateRootFromLeaves(depth: number, leafs: Array<Node>) {
		if (1 << depth != leafs.length) {
			throw new Error('leaf length and depth mismatch');
		}
		let buf = Array(leafs.length >> 1).fill(ZERO);

		for (let i = 0; i < depth; i++) {
			const n = depth - i - 1;
			for (let j = 0; j < 1 << n; j++) {
				const k = j << 1;
				buf[j] = this.hash2(buf[k], buf[k + 1]);
			}
		}
		return buf[0];
	}
}
