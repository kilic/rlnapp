import * as chai from 'chai';
import { ethers } from 'ethers';
import { Tree, Data, newKeccakHasher } from '../src';
import { LightSyncFS } from '../src/light-sync';
import { newPoseidonHasher } from '../src/poseidon';
const assert = chai.assert;

function randLeaf(): Data {
	return ethers.utils.hexlify(ethers.utils.randomBytes(32));
}

function randLeafs(size: number): Array<Data> {
	return Array<Data>(size)
		.fill('0')
		.map(() => randLeaf());
}

describe('Ligth merkle tree sync', function () {
	const hasher = newKeccakHasher();
	const depth = 3;
	const setSize = 1 << depth;
	it('state index < member index', () => {
		for (let n = 0; n < setSize; n++) {
			const stateIndex = n;
			// member index starts from state index,
			// in the first case our member will be inserted first
			for (let i = n; i < setSize; i++) {
				// we will try to bootstrap from some offset that number is smaller than member index
				const memberIndex = i;
				// initialize reference tree
				const referenceTree = Tree.new(depth, hasher);
				// make up some leafs
				const leafs = randLeafs(setSize);
				// fill upto the state index
				for (let j = 0; j < stateIndex; j++) {
					referenceTree.updateSingle(j, leafs[j]);
				}
				// well, we have to find the hint in order to bootstap correctly
				// the hint string is the filled subtrees
				const filledSubtrees = referenceTree.getFilledSubtrees(stateIndex);
				// initialize the syncronizer without an auth path
				const sync = LightSyncFS.new(hasher, depth, stateIndex, filledSubtrees, leafs[memberIndex], memberIndex);
				for (let j = stateIndex; j < setSize; j++) {
					// reference tree is one step ahead
					referenceTree.updateSingle(j, leafs[j]);
					// update sycnronizer with new leaf
					sync.incrementalUpdate(leafs[j]);
					// expect that roots are met
					assert.equal(referenceTree.root, sync.root);

					// update all leafs indexed below state index
					const newLeafs = randLeafs(j);
					for (let k = 0; k < j; k++) {
						const newLeaf = newLeafs[k];
						referenceTree.updateSingle(k, newLeaf);
						const witness = referenceTree.witness(k).nodes;
						sync.updateWithWitness(k, newLeaf, witness);
						assert.equal(referenceTree.root, sync.root);
					}

					if (sync.inSync) {
						// if state index goes beyond member index
						// generate proof with light syncronization tool
						// and verify the witness against the reference tree
						const witness = sync.witness();
						assert.isTrue(referenceTree.checkInclusion(witness));
					}
				}
			}
		}
	});

	it('state index >= member index', () => {
		for (let n = 0; n < setSize; n++) {
			const stateIndex = n;
			for (let i = 0; i < stateIndex; i++) {
				// we will try to bootstrap from some offset that number is smaller than member index
				const memberIndex = i;
				// initialize reference tree
				const referenceTree = Tree.new(depth, hasher);
				// make up some leafs
				const leafs = randLeafs(setSize);
				// fill upto the state index
				for (let j = 0; j < stateIndex; j++) {
					referenceTree.updateSingle(j, leafs[j]);
				}
				// well, we have to find the hint in order to bootstap correctly
				// the hint string is the filled subtrees
				const filledSubtrees = referenceTree.getFilledSubtrees(stateIndex);
				// auth path can be given empty if state index < member index
				const authPath = referenceTree.witness(memberIndex).nodes;
				// initialize the syncronizer
				const sync = LightSyncFS.new(hasher, depth, stateIndex, filledSubtrees, leafs[memberIndex], memberIndex, authPath);

				for (let j = stateIndex; j < setSize; j++) {
					// reference tree is one step ahead
					referenceTree.updateSingle(j, leafs[j]);
					// update sycnronizer with new leaf
					sync.incrementalUpdate(leafs[j]);
					// expect that roots are met
					assert.equal(referenceTree.root, sync.root);

					// update all leafs indexed below state index
					const newLeafs = randLeafs(j);
					for (let k = 0; k < j; k++) {
						const newLeaf = newLeafs[k];
						referenceTree.updateSingle(k, newLeaf);
						const witness = referenceTree.witness(k).nodes;
						sync.updateWithWitness(k, newLeaf, witness);
						assert.equal(referenceTree.root, sync.root);
					}

					if (sync.inSync) {
						// if state index goes beyond member index
						// generate proof with light syncronization tool
						// and verify the witness against the reference tree
						const witness = sync.witness();
						assert.isTrue(referenceTree.checkInclusion(witness));
					}
				}
			}
		}
	});
});
