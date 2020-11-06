const TestRLNContract = artifacts.require('TestRLN');
const RLNRegistry = artifacts.require('RLNRegistry');
const { assert } = require('chai');
const { RLN, RLNUtils } = require('@rln/rln');

const { time, expectRevert, constants, expectEvent } = require('@openzeppelin/test-helpers');
const { newPoseidonHasher, newKeccakHasher, Tree } = require('@rln/tree');

// 2 ** 256
const R = web3.utils.toBN('0x010000000000000000000000000000000000000000000000000000000000000000');
// 2 ** 256 - 1
const Z = web3.utils.toBN('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

const REWARD_PERIOD = 50;
const CLAIM_PERIOD = 50;
const NUM_OF_BLOCK_FOR_RANDOMNESS = 10;
const MEMBERSHIP_FEE = 1;
const CLAIM_STAKE_AMOUNT = 1;
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

const DEPTH = 4;

function initRLN() {
	var fs = require('fs');
	var path = require('path');
	const dir = path.join(__dirname, `../../rln/test_parameters/circuit_${DEPTH}.params`);
	const parameters = fs.readFileSync(dir);
	const rln = RLN.restore(DEPTH, parameters);
	return rln;
}

contract('RLN Utils', () => {
	let rln;
	before(async () => {
		await moveAwayFromGenesis();
		rln = await TestRLNContract.new(dummyVK, zeroAddress, REWARD_PERIOD, CLAIM_PERIOD, NUM_OF_BLOCK_FOR_RANDOMNESS, CLAIM_STAKE_AMOUNT);
	});

	it('calcuating reward epoch', async () => {
		for (let i = 0; i < 2 * REWARD_PERIOD; i++) {
			let blockNumber = await web3.eth.getBlockNumber();
			let expectedRewardEpoch = Math.floor(blockNumber / REWARD_PERIOD) + 1;
			let rewardEpoch = (await rln._rewardEpoch()).toNumber();
			assert.equal(rewardEpoch, expectedRewardEpoch);
			await time.advanceBlockTo(blockNumber + 1);
		}
		for (let i = 0; i < 2; i++) {
			let blockNumber = await web3.eth.getBlockNumber();
			let rewardEpoch0 = Math.floor(blockNumber / REWARD_PERIOD) + 1;
			let rewardEpoch1 = (await rln._rewardEpoch()).toNumber();
			assert.equal(rewardEpoch0, rewardEpoch1);
			const startOfNextRewardEpoch = rewardEpoch0 * REWARD_PERIOD;
			await time.advanceBlockTo(startOfNextRewardEpoch);
			rewardEpoch1 = (await rln._rewardEpoch()).toNumber();
			assert.equal(rewardEpoch0 + 1, rewardEpoch1);
		}
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
		const expectedRandomNumber = web3.utils.toBN(web3.utils.soliditySha3(...blockHashes));
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
	const DEPTH = 4;
	const relayer1 = accounts[1];

	const account1 = { key: RLNUtils.newKeyPair(), index: 0 };
	const account2 = { key: RLNUtils.newKeyPair(), index: 1 };

	before(async () => {
		await moveAwayFromGenesis();

		// rln = await RLN.new(DEPTH);
		rln = initRLN();
		tree = Tree.new(DEPTH, poseidonHasher);
		const rawVK = rln.verifyingKey();
		const vk = RLNUtils.rawVerifyingKeyToSol(rawVK);

		const zeros = tree.zeros.slice(2).reverse();

		registry = await RLNRegistry.new(MEMBERSHIP_FEE, 2, zeros);
		rlnContract = await TestRLNContract.new(vk, registry.address, REWARD_PERIOD, CLAIM_PERIOD, NUM_OF_BLOCK_FOR_RANDOMNESS, CLAIM_STAKE_AMOUNT);

		// add some members
		tree.insertSingle(account1.index, account1.key.priv);
		await registry.registerSingle(account1.key.pub, { value: MEMBERSHIP_FEE });
		tree.insertSingle(account2.index, account2.key.priv);
		await registry.registerSingle(account2.key.pub, { value: MEMBERSHIP_FEE });
	});

	it('rln inventive cycle', async () => {
		for (let r = 0; r < 1; r++) {
			console.log('reward epoch', r);
			let found = false;
			let k = 1;
			while (!found) {
				console.log('rln proof of message trial:', k);
				k += 1;

				// prepare messages
				const messageEpoch = await web3.eth.getBlockNumber();
				const messages = [
					{ signal: `xxx yyy zzz 1 ${k}_${r}`, sender: account1, rln: null },
					{ signal: `xxx yyy zzz 0 ${k}_${r}`, sender: account2, rln: null }
				];
				const numberOfMessages = messages.length;
				for (let i = 0; i < numberOfMessages; i++) {
					const rlnOut = rln.generate(tree, messageEpoch, messages[i].signal, relayer1, messages[i].sender.key.priv, messages[i].sender.index);
					messages[i].rln = rlnOut;
					assert.isTrue(rln.verify(rlnOut.rawProof, rlnOut.rawPublicInputs), 'just in case');
				}

				// make nullifier tree
				const messageTreeDepth = Math.ceil(Math.log2(numberOfMessages));
				const messageTree = Tree.new(messageTreeDepth, keccakHasher);
				for (let i = 0; i < numberOfMessages; i++) {
					// notice: placing the nullifier as the leaf itself not the preimage of the leaf
					messageTree.updateSingle(i, messages[i].rln.nullifier);
				}
				const messageRoot = messageTree.root;

				// commit messages
				await rlnContract.commitProofOfMessage(messageRoot, numberOfMessages, { from: relayer1, value: CLAIM_STAKE_AMOUNT });

				// check reward epoch
				const rewardEpoch = Math.floor(messageEpoch / REWARD_PERIOD) + 1;
				let _rewardEpoch = (await rlnContract._rewardEpoch()).toNumber();
				assert.equal(_rewardEpoch, rewardEpoch);

				// check if we
				const rewardID = await rlnContract._rewardID(relayer1, messageRoot, numberOfMessages, rewardEpoch);
				const rewardStatus = await rlnContract.rewards(rewardID);
				assert.equal(rewardStatus, 1);

				// travel to next reward epoch
				const beginningOfNextRewardEpoch = rewardEpoch * REWARD_PERIOD;
				await time.advanceBlockTo(beginningOfNextRewardEpoch);
				_rewardEpoch = (await rlnContract._rewardEpoch()).toNumber();
				assert.equal(_rewardEpoch, rewardEpoch + 1);

				// get rand number for previous epoch
				const random = await rlnContract._randomForEpoch(rewardEpoch);
				const randomNumber = web3.utils.toBN(random);

				for (let i = 0; i < numberOfMessages; i++) {
					const nullifier = messages[i].rln.nullifier;

					const nullifierNumber = web3.utils.toBN(nullifier);
					let proofOfMessage;
					let difficulty;
					{
						const proofOfMessage0 = nullifierNumber.mul(randomNumber).mod(R);
						const proofOfMessage1 = await rlnContract._proofOfMessage.call(rewardEpoch, nullifier);
						assert.isTrue(proofOfMessage0.eq(proofOfMessage1), `0x${proofOfMessage0.toString(16)}, 0x${proofOfMessage1.toString(16)}`);
						proofOfMessage = proofOfMessage0;

						const numberOfMessagesNumber = web3.utils.toBN(numberOfMessages);
						const difficulty0 = Z.div(numberOfMessagesNumber);
						const difficulty1 = await rlnContract._difficulty(numberOfMessages);
						assert.isTrue(difficulty0.eq(difficulty1), `${difficulty0.toString(16)}, ${difficulty1.toString(16)}s`);
						difficulty = difficulty0;
					}

					if (proofOfMessage.lt(difficulty)) {
						console.log('hits', i);
						found = true;
						const message = messages[i];
						const nullifierIndex = i;
						const nullifierWitness = messageTree.witness(i).nodes;

						const messageHash = web3.utils.soliditySha3(message.signal);

						const shareY = message.rln.y;
						const epoch = message.rln.epoch;
						const membershipRoot = tree.root;

						const signal = {
							messageHash,
							shareY,
							epoch,
							nullifier,
							membershipRoot
						};

						const proof = message.rln.proof;

						const rewardID = await rlnContract._rewardID(relayer1, messageRoot, numberOfMessages, rewardEpoch);
						// early checks
						{
							// claim is submitted
							{
								const rewardStatus = await rlnContract.rewards(rewardID);
								assert.equal(rewardStatus, 1);
							}
							// nullfier witness
							{
								const nullifierInclusion = await rlnContract.checkNullifierInclusion(messageRoot, nullifier, nullifierIndex, nullifierWitness);
								assert.isTrue(nullifierInclusion);
							}
							// proof of message
							{
								const proofOfMessageVerified = await rlnContract._verifyProofOfMessage.call(rewardEpoch, nullifier, numberOfMessages);
								assert.isTrue(proofOfMessageVerified);
							}
							// snark
							{
								const inputs = message.rln.publicInputs;
								const snarkVerified = await rlnContract.verifySnark(inputs, proof);
								assert.isTrue(snarkVerified);
							}
						}

						const receipt = await rlnContract.claimReward(messageRoot, numberOfMessages, nullifierIndex, rewardEpoch, signal, nullifierWitness, proof, { from: relayer1 });
						expectEvent(receipt, 'RewardApplied', {
							rewardID
						});

						break;
					}
				}
			}
		}
	});
});
