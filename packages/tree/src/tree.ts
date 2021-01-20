import { Hasher, Node } from './hasher';

type Level = { [node: number]: Node };
export type Data = string;
export type Success = number;

export type Witness = {
	nodes: Array<Node>;
	leaf: Node;
	index: number;
	depth?: number;
};

const ErrBadAlignment = new Error('bad merge alignment');
const ErrLengthMismatch = new Error('depth witness mismatch');
const ErrIndexExceeds = new Error('index exceeds');
const ErrZeroLength = new Error('zero lenght');

export class Tree {
	public readonly zeros: Array<Node>;
	public readonly depth: number;
	public readonly setSize: number;
	private readonly tree: Array<Level> = [];
	private readonly hasher: Hasher;

	public static new(depth: number, hasher: Hasher): Tree {
		return new Tree(depth, hasher);
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

	public getNode(level: number, index: number): Node {
		return this.tree[level][index] || this.zeros[level];
	}

	public getLeaf(index: number): Node {
		return this.tree[this.depth][index] || this.zeros[this.depth];
	}

	// witnessForBatch given merging subtree offset and depth constructs a witness
	public witnessForBatch(mergeOffsetLower: number, subtreeDepth: number): Witness {
		const mergeSize = 1 << subtreeDepth;
		const mergeOffsetUpper = mergeOffsetLower + mergeSize;
		const pathFollower = mergeOffsetLower >> subtreeDepth;
		if (mergeOffsetLower >> subtreeDepth != (mergeOffsetUpper - 1) >> subtreeDepth) {
			throw ErrBadAlignment;
		}
		return this.witness(pathFollower, this.depth - subtreeDepth);
	}

	// witness given index and depth constructs a witness
	public witness(index: number, depth: number = this.depth): Witness {
		const path = Array<boolean>(depth);
		const nodes = Array<Node>(depth);
		let nodeIndex = index;
		const leaf = this.getNode(depth, nodeIndex);
		for (let i = 0; i < depth; i++) {
			nodeIndex ^= 1;
			nodes[i] = this.getNode(depth - i, nodeIndex);
			path[i] = (nodeIndex & 1) == 1;
			nodeIndex >>= 1;
		}
		return { nodes, leaf, index, depth };
	}

	// checkInclusion verifies the given witness.
	// It performs root calculation rather than just looking up for the leaf or node
	public checkInclusion(witness: Witness): boolean {
		// we check the form of witness data rather than looking up for the leaf

		const depth = witness.depth ? witness.depth : this.depth;

		if (depth == 0) throw ErrZeroLength;
		if (witness.nodes.length != depth) throw ErrLengthMismatch;

		let acc = witness.leaf;
		let path = witness.index;
		for (let i = 0; i < depth; i++) {
			const node = witness.nodes[i];
			if ((path & 1) == 1) {
				acc = this.hasher.hash2(node, acc);
			} else {
				acc = this.hasher.hash2(acc, node);
			}
			path >>= 1;
		}
		return acc == this.root;
	}

	// insertSingle updates tree with a single raw data at given index
	public insertSingle(leafIndex: number, data: Data) {
		if (leafIndex >= this.setSize) {
			throw ErrIndexExceeds;
		}
		this.tree[this.depth][leafIndex] = this.hasher.hash(data);
		this.ascend(leafIndex, 1);
	}

	// updateSingle updates tree with a leaf at given index
	public updateSingle(leafIndex: number, leaf: Node) {
		if (leafIndex >= this.setSize) {
			throw ErrIndexExceeds;
		}
		this.tree[this.depth][leafIndex] = leaf;
		this.ascend(leafIndex, 1);
	}

	// insertBatch given multiple raw data updates tree ascending from an offset
	public insertBatch(offset: number, data: Array<Data>) {
		const len = data.length;
		if (len == 0) throw ErrZeroLength;
		if (len + offset > this.setSize) throw ErrIndexExceeds;
		for (let i = 0; i < len; i++) {
			this.tree[this.depth][offset + i] = this.hasher.hash(data[i]);
		}
		this.ascend(offset, len);
	}

	// updateBatch given multiple sequencial data updates tree ascending from an offset
	public updateBatch(offset: number, data: Array<Node>) {
		const len = data.length;
		if (len == 0) throw ErrZeroLength;
		if (len + offset > this.setSize) ErrIndexExceeds;
		for (let i = 0; i < len; i++) {
			this.tree[this.depth][offset + i] = data[i];
		}
		this.ascend(offset, len);
	}

	private ascend(offset: number, len: number) {
		for (let level = this.depth; level > 0; level--) {
			if (offset & 1) {
				offset -= 1;
				len += 1;
			}
			if (len & 1) {
				len += 1;
			}
			for (let node = offset; node < offset + len; node += 2) {
				this.updateCouple(level, node);
			}
			offset >>= 1;
			len >>= 1;
		}
	}

	private updateCouple(level: number, leafIndex: number) {
		const n = this.hashCouple(level, leafIndex);
		this.tree[level - 1][leafIndex >> 1] = n;
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
