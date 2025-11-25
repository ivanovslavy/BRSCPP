// scripts/update-secondary-price.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("🔧 UPDATE SECONDARY ORACLE PRICE");
  console.log("========================================");
  
  const oracleFile = path.join(__dirname, "..", "deployed", `${network}-oracles.json`);
  const oracleInfo = JSON.parse(fs.readFileSync(oracleFile, "utf8"));
  
  const secondaryOracleAddr = oracleInfo.oracles.ETH.secondary;
  console.log("Secondary oracle:", secondaryOracleAddr);
  
  const [signer] = await hre.ethers.getSigners();
  const secondaryOracle = await hre.ethers.getContractAt("MockV3Aggregator", secondaryOracleAddr);
  
  // Chainlink show $2940, make secondary ~$2940 (in 5% borders)
  const newPrice = 294000000000; // $2940 с 8 decimals
  
  console.log("\n🔧 Updating secondary price to: $2940");
  const tx = await secondaryOracle.updateAnswer(newPrice);
  await tx.wait();
  
  console.log("✅ Secondary oracle price updated!");
  
  // Провери
  const roundData = await secondaryOracle.latestRoundData();
  console.log("New price:", Number(roundData.answer) / 1e8, "USD");
  
  console.log("\n========================================");
  console.log("🎉 UPDATED!");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
