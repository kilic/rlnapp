// Adapted from
// https://github.com/iden3/circomlib/blob/master/src/poseidon.js

const blakejs = require('blakejs');
const Scalar = require('ffjavascript').Scalar;
const ZqField = require('ffjavascript').ZqField;
const assert = require('assert');

FIELD_ORDER = Scalar.fromString('21888242871839275222246405745257275088548364400416034343698204186575808495617');
F = new ZqField(FIELD_ORDER);
exports.field = F;

hasherInit = blakejs.blake2sInit;
hasherUpdate = blakejs.blake2sUpdate;
hasherFinal = blakejs.blake2sFinal;

// genConstants expects Uint8Array for persona and seed as Uint8Array
function genConstants(persona, seed, l) {
	let source = seed;
	let constants = new Array();
	while (constants.length < l) {
		var ctx = hasherInit(32, null);
		hasherUpdate(ctx, persona);
		hasherUpdate(ctx, source);
		source = hasherFinal(ctx);
		candidate = Scalar.fromString('0x' + Buffer.from(source.slice().reverse()).toString('hex'));
		if (Scalar.lt(candidate, FIELD_ORDER)) {
			constants.push(candidate);
		}
	}
	return constants;
}

// genMatrix expects Uint8Array for persona and seed as Uint8Array
function genMatrix(persona, seed, t) {
	// gen x and y vectors
	const v = genConstants(persona, seed, 2 * t);
	const M = new Array(t);
	for (let i = 0; i < t; i++) {
		for (let j = 0; j < t; j++) {
			M[i * t + j] = F.normalize(F.inv(F.add(v[i], v[t + j])));
		}
	}
	return M;
}

function arc(state, c) {
	for (let j = 0; j < state.length; j++) {
		state[j] = F.add(state[j], c);
	}
}

function sbox(a) {
	return F.mul(a, F.square(F.square(a, a)));
}

function mul_mds_matrix(state, M) {
	const w = state.length;
	const newState = new Array(w);
	for (let i = 0; i < w; i++) {
		newState[i] = F.zero;
		for (let j = 0; j < w; j++) {
			newState[i] = F.add(newState[i], F.mul(M[i * w + j], state[j]));
		}
	}
	for (let i = 0; i < state.length; i++) state[i] = newState[i];
}

function setup(t, nRoundsF, nRoundsP, personaC, personaM, seed) {
	const nRounds = nRoundsF + nRoundsP;
	const C = genConstants(personaC, seed, nRounds);
	const M = genMatrix(personaM, seed, t);
	return { C, M };
}

exports.createHasher = (t, nRoundsF, nRoundsP, personaC, personaM, seed) => {
	if (typeof seed === 'undefined') seed = Buffer.from('');
	if (typeof personaC === 'undefined') personaC = Buffer.from('drlnhdsc');
	if (typeof personaM === 'undefined') personaM = Buffer.from('drlnhdsm');
	if (typeof t === 'undefined') t = 3;
	if (typeof nRoundsF === 'undefined') nRoundsF = 8;
	if (typeof nRoundsP === 'undefined') nRoundsP = 55;
	const { C, M } = setup(t, nRoundsF, nRoundsP, personaC, personaM, seed);
	assert(nRoundsF % 2 == 0);
	const nRounds = nRoundsF + nRoundsP;
	return {
		hasher: function (inputs) {
			let state = [];
			assert(inputs.length <= t);
			for (let i = 0; i < inputs.length; i++) state[i] = F.e(inputs[i]);
			for (let i = inputs.length; i < t; i++) state[i] = F.zero;
			for (let i = 0; i < nRounds; i++) {
				// arc(state, C.slice(i * t, (i + 1) * t));
				arc(state, C[i]);
				if (i < nRoundsF / 2 || i >= nRoundsF / 2 + nRoundsP) {
					for (let j = 0; j < t; j++) state[j] = sbox(state[j]);
				} else {
					state[0] = sbox(state[0]);
				}
				if (i != nRounds - 1) mul_mds_matrix(state, M);
			}
			return F.normalize(state[0]);
		},
		C,
		M
	};
};
