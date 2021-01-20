import { newPoseidonHasher, Tree } from '../src';
import { wallet, provider, downProvider } from './provider';

import { utils, ethers } from 'ethers';
import { TreeSync } from '../src/sync';
import { PoseidonHasher__factory, RLN, RLN__factory } from '../src/contracts';

const chai = require('chai');
const assert = chai.assert;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const BigNumber = ethers.BigNumber;
const RLN_FACTORY = new RLN__factory(wallet);
const POSEIDON_HASHER_FACTORY = new PoseidonHasher__factory(wallet);
const POSEIDON_PARAMETERS = {}; // use default
const HASHER = newPoseidonHasher(POSEIDON_PARAMETERS);

const membershipDeposit = BigNumber.from(ethers.utils.parseEther('0.01'));

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function randPubkey(): string {
	return utils.hexlify(utils.randomBytes(32));
}

let poseidonHasherAddress;
async function deployPoseidonHasher() {
	let poseidonHasher = await POSEIDON_HASHER_FACTORY.deploy();
	await poseidonHasher.deployTransaction.wait();
	poseidonHasherAddress = poseidonHasher.address;
}

async function deployRLN(depth: number): Promise<RLN> {
	if (!poseidonHasherAddress) {
		await deployPoseidonHasher();
	}
	const rln = await RLN_FACTORY.deploy(membershipDeposit, depth, poseidonHasherAddress);
	await rln.deployTransaction.wait();
	return rln;
}

describe('Tree Sync', function () {
	it('start with set empty', async () => {
		const depth = 32;
		const referenceTree = Tree.new(depth, HASHER);
		const rln = await deployRLN(depth);
		const treesync = await TreeSync.new(HASHER, rln.address, provider);
		// register 0
		const pubkey0 = randPubkey();
		referenceTree.updateSingle(0, pubkey0);
		let tx = await rln.register(pubkey0, { value: membershipDeposit });
		// register 1
		const pubkey1 = randPubkey();
		referenceTree.updateSingle(1, pubkey1);
		tx = await rln.register(pubkey1, { value: membershipDeposit });
		await sleep(1000); // sleep some to treesync gets events
		assert.equal(referenceTree.root, treesync.root);
	}).timeout(3000);
	it('boot from scratch', async () => {
		const depth = 32;
		const referenceTree = Tree.new(depth, HASHER);
		const rln = await deployRLN(depth);
		// register 0
		const pubkey0 = randPubkey();
		referenceTree.updateSingle(0, pubkey0);
		let tx = await rln.register(pubkey0, { value: membershipDeposit });
		await tx.wait();
		// register 1
		const pubkey1 = randPubkey();
		referenceTree.updateSingle(1, pubkey1);
		tx = await rln.register(pubkey1, { value: membershipDeposit });
		await tx.wait();
		await sleep(1000); // sleep some to treesync gets events
		const treesync = await TreeSync.new(HASHER, rln.address, provider);
		assert.equal(referenceTree.root, treesync.root);
		await sleep(1000); // sleep some to treesync gets events
		assert.equal(referenceTree.root, treesync.root);
	}).timeout(3000);
	it('sync after a disconnection', async () => {
		const depth = 32;
		const referenceTree = Tree.new(depth, HASHER);
		const rln = await deployRLN(depth);
		const treesync = await TreeSync.new(HASHER, rln.address, provider);
		// register two pubkeys
		const pubkey0 = randPubkey();
		referenceTree.updateSingle(0, pubkey0);
		await rln.register(pubkey0, { value: membershipDeposit });
		const pubkey1 = randPubkey();
		referenceTree.updateSingle(1, pubkey1);
		await rln.register(pubkey1, { value: membershipDeposit });
		await sleep(1000); // sleep some to treesync gets events
		assert.equal(referenceTree.root, treesync.root);
		// make treesync to be offline
		assert.equal(-1, await treesync.updateProvider(downProvider));
		// register two more pubkeys
		const pubkey2 = randPubkey();
		referenceTree.updateSingle(2, pubkey2);
		let tx = await rln.register(pubkey2, { value: membershipDeposit });
		await tx.wait();
		const pubkey3 = randPubkey();
		referenceTree.updateSingle(3, pubkey3);
		tx = await rln.register(pubkey3, { value: membershipDeposit });
		await tx.wait();
		// make treesync to be online
		assert.equal(0, await treesync.updateProvider(provider));
		assert.equal(referenceTree.root, treesync.root);
	}).timeout(10000);
});
