const Scalar = require('ffjavascript').Scalar;
const ZqField = require('ffjavascript').ZqField;
const buildBn128 = require('ffjavascript').buildBn128;

const R = Scalar.fromString('21888242871839275222246405745257275088548364400416034343698204186575808495617');
const P = Scalar.fromString('21888242871839275222246405745257275088696311157297823662689037894645226208583');
export const FR = new ZqField(R);
export const FP = new ZqField(P);
