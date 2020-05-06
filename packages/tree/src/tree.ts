import { Hasher, Node } from './hasher';

type Level = { [node: number]: Node };
export type Data = string;
export type Success = number;

export class Tree {
	private readonly zeros: Array<Node>;
	private readonly tree: Array<Level> = [];
	private readonly hasher: Hasher;
	private readonly depth: number;
	private readonly setSize: number;

	public static new(depth: number, hasher?: Hasher): Tree {
		return new Tree(depth, hasher || Hasher.new({}));
	}

	constructor(depth: number, hasher: Hasher) {
		this.depth = depth;
		this.setSize = 2 ** this.depth;
		this.tree = [];
		for (let i = 0; i < depth + 1; i++) {
			this.tree.push({});
		}
		this.hasher = hasher;
		this.zeros = this.hasher.zeros(depth);
	}

	get root(): Node {
		return this.tree[0][0] || this.zeros[0];
	}

	public insert(leafIndex: number, data: Data): Success {
		if (leafIndex >= this.setSize) {
			return -1;
		}
		this.updateWithData(leafIndex, data);
		return 0;
	}

	public insertBatch(offset: number, dataBatch: Array<Data>): Success {
		const M = dataBatch.length;
		if (M == 0) return -1;
		if (((M - 1) & M) != 0) return -2;
		if (M > this.setSize) return -3;
		if (offset % M != 0) return -4;
		if (offset >= this.setSize) return -5;

		let depth = 0;
		let m = M;
		for (let i = 1; ; i++) {
			// depth = log2(M)
			m = m >> 1;
			if ((m & 1) == 1) {
				depth = i;
				break;
			}
		}

		// unseccesful if targets non zero node
		if (!this.isZero(this.depth - depth, offset >> (M - 1))) return -6;

		// make dense merkle
		// calculate leafs
		const leafBatch = dataBatch.map((data) => this.hasher.hash(data));
		// update leafs
		for (let i = 0; i < M; i++) {
			this.tree[this.depth][offset + i] = leafBatch[i];
		}
		// ascend dense merkle tree
		m = M;
		let offsetAscending = offset;
		for (let i = 0; i < depth; i++) {
			for (let j = 0; j < 1 << (depth - i); j += 2) {
				let leafIndex = offsetAscending + j;
				const level = this.depth - i;
				const n = this.hashCouple(this.depth - i, leafIndex);
				leafIndex >>= 1;
				this.tree[level - 1][leafIndex] = n;
			}
			offsetAscending >>= 1;
			m -= 1;
		}
		this.ascend(this.depth - depth, offsetAscending);
		return 0;
	}

	private getNode(level: number, index: number): Node {
		return this.tree[level][index] || this.zeros[level];
	}

	private getLeaf(index: number): Node {
		return this.tree[this.depth][index] || this.zeros[this.depth];
	}

	private updateWithData(leafIndex: number, data: Data) {
		this.updateWithLeaf(leafIndex, this.hasher.hash(data));
	}

	private updateWithLeaf(leafIndex: number, leaf: Node) {
		this.tree[this.depth][leafIndex] = leaf;
		this.ascend(this.depth, leafIndex);
	}

	private ascend(from: number, leafIndex: number) {
		for (let level = from; level > 0; level--) {
			const n = this.hashCouple(level, leafIndex);
			leafIndex >>= 1;
			this.tree[level - 1][leafIndex] = n;
		}
	}

	private hashCouple(level: number, leafIndex: number) {
		const X = this.getCouple(level, leafIndex);
		return this.hasher.hash2(X.l, X.r);
	}

	private getCouple(level: number, index: number): { l: Node; r: Node } {
		index = index & ~1;
		return {
			l: this.getNode(level, index),
			r: this.getNode(level, index + 1)
		};
	}

	private isZero(level: number, leafIndex: number): boolean {
		return this.zeros[level] == this.getNode(level, leafIndex);
	}
}
