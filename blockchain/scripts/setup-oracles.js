// scripts/setup-oracles.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("🔧 SETUP ORACLES");
  console.log("========================================");
  console.log("Network:", network);
  
  // Load deployment info
  const deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  if (!fs.existsSync(deployFile)) {
    console.error("❌ Deployment file not found:", deployFile);
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  const usdcAddress = deploymentInfo.contracts.MockUSDC;
  const usdtAddress = deploymentInfo.contracts.MockUSDT;
  
  console.log("Gateway:", gatewayAddress);
  console.log("USDC:", usdcAddress);
  console.log("USDT:", usdtAddress);
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(signer.address)), "ETH\n");
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  
  // Deploy Secondary Mock Oracles (с леко различни цени за да видим averaging)
  console.log("📡 Deploying Secondary Mock Oracles...\n");
  const MockV3Aggregator = await hre.ethers.getContractFactory("MockV3Aggregator");
  
  // ETH/USD Secondary = $2010 (primary е $2000 в deployment)
  // Ще използваме реалния Chainlink като primary, а mock като secondary
  const ethUsdSecondary = await MockV3Aggregator.deploy(8, 201000000000); // $2010
  await ethUsdSecondary.waitForDeployment();
  const ethSecondaryAddr = await ethUsdSecondary.getAddress();
  console.log("✅ Secondary ETH/USD deployed:", ethSecondaryAddr, "($2010)");
  
  // USDC/USD Secondary = $0.999 (primary е $1.00)
  const usdcUsdSecondary = await MockV3Aggregator.deploy(8, 99900000); // $0.999
  await usdcUsdSecondary.waitForDeployment();
  const usdcSecondaryAddr = await usdcUsdSecondary.getAddress();
  console.log("✅ Secondary USDC/USD deployed:", usdcSecondaryAddr, "($0.999)");
  
  // USDT/USD Secondary = $1.001 (primary е $1.00)
  const usdtUsdSecondary = await MockV3Aggregator.deploy(8, 100100000); // $1.001
  await usdtUsdSecondary.waitForDeployment();
  const usdtSecondaryAddr = await usdtUsdSecondary.getAddress();
  console.log("✅ Secondary USDT/USD deployed:", usdtSecondaryAddr, "($1.001)\n");
  
  // Setup Secondary Oracles
  const nativeToken = "0x0000000000000000000000000000000000000000";
  
  console.log("🔧 Setting up secondary oracles in Gateway...\n");
  
  // ETH Secondary Oracle
  try {
    console.log("Setting ETH secondary oracle...");
    let tx = await gateway.addSecondaryOracle(nativeToken, ethSecondaryAddr);
    await tx.wait();
    console.log("✅ ETH secondary oracle set");
  } catch (error) {
    console.log("⚠️  ETH secondary oracle failed:", error.message);
  }
  
  // USDC Secondary Oracle
  try {
    console.log("Setting USDC secondary oracle...");
    let tx = await gateway.addSecondaryOracle(usdcAddress, usdcSecondaryAddr);
    await tx.wait();
    console.log("✅ USDC secondary oracle set");
  } catch (error) {
    console.log("⚠️  USDC secondary oracle failed:", error.message);
  }
  
  // USDT Secondary Oracle
  try {
    console.log("Setting USDT secondary oracle...");
    let tx = await gateway.addSecondaryOracle(usdtAddress, usdtSecondaryAddr);
    await tx.wait();
    console.log("✅ USDT secondary oracle set");
  } catch (error) {
    console.log("⚠️  USDT secondary oracle failed:", error.message);
  }
  
  // Save oracle addresses
  const oracleInfo = {
    network: network,
    timestamp: new Date().toISOString(),
    oracles: {
      ETH: {
        primary: deploymentInfo.priceFeeds.ETH_USD,
        secondary: ethSecondaryAddr,
        primaryPrice: "$2000 (Chainlink)",
        secondaryPrice: "$2010 (Mock)"
      },
      USDC: {
        primary: deploymentInfo.priceFeeds.USDC_USD,
        secondary: usdcSecondaryAddr,
        primaryPrice: "$1.00 (Chainlink)",
        secondaryPrice: "$0.999 (Mock)"
      },
      USDT: {
        primary: deploymentInfo.priceFeeds.USDT_USD,
        secondary: usdtSecondaryAddr,
        primaryPrice: "$1.00 (Chainlink)",
        secondaryPrice: "$1.001 (Mock)"
      }
    }
  };
  
  const oracleFile = path.join(__dirname, "..", "deployed", `${network}-oracles.json`);
  fs.writeFileSync(oracleFile, JSON.stringify(oracleInfo, null, 2));
  
  console.log("\n✅ Oracle setup saved to:", oracleFile);
  console.log("\n========================================");
  console.log("🎉 ORACLE SETUP COMPLETE!");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
