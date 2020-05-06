const Scalar = require('ffjavascript').Scalar;
const chai = require('chai');
const poseidon = require('../src/poseidon.js');
const assert = chai.assert;

describe('Poseidon Hasher', function () {
	it('Conforms with github.com/kilic/rln circuit', async () => {
		const seed = Buffer.from('');
		const personC = Buffer.from('drlnhdsc');
		const personM = Buffer.from('drlnhdsm');
		const { hasher } = poseidon.createHasher(3, 8, 55, personC, personM, seed);
		const expected = Scalar.fromString('0x2ff267fd23782a5625e6d804f0a7fa700b8dc6084e2e7a5aff7cd4b1c506d30b');
		assert(poseidon.field.eq(expected, hasher([0])));
	});
});
