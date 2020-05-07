const RLN = artifacts.require('RLN');
const Hasher = require('@rln/tree').Hasher;
const { assert } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');
const BN = web3.utils.BN;
const zero = new BN(0);
const one = new BN(1);

const poseidon = Hasher.new({});

const defaultMembershipFee = web3.utils.toBN(web3.utils.toWei('0.1', 'ether'));

function bn(n) {
	return new BN(n);
}

function randAddr() {
	return web3.utils.toChecksumAddress(web3.utils.randomHex(20));
}

contract('Poseidon Hasher', (accounts) => {
	before(async () => {});

	it('deploy', async () => {
		const depth = bn(32);
		const setSize = one.shln(32);
		const rln = await RLN.new(depth, defaultMembershipFee);
		assert.isTrue(zero.eq(await rln.leafIndex()));
		assert.isTrue(defaultMembershipFee.eq(await rln.MEMBERSHIP_FEE()));
		assert.isTrue(depth.eq(await rln.DEPTH()));
		assert.isTrue(setSize.eq(await rln.SET_SIZE()));
	});

	it('register', async () => {
		const rln = await RLN.new(32, defaultMembershipFee);
		const pubkey = poseidon.hash('0x01');
		await rln.register(pubkey, { from: accounts[0], value: defaultMembershipFee });
		assert.isTrue(one.eq(await rln.leafIndex()));
		assert.equal((await rln.members(0)).toString(16), pubkey.slice(2));
	});

	it('register / fail / membership fee', async () => {
		const rln = await RLN.new(32, defaultMembershipFee);
		const pubkey = poseidon.hash('0x01');
		await expectRevert(rln.register(pubkey, { from: accounts[0], value: (await rln.MEMBERSHIP_FEE()).add(one) }), 'membership fee is not satisfied');
		await expectRevert(rln.register(pubkey, { from: accounts[0], value: (await rln.MEMBERSHIP_FEE()).sub(one) }), 'membership fee is not satisfied');
	});

	it('register batch', async () => {
		const rln = await RLN.new(32, defaultMembershipFee);
		const pubkeys = ['0x01', '0x02', '0x03', '0x04'].map((secret) => poseidon.hash(secret));
		const membershipFee = defaultMembershipFee.mul(bn(pubkeys.length));
		await rln.registerBatch(pubkeys, { from: accounts[0], value: membershipFee });
		assert.isTrue(bn(pubkeys.length).eq(await rln.leafIndex()));
		assert.equal(membershipFee.toString(), await web3.eth.getBalance(rln.address));
		for (let i = 0; i < pubkeys.length; i++) {
			assert.equal((await rln.members(i)).toString(16), pubkeys[i].slice(2));
		}
	});

	it('register / fail / full set', async () => {
		const rln = await RLN.new(2, defaultMembershipFee);
		const pubkeys = ['0x01', '0x02', '0x03', '0x04'].map((secret) => poseidon.hash(secret));
		await rln.registerBatch(pubkeys, { from: accounts[0], value: defaultMembershipFee.mul(bn(pubkeys.length)) });
		const pubkey = poseidon.hash('0x05');
		await expectRevert(rln.register(pubkey, { from: accounts[0], value: defaultMembershipFee }), 'set is full');
	});

	it('register batch / fail / full set', async () => {
		const rln = await RLN.new(2, defaultMembershipFee);
		const pubkeys = ['0x01', '0x02', '0x03', '0x04', '0x05'].map((secret) => poseidon.hash(secret));
		await expectRevert(rln.registerBatch(pubkeys, { from: accounts[0], value: defaultMembershipFee.mul(bn(pubkeys.length)) }), 'set is full');
	});

	it('register batch / fail / membership fee', async () => {
		const rln = await RLN.new(32, defaultMembershipFee);
		const pubkeys = ['0x01', '0x02', '0x03', '0x04', '0x05'].map((secret) => poseidon.hash(secret));
		await expectRevert(rln.registerBatch(pubkeys, { from: accounts[0], value: defaultMembershipFee.mul(bn(pubkeys.length)).add(one) }), 'membership fee is not satisfied');
		await expectRevert(rln.registerBatch(pubkeys, { from: accounts[0], value: defaultMembershipFee.mul(bn(pubkeys.length)).sub(one) }), 'membership fee is not satisfied');
	});

	it('withdraw', async () => {
		const rln = await RLN.new(32, defaultMembershipFee);
		const secret = '0x01';
		const pubkey = poseidon.hash(secret);
		await rln.register(pubkey, { from: accounts[0], value: defaultMembershipFee });
		const receiver = randAddr();
		await rln.withdraw(secret, 0, receiver);
		assert.isTrue(await rln.deregisteredLeafs(0));
		assert.equal(defaultMembershipFee.toString(), await web3.eth.getBalance(receiver));
	});

	it('withdraw / fail / twice', async () => {
		const rln = await RLN.new(32, defaultMembershipFee);
		const secret = '0x01';
		const pubkey = poseidon.hash(secret);
		await rln.register(pubkey, { from: accounts[0], value: defaultMembershipFee });
		const receiver = randAddr();
		await rln.withdraw(secret, 0, receiver);
		await expectRevert(rln.withdraw(secret, 0, receiver), 'member is deregistered');
	});

	it('withdraw / fail / invalid size', async () => {
		const rln = await RLN.new(32, defaultMembershipFee);
		const secret = '0x01';
		const pubkey = poseidon.hash(secret);
		await rln.register(pubkey, { from: accounts[0], value: defaultMembershipFee });
		const leaf = one.shln(32).add(one);
		await expectRevert(rln.withdraw(secret, leaf, randAddr()), 'invalid leaf index');
	});

	it('withdraw / fail / empty address', async () => {
		const rln = await RLN.new(32, defaultMembershipFee);
		const secret = '0x01';
		const pubkey = poseidon.hash(secret);
		await rln.register(pubkey, { from: accounts[0], value: defaultMembershipFee });
		const receiver = '0x0000000000000000000000000000000000000000';
		await expectRevert(rln.withdraw(secret, 0, receiver), 'empty address');
	});

	it('withdraw / fail / bad preimage', async () => {
		const rln = await RLN.new(32, defaultMembershipFee);
		const secret1 = '0x01';
		const secret2 = '0x02';
		const pubkey = poseidon.hash(secret1);
		await rln.register(pubkey, { from: accounts[0], value: defaultMembershipFee });
		await expectRevert(rln.withdraw(secret2, 0, randAddr()), 'bad preimage for leaf index');
		await expectRevert(rln.withdraw(secret1, 1, randAddr()), 'bad preimage for leaf index');
	});

	it('withdraw batch', async () => {
		const rln = await RLN.new(32, defaultMembershipFee);
		const secrets = ['0x01', '0x02', '0x03', '0x04'];
		const pubkeys = secrets.map((secret) => poseidon.hash(secret));
		const membershipFee = defaultMembershipFee.mul(bn(pubkeys.length));
		await rln.registerBatch(pubkeys, { from: accounts[0], value: membershipFee });
		const receiver = randAddr();
		await rln.withdrawBatch([secrets[1], secrets[2]], [1, 2], [receiver, receiver]);
		assert.isTrue(await rln.deregisteredLeafs(1));
		assert.isTrue(await rln.deregisteredLeafs(2));
		const expectedBalance = defaultMembershipFee.mul(bn(2));
		assert.equal(expectedBalance.toString(), await web3.eth.getBalance(receiver));
	});

	it('withdraw batch / fail / array sizes', async () => {
		const rln = await RLN.new(32, defaultMembershipFee);
		const secrets = ['0x01', '0x02', '0x03', '0x04'];
		const pubkeys = secrets.map((secret) => poseidon.hash(secret));
		const membershipFee = defaultMembershipFee.mul(bn(pubkeys.length));
		await rln.registerBatch(pubkeys, { from: accounts[0], value: membershipFee });
		const receiver = randAddr();
		await expectRevert(rln.withdrawBatch([secrets[1], secrets[2]], [1, 2, 3], [receiver, receiver]), 'bad size 1');
		await expectRevert(rln.withdrawBatch([secrets[1], secrets[2]], [1, 2], [receiver, receiver, receiver]), 'bad size 2');
	});
});
