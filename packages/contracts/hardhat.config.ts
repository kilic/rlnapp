import "@nomiclabs/hardhat-ethers";

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1004,
      throwOnCallFailures: false,
      throwOnTransactionFailures: false,
    },
  },
  solidity: {
    version: "0.7.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
