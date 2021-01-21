import { Hasher, Node } from './hasher';
import { Witness } from './tree';
const assert = require('assert');

export const ErrorIndexExceedsSetSize = new Error('index exceeds set size');
export const ErrorBadWitnessLength = new Error('bad witness length');
export const ErrorIrrelevantWitness = new Error('irrelevant witness');
export const ErrorNotInSync = new Error('irrelevant witness');
export const ErrorFilledSubtreesLength = new Error('bad filled subtrees length');
export const ErrorAuthPathMissing = new Error('auth path missing');
export const ErrorAuthPathFilledSubtreesMismatch = new Error('auth path filled subtrees mismatch');

function levelDistance(i0: number, i1: number): number {
	if (i0 == i1) {
		return Math.floor(Math.log2(i0 ^ (i0 + 1)));
	}
	return Math.floor(Math.log2(i0 ^ i1));
}

export class LightSyncFS {
	public root: Node = '';
	public zeros: Array<Node> = [];
	public authPath: Array<Node>;

	get inSync(): boolean {
		return this.stateIndex > this.leafIndex;
	}

	static new(hasher: Hasher, depth: number, stateIndex: number, filledSubtrees: Array<Node>, leaf: Node, leafIndex: number, authPath?: Array<Node>) {
		return new LightSyncFS(hasher, depth, stateIndex, filledSubtrees, leaf, leafIndex, authPath);
	}

	public constructor(private hasher: Hasher, public depth: number, public stateIndex: number, public filledSubtrees: Array<Node>, public leaf: Node, public leafIndex: number, _authPath?: Array<Node>) {
		if (this.filledSubtrees.length != this.depth) {
			throw ErrorFilledSubtreesLength;
		}

		this.zeros = this.hasher.zeros(depth).reverse().slice(0, depth);

		{
			// Overwrite non filled subtrees set to set zero
			// probably this is not required and we can just expect a correct filled subtrees
			let path = stateIndex;
			for (let i = 0; i < this.depth; i++) {
				if ((path & 1) != 1) {
					this.filledSubtrees[i] = this.zeros[i];
				}
				path >>= 1;
			}
		}

		{
			// if state index larger than leaf index auth path is expected

			this.authPath = new Array(this.depth).fill('0');

			if (!this.inSync) {
				// state index > leaf index
				// initialize auth path

				if (stateIndex == 0) {
					// fully sparse state

					this.authPath = this.zeros.map((z) => z);
				} else {
					// initialized state

					let pathSelf = leafIndex;
					let pathState = stateIndex - 1;
					for (let i = 0; i < depth; i++) {
						// nodes on the right side are zero
						if ((pathSelf & 1) == 0) {
							this.authPath[i] = this.zeros[i];
							pathState >>= 1;
							pathSelf >>= 1;
							continue;
						}

						pathState >>= 1;
						pathSelf >>= 1;
						// once state path and leaf path meet left subtree roots is the part of the auth path
						if (pathState == pathSelf) {
							this.authPath[i] = this.filledSubtrees[i];
						}
					}
				}
			} else {
				if (!_authPath) throw ErrorAuthPathMissing;
				this.authPath = _authPath.map((z) => z);
				const rootFromLeaf = this.calculateRoot(this.leafIndex, this.leaf, this.authPath);
				const rootFromLatestState = this.calculateRoot(this.stateIndex, this.zeros[0], this.stateWitness());
				if (rootFromLeaf != rootFromLatestState) throw ErrorAuthPathFilledSubtreesMismatch;
			}
		}
	}

	get setSize(): number {
		return 1 << this.depth;
	}

	public witness(): Witness {
		return {
			leaf: this.leaf,
			index: this.leafIndex,
			nodes: this.authPath
		};
	}

	public incrementalUpdate(leaf: Node) {
		if (this.stateIndex >= this.setSize) {
			throw ErrorIndexExceedsSetSize;
		}
		this.updateWithWitness(this.stateIndex, leaf, this.stateWitness());
		this.stateIndex += 1;
	}

	public updateWithWitness(index: number, leaf: Node, witness: Array<Node>) {
		if (index >= this.setSize) {
			throw ErrorIndexExceedsSetSize;
		}
		if (witness.length != this.depth) {
			throw ErrorBadWitnessLength;
		}
		if (index == this.leafIndex && leaf != this.leaf) {
			this.leaf = leaf;
		}
		let filledSubtreeDepth = levelDistance(this.stateIndex, index);
		let pathWitness = index;
		let pathSelf = this.leafIndex;
		let accWitness = leaf;
		let accSelf = this.leaf;
		let merged = pathWitness == pathSelf;
		for (let i = 0; i < this.depth; i++) {
			// update auth path
			if (pathWitness >> 1 == pathSelf >> 1) {
				if (!merged) {
					if (accSelf != witness[i] && this.inSync) {
						throw ErrorIrrelevantWitness;
					}
					merged = true;
					this.authPath[i] = accWitness;
				} else {
					if (this.authPath[i] != witness[i] && this.inSync) {
						throw ErrorIrrelevantWitness;
					}
				}
			}

			// update filled subtrees
			if (i == filledSubtreeDepth) {
				this.filledSubtrees[i] = accWitness;
			}

			// calculate root
			if ((pathWitness & 1) == 1) {
				accWitness = this.hasher.hash2(witness[i], accWitness);
			} else {
				accWitness = this.hasher.hash2(accWitness, witness[i]);
			}
			if (!merged && this.inSync) {
				if ((pathSelf & 1) == 1) {
					accSelf = this.hasher.hash2(this.authPath[i], accSelf);
				} else {
					accSelf = this.hasher.hash2(accSelf, this.authPath[i]);
				}
			}

			pathWitness >>= 1;
			pathSelf >>= 1;
		}
		this.root = accWitness;
	}

	private stateWitness(): Array<Node> {
		let path = this.stateIndex;
		let witness: Array<Node> = [];
		for (let i = 0; i < this.depth; i++) {
			if ((path & 1) == 1) {
				witness.push(this.filledSubtrees[i]);
			} else {
				witness.push(this.zeros[i]);
			}
			path >>= 1;
		}
		return witness;
	}

	private calculateRoot(index: number, leaf: Node, witness: Array<Node>): Node {
		if (index >= this.setSize) {
			throw ErrorIndexExceedsSetSize;
		}
		if (witness.length != this.depth) {
			throw ErrorBadWitnessLength;
		}
		let path = index;
		let acc = leaf;
		for (let i = 0; i < this.depth; i++) {
			if ((path & 1) == 1) {
				acc = this.hasher.hash2(witness[i], acc);
			} else {
				acc = this.hasher.hash2(acc, witness[i]);
			}
			path >>= 1;
		}
		return acc;
	}
}
