require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: process.env.ETHEREUM_RPC_URL || "",
      accounts: process.env.NOTARY_ADMIN_PRIVATE_KEY
        ? [process.env.NOTARY_ADMIN_PRIVATE_KEY]
        : [],
    },
  },
};
