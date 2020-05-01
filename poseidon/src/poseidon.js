// Adapted from
// https://github.com/iden3/circomlib/blob/master/src/poseidon.js

const blakejs = require('blakejs');
const Scalar = require('ffjavascript').Scalar;
const ZqField = require('ffjavascript').ZqField;
const assert = require('assert');

GROUP_ORDER = Scalar.fromString(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617',
);
F = new ZqField(GROUP_ORDER);

hasherInit = blakejs.blake2sInit;
hasherUpdate = blakejs.blake2sUpdate;
hasherFinal = blakejs.blake2sFinal;

// genConstants expects Uint8Array for persona and seed as Uint8Array
exports.genConstants = (persona, seed, l) => {
  let source = seed;
  let constants = new Array();
  while (constants.length < l) {
    var ctx = hasherInit(32, null);
    hasherUpdate(ctx, persona);
    hasherUpdate(ctx, source);
    source = hasherFinal(ctx);
    candidate = Scalar.fromString(
      '0x' + Buffer.from(source.slice().reverse()).toString('hex'),
    );
    if (Scalar.lt(candidate, GROUP_ORDER)) {
      constants.push(candidate);
    }
  }
  return constants;
};

// genMatrix expects Uint8Array for persona and seed as Uint8Array
exports.genMatrix = (persona, seed, t) => {
  // gen x and y vectors
  const v = this.genConstants(persona, seed, 2 * t);
  const M = new Array(t);
  for (let i = 0; i < t; i++) {
    for (let j = 0; j < t; j++) {
      M[i * t + j] = F.normalize(F.inv(F.add(v[i], v[t + j])));
    }
  }
  return M;
};

function arc(state, c) {
  for (let j = 0; j < state.length; j++) {
    state[j] = F.add(state[j], c[j]);
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

exports.createHasher = (t, nRoundsF, nRoundsP, personaC, personaM, seed) => {
  assert(nRoundsF % 2 == 0);
  const nRounds = nRoundsF + nRoundsP;
  const C = exports.genConstants(personaC, seed, nRounds * t);
  const M = exports.genMatrix(personaM, seed, t);
  return function (inputs) {
    let state = [];
    assert(inputs.length <= t);
    for (let i = 0; i < inputs.length; i++) state[i] = F.e(inputs[i]);
    for (let i = inputs.length; i < t; i++) state[i] = F.zero;
    for (let i = 0; i < nRounds; i++) {
      arc(state, C.slice(i * t, (i + 1) * t));
      if (i < nRoundsF / 2 || i >= nRoundsF / 2 + nRoundsP) {
        for (let j = 0; j < t; j++) state[j] = sbox(state[j]);
      } else {
        state[0] = sbox(state[0]);
      }
      if (i != nRounds - 1) mul_mds_matrix(state, M);
    }
    return F.normalize(state[0]);
  };
};

const seed = Buffer.from('');
const personC = Buffer.from('drlnhdsc');
const personM = Buffer.from('drlnhdsm');
const hasher = this.createHasher(3, 8, 55, personC, personM, seed);
assert(
  F.eq(
    Scalar.fromString(
      '0x029e7a7ffff6e83f2f30571b824908e9b409fed1bbf19395343672bdd46c5a26',
    ),
    hasher([0]),
  ),
);
