// scripts/verify.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyContract(address, constructorArguments, contractName, retries = 3) {
  console.log(`\n🔍 Verifying ${contractName}...`);
  console.log(`Address: ${address}`);
  
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        console.log(`   Retry ${i}/${retries}...`);
        await sleep(10000); // Wait 10 seconds before retry
      }
      
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: constructorArguments,
      });
      
      console.log(`✅ ${contractName} verified successfully!`);
      return { contract: contractName, address, status: "success" };
      
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`✅ ${contractName} already verified`);
        return { contract: contractName, address, status: "already_verified" };
      }
      
      if (error.message.includes("does not have bytecode")) {
        console.log(`⚠️  ${contractName} - waiting for bytecode to be indexed...`);
        await sleep(15000);
        continue;
      }
      
      if (i === retries - 1) {
        console.log(`❌ ${contractName} verification failed after ${retries} attempts:`, error.message);
        return { contract: contractName, address, status: "failed", error: error.message };
      }
      
      console.log(`⚠️  Attempt ${i + 1} failed, retrying...`);
      await sleep(10000);
    }
  }
  
  return { contract: contractName, address, status: "failed", error: "Max retries exceeded" };
}

async function main() {
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("🔍 VERIFY CONTRACTS ON ETHERSCAN");
  console.log("========================================");
  console.log("Network:", network);
  
  if (network === "localhost" || network === "hardhat") {
    console.log("❌ Cannot verify on localhost/hardhat network");
    process.exit(1);
  }
  
  // Check if ETHERSCAN_API_KEY exists
  if (!process.env.ETHERSCAN_API_KEY) {
    console.error("❌ ETHERSCAN_API_KEY not found in .env file");
    process.exit(1);
  }
  
  // Load deployment info
  const deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  if (!fs.existsSync(deployFile)) {
    console.error("❌ Deployment file not found:", deployFile);
    console.log("Run deployment first: npm run deploy:" + network);
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  console.log("\n📋 Loaded deployment info from:", deployFile);
  console.log("⏳ Waiting 30 seconds for contracts to be indexed by Etherscan...");
  await sleep(30000); // Wait 30 seconds before starting verification
  
  const results = {
    network: network,
    timestamp: new Date().toISOString(),
    results: []
  };
  
  // Verify CryptoPaymentGateway
  if (deploymentInfo.contracts.CryptoPaymentGateway) {
    const result = await verifyContract(
      deploymentInfo.contracts.CryptoPaymentGateway,
      [
        deploymentInfo.config.owner,
        deploymentInfo.config.feeCollector,
        parseInt(deploymentInfo.config.feePercentage)
      ],
      "CryptoPaymentGateway",
      5 // 5 retries
    );
    results.results.push(result);
    await sleep(5000); // Wait 5 seconds between contracts
  }
  
  // Verify Mock USDC
  if (deploymentInfo.contracts.MockUSDC) {
    const result = await verifyContract(
      deploymentInfo.contracts.MockUSDC,
      ["USD Coin", "USDC", 6],
      "MockUSDC",
      5
    );
    results.results.push(result);
    await sleep(5000);
  }
  
  // Verify Mock USDT
  if (deploymentInfo.contracts.MockUSDT) {
    const result = await verifyContract(
      deploymentInfo.contracts.MockUSDT,
      ["Tether USD", "USDT", 6],
      "MockUSDT",
      5
    );
    results.results.push(result);
  }
  
  // Save verification results
  const verifyFile = path.join(__dirname, "..", "deployed", `${network}-verification.json`);
  fs.writeFileSync(verifyFile, JSON.stringify(results, null, 2));
  
  console.log("\n========================================");
  console.log("✅ VERIFICATION COMPLETE!");
  console.log("========================================");
  console.log("Results saved to:", verifyFile);
  
  // Summary
  const successful = results.results.filter(r => r.status === "success" || r.status === "already_verified").length;
  const failed = results.results.filter(r => r.status === "failed").length;
  
  console.log("\n📊 Summary:");
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  // Print Etherscan links
  console.log("\n🔗 Etherscan Links:");
  if (deploymentInfo.contracts.CryptoPaymentGateway) {
    console.log(`Gateway: https://${network === 'mainnet' ? '' : network + '.'}etherscan.io/address/${deploymentInfo.contracts.CryptoPaymentGateway}`);
  }
  if (deploymentInfo.contracts.MockUSDC) {
    console.log(`USDC: https://${network === 'mainnet' ? '' : network + '.'}etherscan.io/address/${deploymentInfo.contracts.MockUSDC}`);
  }
  if (deploymentInfo.contracts.MockUSDT) {
    console.log(`USDT: https://${network === 'mainnet' ? '' : network + '.'}etherscan.io/address/${deploymentInfo.contracts.MockUSDT}`);
  }
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
