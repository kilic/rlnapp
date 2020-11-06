import { Tree } from '@rln/tree';
import { RLN } from '../src/rln';
import * as ethers from 'ethers';

import * as chai from 'chai';
import { newPoseidonHasher } from '@rln/tree';
const assert = chai.assert;

const DEPTH = 4;
const hasher = newPoseidonHasher({});

function randAddress(): string {
	return ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
}

function initRLN(depth) {
	var fs = require('fs');
	var path = require('path');
	const dir = path.join(__dirname, `../../test_parameters/circuit_${depth}.params`);
	const parameters = fs.readFileSync(dir);
	const rln = RLN.restore(depth, parameters);
	return rln;
}

describe('rln circuit bindings', function () {
	this.timeout(999999);

	let rln: RLN;
	let tree: Tree;
	const memberIndex = 2;
	const memberKey = '0xff';
	before(async () => {
		rln = initRLN(4);
		tree = Tree.new(DEPTH, hasher);
		assert.equal(0, tree.insertSingle(memberIndex, memberKey));
	});
	it('generate and verify proof', () => {
		const epoch = 100;
		const signal = 'xxx';
		const target = randAddress();
		const rlnOut = rln.generate(tree, epoch, signal, target, memberKey, memberIndex);
		assert.isTrue(rln.verify(rlnOut.rawProof, rlnOut.rawPublicInputs));
	});
});
