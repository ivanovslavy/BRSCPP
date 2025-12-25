require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const getRpcUrl = (networkName) => {
  const envKey = networkName.toUpperCase() + "_RPC_URL";
  const customRpc = process.env[envKey];
  if (customRpc && customRpc.trim() !== "") {
    return customRpc;
  }
  const fallbacks = {
    sepolia: "https://ethereum-sepolia-rpc.publicnode.com",
    mainnet: "https://eth.llamarpc.com",
    polygon: "https://polygon-rpc.com",
    amoy: "https://rpc-amoy.polygon.technology",
    bsc: "https://binance.llamarpc.com",
    bscTestnet: "https://data-seed-prebsc-1-s1.binance.org:8545/"
  };
  return fallbacks[networkName] || "";
};

const accounts = [
  process.env.PRIVATE_KEY_OWNER,
  process.env.PRIVATE_KEY_CUSTOMER,
  process.env.PRIVATE_KEY_MERCHANT,
  process.env.PRIVATE_KEY_VIP
].filter(Boolean);

console.log("--- Network Config Initialized ---");

module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    sepolia: {
      url: getRpcUrl("sepolia"),
      accounts,
      chainId: 11155111
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts,
      chainId: 97
    },
    amoy: {
      url: getRpcUrl("amoy"),
      accounts,
      chainId: 80002
    }
  },
  
  // ETHERSCAN V2 - ЕДИН КЛЮЧ ЗА ВСИЧКИ
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  
  sourcify: {
    enabled: true
  }
};
