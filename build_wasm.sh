#!/bin/sh
rm -rf tmp_wasm
git clone https://github.com/kilic/rln tmp_wasm
cd tmp_wasm
wasm-pack build --release --scope=circuit --target=nodejs --out-name=circuit --out-dir=../packages/circuit -- --features wasm