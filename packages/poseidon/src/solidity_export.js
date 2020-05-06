const Poseidon = require('./poseidon');

const PRAGMA = 'pragma solidity 0.6.4;';

const constant_round_constants = (constants) => {
	return constants.map((value, i) => `uint256 constant C${i} = ${value};`).join('\n');
};

const constant_mds_matrix = (matrix) => {
	return matrix.map((value, i) => `uint256 constant M${i} = ${value};`).join('\n');
};

const range = (n) => {
	return Array(n).fill();
};

const storeM = (t) => {
	return `let pos := mload(0x40)
${range(t * t)
	.map((_, i) => `mstore(add(pos, ${i * 32}), M${i})`)
	.join('\n')}`;
};

const sbox = (n, i, define_t) => {
	const e = n % 2 == 0 ? 's' : 'z';
	return `${define_t ? 'let ' : ''}t := mulmod(${e}${i}, ${e}${i}, q)
${e}${i} := mulmod(mulmod(t, t, q), ${e}${i}, q)`;
};

const mix = (t, n) => {
	const { e, r } = n % 2 == 0 ? { e: 's', r: 'z' } : { e: 'z', r: 's' };
	arc = (mds_result) => {
		return `add(${mds_result}, t)`;
	};
	mul = (i, j) => {
		m = `mload(add(pos,${32 * (i * t + j)}))`;
		return `mulmod(${e}${j}, ${m}, q)`;
	};
	res = [];
	constant = `t := C${n + 1}`;
	res.push(constant);
	for (let i = 0; i < t; i++) {
		muls = range(t).map((_, j) => mul(i, j));
		mixed = muls.slice(1).reduce(function (acc, mul, i) {
			return 'add(' + acc + mul + ')' + (i == muls.length - 2 ? '' : ', ');
		}, muls[0] + ', ');
		res.push(`${n == 0 ? 'let ' : ''}${r}${i} := ` + arc(mixed));
	}

	return res.join('\n');
};

const full_round = (t, n, last_round, first_round) => {
	return `${range(t)
		.map((_, i) => sbox(n, i, first_round && i == 0))
		.join('\n')}
${last_round ? '' : mix(t, n)}
`;
};

const partial_round = (t, n) => {
	return `${sbox(n, 0)}
${mix(t, n)}
`;
};

const inputs = (t) => {
	return `
let s0 := add(mload(input), C0)
${Array(t - 2)
	.fill()
	.map((_, i) => `let s${i + 1} := add(mload(add(input, ${(i + 1) * 32})), C0)`)
	.join('\n')}
let s${t - 1} := C0
`;
};

// IMPORTANT!
// solidity exporter exports invalid code for higher values of t.
const solidityExport = (t, nRoundsF, nRoundsP, personaC, personaM, seed) => {
	if (typeof t === 'undefined') t = 3;
	if (typeof nRoundsF === 'undefined') nRoundsF = 8;
	if (typeof nRoundsP === 'undefined') nRoundsP = 55;
	const { hasher, C, M } = Poseidon.createHasher(t, nRoundsF, nRoundsP, personaC, personaM, seed);
	const nRounds = nRoundsF + nRoundsP;
	return `
${PRAGMA}
contract Poseidon {
uint256 constant Q = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
${constant_round_constants(C)}
${constant_mds_matrix(M)}
function hash(uint256[${t - 1}] memory input) internal pure returns(uint256 result){
assembly{
let q := Q
${storeM(t)}
${inputs(t)}
${range(nRoundsF / 2)
	.map((_, i) => full_round(t, i, false, i == 0))
	.join('')}
${range(nRoundsP)
	.map((_, i) => partial_round(t, i + nRoundsF / 2))
	.join('')}
${range(nRoundsF / 2)
	.map((_, i) => full_round(t, i + nRoundsP + nRoundsF / 2, i == nRoundsF / 2 - 1))
	.join('')}
result := ${nRounds % 2 != 0 ? 's0' : 'z0'}
} } }
// identity
// ${hasher([0, 0]).toString(16)};
`;
};

console.log(solidityExport());
