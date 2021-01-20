import { Hasher, Node } from './hasher';
import { Witness } from './tree';

export const ErrorIndexExceedsSetSize = new Error('index exceeds set size');
export const ErrorBadWitnessLength = new Error('bad witness length');
export const ErrorIrrelevantWitness = new Error('irrelevant witness');
export const ErrorNotInSync = new Error('irrelevant witness');
export const ErrorFilledSubtreesLength = new Error('bad filled subtrees length');

function levelDistance(i0: number, i1: number): number {
	if (i0 == i1) {
		return Math.floor(Math.log2(i0 ^ (i0 + 1)));
	}
	return Math.floor(Math.log2(i0 ^ i1));
}

// filled subtrees are hint

export class LightSyncFS {
	public root: Node = '';
	public zeros: Array<Node> = [];

	static new(hasher: Hasher, depth: number, currentIndex: number, filledSubtrees: Array<Node>, leaf: Node, leafIndex: number, authPath: Array<Node>) {
		return new LightSyncFS(hasher, depth, currentIndex, filledSubtrees, leaf, leafIndex, authPath);
	}

	public constructor(private hasher: Hasher, public depth: number, public currentIndex: number, public filledSubtrees: Array<Node>, public leaf: Node, public leafIndex: number, public authPath: Array<Node>) {
		this.root = this.calculateRoot(leafIndex, leaf, authPath);
		this.zeros = this.hasher.zeros(depth).reverse().slice(0, depth);
		if (!this.inSync) {
			// Fix the auth path with zeros
			let pathCurrent = currentIndex;
			let pathSelf = leafIndex;
			for (let i = 0; i < depth; i++) {
				if (pathCurrent != pathSelf) {
					this.authPath[i] = this.zeros[i];
				} else {
					break;
				}
				pathCurrent >>= 1;
				pathSelf >>= 1;
			}
		}

		// TODO: run a validation for filled subtrees
		if (this.filledSubtrees.length != this.depth) {
			throw ErrorFilledSubtreesLength;
		}
	}

	get setSize(): number {
		return 1 << this.depth;
	}

	get inSync(): boolean {
		return this.currentIndex > this.leafIndex;
	}

	public witness(): Witness {
		return {
			leaf: this.leaf,
			index: this.leafIndex,
			nodes: this.authPath
		};
	}

	public updateNext(leaf: Node) {
		if (this.currentIndex >= this.setSize) {
			throw ErrorIndexExceedsSetSize;
		}
		let path = this.currentIndex;
		let acc = leaf;
		let subtreeUpdated = false;
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
		this.root = acc;
		this.currentIndex += 1;
	}

	public incrementalUpdate(leaf: Node) {
		if (this.currentIndex >= this.setSize) {
			throw ErrorIndexExceedsSetSize;
		}
		let path = this.currentIndex;
		let witness: Array<Node> = [];
		for (let i = 0; i < this.depth; i++) {
			if ((path & 1) == 1) {
				witness.push(this.filledSubtrees[i]);
			} else {
				witness.push(this.zeros[i]);
			}
			path >>= 1;
		}
		this.updateWithWitness(this.currentIndex, leaf, witness);
		this.currentIndex += 1;
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
		let filledSubtreeDepth = levelDistance(this.currentIndex, index);
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
					console.log('hererrr', i);
					this.authPath[i] = accWitness;
				} else {
					if (this.authPath[i] != witness[i] && this.inSync) {
						console.log('yyy', this.authPath[i], witness[i]);
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
