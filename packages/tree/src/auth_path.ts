import { Hasher, Node } from './hasher';

interface Subtree {
	root: string;
	filled: boolean;
}

export class AuthPath {
	public subtrees: Array<Subtree> = [];
	public static new(leaf: string, index: number, currentIndex: number, depth: number, hasher: Hasher, witness: Array<Node>, currentWitness: Array<Node>) {
		return new AuthPath(leaf, index, currentIndex, depth, hasher, witness, currentWitness);
	}

	private constructor(private leaf: string, public index: number, public currentIndex: number, depth: number, private hasher: Hasher, witness: Array<Node>, currentWitness: Array<Node>) {
		if (currentIndex < index) {
			throw new Error('must be an incremental tree');
		}

		const currentSubtreeDepth = this.currentSubtreeDepth;
		const nonFilledSubtreeIndex = currentIndex - (1 << currentSubtreeDepth);

		for (let i = 0; i < depth; i++) {
			let tree: Subtree;
			// filled subtrees
			if (i < currentSubtreeDepth) {
				tree = { root: witness[i], filled: true };
			}
			// current subtree
			else if (i == currentSubtreeDepth) {
				tree = IncrementalTree.new(i, hasher, nonFilledSubtreeIndex, currentWitness);
			}
			// empty subtrees
			else {
				tree = IncrementalTree.new(i, hasher, 0, []);
			}
			this.subtrees.push(tree);
		}
	}

	public get depth(): number {
		return this.subtrees.length;
	}

	public get size(): number {
		return 1 << this.depth;
	}

	public get filled(): boolean {
		return this.currentIndex == this.size;
	}

	public get currentSubtreeDepth(): number {
		return Math.floor(Math.log2(this.currentIndex));
	}

	public update(leaf: string) {
		if (this.filled) {
			throw new Error('tree is full');
		}
		const subtree = this.subtrees[this.currentSubtreeDepth] as IncrementalTree;
		subtree.update(leaf);
		this.currentIndex += 1;
	}

	public authPath(): Array<string> {
		return this.subtrees.map((subtree) => {
			return subtree.root;
		});
	}

	public root(): string {
		let path = this.index;
		let acc = this.leaf;
		for (let i = 0; i < this.depth; i++) {
			if ((path & 1) == 1) {
				acc = this.hasher.hash2(this.subtrees[i].root, acc);
			} else {
				acc = this.hasher.hash2(acc, this.subtrees[i].root);
			}
			path >>= 1;
		}
		return acc;
	}
}

export class IncrementalTree {
	public filledSubtrees: Array<Node> = [];
	public zeros: Array<Node> = [];
	public filled: boolean = false;
	public root: string = '';

	private get size(): number {
		return 2 ** this.depth;
	}

	private get isLeaf(): boolean {
		return this.depth == 0;
	}

	static new(depth: number, hasher: Hasher, index: number, witness: Array<Node>) {
		return new IncrementalTree(depth, hasher, index, witness);
	}

	private constructor(public depth: number, private hasher: Hasher, public index: number, witness: Array<Node>) {
		this.depth = depth;
		if (index >= this.size) {
			throw new Error('index is beyond set size');
		}
		this.zeros = this.hasher.zeros(depth).reverse();
		if (this.depth == 0) {
			this.root = this.zeros[0];
			return;
		}
		this.hasher = hasher;
		if (this.index > 0) {
			if (witness.length != depth) {
				throw new Error('witness length must be equal to the depth');
			}
			witness.map((root) => {
				this.filledSubtrees.push(root);
			});
			this.root = hasher.calculateRootFromWitness(index, witness);
		} else {
			this.zeros.map((root) => {
				this.filledSubtrees.push(root);
			});
			this.root = hasher.hash2(this.zeros[depth - 1], this.zeros[depth - 1]);
		}
	}

	public update(leaf: string): { index: number; root: string } {
		if (this.filled) {
			throw new Error('tree is filled');
		}
		let acc = leaf;
		let path = this.index;
		let subtreeUpdated = false;

		// ascend to the top
		for (let i = 0; i < this.depth; i++) {
			if ((path & 1) == 1) {
				acc = this.hasher.hash2(this.filledSubtrees[i], acc);
			} else {
				if (!subtreeUpdated) {
					this.filledSubtrees[i] = acc;
					subtreeUpdated = true;
				}
				acc = this.hasher.hash2(acc, this.zeros[i]);
			}
			path >>= 1;
		}
		// update tree
		this.root = acc;
		this.index += 1;

		if (this.index == this.size) {
			// incremental tree is full
			// empty node arrays
			this.zeros = [];
			this.filledSubtrees = [];
			this.filled = true;
		}
		return { index: this.index, root: this.root };
	}
}
