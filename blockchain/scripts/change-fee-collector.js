// scripts/change-fee-collector.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  
  console.log("\n🔧 CHANGE FEE COLLECTOR\n");
  
  const deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  
  const [owner] = await hre.ethers.getSigners();
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  
  const currentCollector = await gateway.feeCollector();
  console.log("Current Fee Collector:", currentCollector);
  
  // Вземи от .env файла
  const newCollector = process.env.FEE_COLLECTOR_ADDRESS;
  
  if (!newCollector) {
    console.error("❌ FEE_COLLECTOR_ADDRESS not found in .env");
    process.exit(1);
  }
  
  console.log("New Fee Collector (from .env):", newCollector);
  
  if (currentCollector.toLowerCase() === newCollector.toLowerCase()) {
    console.log("✅ Fee collector is already set to this address. No change needed.");
    return;
  }
  
  console.log("\n🔧 Changing fee collector...");
  
  const tx = await gateway.updateFeeCollector(newCollector);
  await tx.wait();
  
  console.log("✅ Fee collector changed!");
  
  const updatedCollector = await gateway.feeCollector();
  console.log("Verified:", updatedCollector);
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
