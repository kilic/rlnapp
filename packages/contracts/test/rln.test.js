const TestRLNContract = artifacts.require('TestRLN');
const RLNRegistry = artifacts.require('RLNRegistry');
const { assert } = require('chai');
const { RLN, RLNUtils } = require('@rln/rln');

const { time, expectRevert, constants } = require('@openzeppelin/test-helpers');
const { newPoseidonHasher, newKeccakHasher } = require('@rln/tree');

const Q = web3.utils.toBN('21888242871839275222246405745257275088548364400416034343698204186575808495617');

const REWARD_PERIOD = 50;
const CLAIM_PERIOD = 50;
const NUM_OF_BLOCK_FOR_RANDOMNESS = 10;
const MEMBERSHIP_FEE = 1;

const START_TESTING_AT_BLOCK = 300;

const dummyVK = [[1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], []];
const zeroAddress = constants.ZERO_ADDRESS;
const poseidonHasher = newPoseidonHasher({});
const keccakHasher = newKeccakHasher('uint256');

async function moveAwayFromGenesis() {
	let blockNumber = await web3.eth.getBlockNumber();
	if (blockNumber < START_TESTING_AT_BLOCK) {
		await time.advanceBlockTo(START_TESTING_AT_BLOCK);
	}
}

contract('RLN Utils', () => {
	let rln;
	before(async () => {
		await moveAwayFromGenesis();
		rln = await TestRLNContract.new(dummyVK, zeroAddress, REWARD_PERIOD, CLAIM_PERIOD, NUM_OF_BLOCK_FOR_RANDOMNESS);
	});

	it('get reward epoch', async () => {
		let blockNumber = await web3.eth.getBlockNumber();
		let expectedRewardEpoch = Math.floor(blockNumber / REWARD_PERIOD) + 1;
		let rewardEpoch = (await rln._rewardEpoch()).toNumber();
		assert.equal(rewardEpoch, expectedRewardEpoch);
	});
	it('get randomness', async () => {
		let rewardEpoch = (await rln._rewardEpoch()).toNumber();
		let endOfCurrentRewardEpoch = rewardEpoch * REWARD_PERIOD;
		let expectedSourceOfRandomness = endOfCurrentRewardEpoch - NUM_OF_BLOCK_FOR_RANDOMNESS;
		let sourceOfRandomness = (await rln._sourceOfRandomness(rewardEpoch)).toNumber();
		await time.advanceBlockTo(endOfCurrentRewardEpoch);
		currentBlockNumber = await web3.eth.getBlockNumber();
		let blockHashes = [];
		for (let i = 0; i < NUM_OF_BLOCK_FOR_RANDOMNESS; i++) {
			const blockHash = (await web3.eth.getBlock(sourceOfRandomness + i)).hash;
			blockHashes.push(blockHash);
		}
		const expectedRandomNumber = web3.utils.toBN(web3.utils.soliditySha3(...blockHashes)).mod(Q);
		const randomNumber = await rln._randomForEpoch(rewardEpoch);
		assert.equal(web3.utils.toHex(expectedRandomNumber), web3.utils.toHex(randomNumber));
	});
	it('get randomness | fail for being late', async () => {
		let rewardEpoch = (await rln._rewardEpoch()).toNumber();
		let endOfCurrentRewardEpoch = rewardEpoch * REWARD_PERIOD;
		await time.advanceBlockTo(endOfCurrentRewardEpoch + 300);
		await expectRevert(rln._randomForEpoch(rewardEpoch), "RLNIncentivized randomForEpoch: loss of randomness, can't start claim period");
	});
});

contract('RLN', (accounts) => {
	let rlnContract;
	let rln;
	// notice that for now we can only change depth by changing inheritence of rln contract
	const DEPTH = 16;
	const relayer1 = account[1];
	const relayer2 = account[2];

	const account1 = { key: RLNUtils.newKeyPair(), index: 0 };
	const account2 = { key: RLNUtils.newKeyPair(), index: 1 };

	before(async () => {
		await moveAwayFromGenesis();

		rln = await RLN.new(DEPTH);
		tree = Tree.new(DEPTH, poseidonHasher);
		const rawVK = rln.verifyingKey();
		const vk = RLNUtils.rawVerifyingKeyToSol(rawVK);

		// deploy contracts
		registry = await RLNRegistry.new(MEMBERSHIP_FEE);
		rlnContract = await TestRLNContract.new(vk, registry.address, REWARD_PERIOD, CLAIM_PERIOD, NUM_OF_BLOCK_FOR_RANDOMNESS);

		// add some members
		tree.insertSingle(account1.index, account1.key.priv);
		await registry.registerSingle(account1.key.pub);
		tree.insertSingle(account2.index, account2.key.priv);
		await registry.registerSingle(account2.key.pub);
	});

	it('rln cycle', async () => {
		const epoch = 100;

		const signal1 = 'xxx yyy zzz 1000';
		const rlnOut1 = rln.generate(tree, epoch, signal1, relayer1, account1.key.priv, account1.index);

		const signal2 = 'xxx yyy zzz 1001';
		const rlnOut2 = rln.generate(tree, epoch, signal1, relayer1, account2.key.priv, account2.index);

		const messageTree = Tree.new(1, keccakHasher);
		messageTree.insertSingle(0, rlnOut1.nullifier);
		messageTree.insertSingle(1, rlnOut2.nullifier);
		const messageRoot = messageTree.root;

		// public generateRLN(tree: Tree, epoch: number, signal: string, target: string, key: string, memberIndex: number): RLNOutput {
	});
});
