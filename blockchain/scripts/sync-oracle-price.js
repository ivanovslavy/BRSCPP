// scripts/sync-oracle-price.js
const hre = require("hardhat");

async function main() {
  const secondaryOracleAddress = process.env.SECONDARY_ORACLE_ADDRESS;
  const chainlinkFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  
  const ChainlinkABI = [
    "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
  ];
  
  const MockABI = [
    "function updateAnswer(int256 _answer) external",
    "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
  ];
  
  // Get Chainlink price
  const chainlink = await hre.ethers.getContractAt(ChainlinkABI, chainlinkFeed);
  const [, chainlinkPrice] = await chainlink.latestRoundData();
  
  // Get current mock price
  const [owner] = await hre.ethers.getSigners();
  const mockOracle = await hre.ethers.getContractAt(MockABI, secondaryOracleAddress, owner);
  const [, currentMockPrice] = await mockOracle.latestRoundData();
  
  // Calculate deviation
  const deviation = Math.abs(Number(chainlinkPrice - currentMockPrice)) / Number(chainlinkPrice);
  
  console.log(new Date().toISOString());
  console.log("Chainlink:", Number(chainlinkPrice) / 1e8, "USD");
  console.log("Mock:", Number(currentMockPrice) / 1e8, "USD");
  console.log("Deviation:", (deviation * 100).toFixed(2), "%");
  
  // Update if deviation > 1%
  if (deviation > 0.01) {
    console.log("Updating mock oracle...");
    const tx = await mockOracle.updateAnswer(chainlinkPrice);
    await tx.wait();
    console.log("✅ Updated! Tx:", tx.hash);
  } else {
    console.log("✅ Price is synced (deviation < 1%)");
  }
}

main().catch(console.error);
