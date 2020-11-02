import { Tree } from '@rln/tree';
import { FR } from '../src/ecc';
import { RLN } from '../src/rln';
import * as ethers from 'ethers';

import * as chai from 'chai';
const assert = chai.assert;

const DEPTH = 4;

function randAddress(): string {
	return ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
}

describe('rln circuit bindings', function () {
	this.timeout(999999);

	let rln: RLN;
	let tree: Tree;
	const memberIndex = 2;
	const memberKey = '0xff';
	before(async () => {
		rln = await RLN.new(DEPTH);
		tree = Tree.new(DEPTH);
		assert.equal(0, tree.insertSingle(memberIndex, memberKey));
	});
	it('generate and verify proof', () => {
		const epoch = 100;
		const signal = 'xxx';
		const target = randAddress();
		const rlnOut = rln.generateRLN(tree, epoch, signal, target, memberKey, memberIndex);
		assert.isTrue(rln.verify(rlnOut.proof, rlnOut.publicInputs));
	});
});
