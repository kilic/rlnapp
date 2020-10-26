const TestRLNContract = artifacts.require('TestRLN');
const RLNRegistry = artifacts.require('RLNRegistry');
const { assert } = require('chai');
const { verifyingKey } = require('./verifying_key');
const { time, expectRevert } = require('@openzeppelin/test-helpers');

const Q = web3.utils.toBN('21888242871839275222246405745257275088548364400416034343698204186575808495617');

const REWARD_PERIOD = 50;
const CLAIM_PERIOD = 50;
const NUM_OF_BLOCK_FOR_RANDOMNESS = 10;
const MEMBERSHIP_FEE = 1;

const START_TESTING_AT_BLOCK = 300;

contract('RLN', () => {
	let rln;

	before(async () => {
		let blockNumber = await web3.eth.getBlockNumber();
		if (blockNumber < START_TESTING_AT_BLOCK) {
			await time.advanceBlockTo(START_TESTING_AT_BLOCK);
		}
	});

	beforeEach(async () => {
		registry = await RLNRegistry.new(MEMBERSHIP_FEE);
		rln = await TestRLNContract.new(verifyingKey, registry.address, REWARD_PERIOD, CLAIM_PERIOD, NUM_OF_BLOCK_FOR_RANDOMNESS);
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
		let expectedSourceOfRandomness = endOfCurrentRewardEpoch - NUM_OF_BLOCK_FOR_RANDOMNESS;
		let sourceOfRandomness = (await rln._sourceOfRandomness(rewardEpoch)).toNumber();
		await time.advanceBlockTo(endOfCurrentRewardEpoch + 300);
		await expectRevert(rln._randomForEpoch(rewardEpoch), "RLNIncentivized randomForEpoch: loss of randomness, can't start claim period");
	});
});
