const PoseidonTestContract = artifacts.require('TestPoseidon');

contract('Poseidon Hasher', () => {
	let poseidon;
	before(async () => {
		poseidon = await PoseidonTestContract.new();
	});

	it('Expected result', async () => {
		const expected = '2ff267fd23782a5625e6d804f0a7fa700b8dc6084e2e7a5aff7cd4b1c506d30b';
		const result = await poseidon.test([0, 0]);
		assert.equal(result.toString(16), expected);
	});

	it('Gas cost', async () => {
		const gasCost = await poseidon.poseidonGasCost.call();
		console.log('poseidon hash gas costs:', gasCost.toNumber());
	});
});
