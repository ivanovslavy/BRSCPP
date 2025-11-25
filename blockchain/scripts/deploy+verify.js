// scripts/deploy.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Chainlink Price Feed 
const PRICE_FEEDS = {
  sepolia: {
    ETH_USD: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    USDC_USD: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
    USDT_USD: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"
  },
  mainnet: {
    ETH_USD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    USDC_USD: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
    USDT_USD: "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D"
  },
  bsc: {
    BNB_USD: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
    USDC_USD: "0x51597f405303C4377E36123cBc172b13269EA163",
    USDT_USD: "0xB97Ad0E74fa7d920791E90258A6E2085088b4320"
  },
  bsctestnet: {
    BNB_USD: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526",
    USDC_USD: "0x90c069C4538adAc136E051052E14c1cD799C41B7",
    USDT_USD: "0xEca2605f0BCF2BA5966372C99837b1F182d3D620"
  },
  polygon: {
    MATIC_USD: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
    USDC_USD: "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7",
    USDT_USD: "0x0A6513e40db6EB1b165753AD52E80663aeA50545"
  },
  amoy: {
    MATIC_USD: "0x001382149eBa3441043c1c66972b4772963f5D43",
    USDC_USD: "0x1b8739bB4CdF0089d07097A9Ae5Bd274b29C6F16",
    USDT_USD: "0x92C09849638959196E976289418e5973CC96d645"
  }
};

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
        await sleep(10000);
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
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("🚀 DEPLOY CryptoPaymentGateway");
  console.log("========================================");
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Parameters from .env
  const ownerAddress = process.env.OWNER_ADDRESS || deployer.address;
  const feeCollectorAddress = process.env.FEE_COLLECTOR_ADDRESS || deployer.address;
  const initialFeePercentage = process.env.INITIAL_FEE_PERCENTAGE || 50;
  
  console.log("\n📝 Deploy параметри:");
  console.log("Owner:", ownerAddress);
  console.log("Fee Collector:", feeCollectorAddress);
  console.log("Initial Fee:", initialFeePercentage, "basis points");
  
  let deploymentInfo = {
    network: network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {},
    priceFeeds: {},
    config: {
      owner: ownerAddress,
      feeCollector: feeCollectorAddress,
      feePercentage: initialFeePercentage
    }
  };
  
  // Deploy MockERC20 tokens for all test networks
  let usdcToken, usdtToken;
  if (["localhost", "hardhat", "sepolia", "bsctestnet", "amoy"].includes(network)) {
    console.log("\n🪙 Deploying Mock Tokens...");
    
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    
    usdcToken = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdcToken.waitForDeployment();
    const usdcAddress = await usdcToken.getAddress();
    console.log("✅ Mock USDC deployed:", usdcAddress);
    deploymentInfo.contracts.MockUSDC = usdcAddress;
    
    usdtToken = await MockERC20.deploy("Tether USD", "USDT", 6);
    await usdtToken.waitForDeployment();
    const usdtAddress = await usdtToken.getAddress();
    console.log("✅ Mock USDT deployed:", usdtAddress);
    deploymentInfo.contracts.MockUSDT = usdtAddress;
  }
  
  // Deploy CryptoPaymentGateway
  console.log("\n💎 Deploying CryptoPaymentGateway...");
  const CryptoPaymentGateway = await hre.ethers.getContractFactory("CryptoPaymentGateway");
  const gateway = await CryptoPaymentGateway.deploy(
    ownerAddress,
    feeCollectorAddress,
    initialFeePercentage
  );
  await gateway.waitForDeployment();
  const gatewayAddress = await gateway.getAddress();
  
  console.log("✅ CryptoPaymentGateway deployed:", gatewayAddress);
  deploymentInfo.contracts.CryptoPaymentGateway = gatewayAddress;
  
  // Config price feeds и tokens
  console.log("\n⚙️  Configuring Gateway...");
  
  const nativeToken = "0x0000000000000000000000000000000000000000";
  let priceFeeds = {};
  let primaryOracleAddress = process.env.PRIMARY_ORACLE_ADDRESS || "";
  let secondaryOracleAddress = process.env.SECONDARY_ORACLE_ADDRESS || "";
  
  // За localhost - deploy mock price feeds
  if (network === "localhost" || network === "hardhat") {
    console.log("📡 Deploying Mock Price Feeds for localhost...");
    const MockV3Aggregator = await hre.ethers.getContractFactory("MockV3Aggregator");
    
    // ETH/USD = $2000
    const ethUsdFeed = await MockV3Aggregator.deploy(8, 200000000000);
    await ethUsdFeed.waitForDeployment();
    priceFeeds.ETH_USD = await ethUsdFeed.getAddress();
    console.log("✅ Mock ETH/USD feed:", priceFeeds.ETH_USD);
    
    // USDC/USD = $1.00
    const usdcUsdFeed = await MockV3Aggregator.deploy(8, 100000000);
    await usdcUsdFeed.waitForDeployment();
    priceFeeds.USDC_USD = await usdcUsdFeed.getAddress();
    console.log("✅ Mock USDC/USD feed:", priceFeeds.USDC_USD);
    
    // USDT/USD = $1.00
    const usdtUsdFeed = await MockV3Aggregator.deploy(8, 100000000);
    await usdtUsdFeed.waitForDeployment();
    priceFeeds.USDT_USD = await usdtUsdFeed.getAddress();
    console.log("✅ Mock USDT/USD feed:", priceFeeds.USDT_USD);
    
    // Secondary oracles 
    if (primaryOracleAddress) {
      priceFeeds.ETH_USD_PRIMARY = primaryOracleAddress;
    }
    if (secondaryOracleAddress) {
      priceFeeds.ETH_USD_SECONDARY = secondaryOracleAddress;
    }
  } else {
    // For production  Chainlink feeds
    priceFeeds = PRICE_FEEDS[network] || {};
    
    if (Object.keys(priceFeeds).length === 0) {
      console.log("⚠️  WARNING: No price feeds configured for", network);
      console.log("⚠️  Skipping token configuration. You must configure manually.");
    }
    
    // Add custom oracle addresses from .env
    if (primaryOracleAddress) {
      priceFeeds.PRIMARY_ORACLE = primaryOracleAddress;
    }
    if (secondaryOracleAddress) {
      priceFeeds.SECONDARY_ORACLE = secondaryOracleAddress;
    }
  }
  
  deploymentInfo.priceFeeds = priceFeeds;
  
  // Setup Native Token (ETH/BNB/MATIC) only if have price feed
  const nativeFeed = priceFeeds.ETH_USD || priceFeeds.BNB_USD || priceFeeds.MATIC_USD;
  if (nativeFeed) {
    try {
      console.log("🔧 Setting up native token with feed:", nativeFeed);
      
      let tx = await gateway.addSupportedToken(nativeToken, nativeFeed);
      await tx.wait();
      console.log("✅ Native token added");
      
      tx = await gateway.setMaxPriceStaleness(nativeToken, 3600);
      await tx.wait();
      console.log("✅ Native token staleness set");
      
      // Add secondary oracle if have
      if (secondaryOracleAddress) {
        tx = await gateway.addSecondaryOracle(nativeToken, secondaryOracleAddress);
        await tx.wait();
        console.log("✅ Native token secondary oracle set");
      }
    } catch (error) {
      console.log("⚠️  Native token setup failed:", error.message);
    }
  }
  
  // Setup USDC Token
  if (usdcToken && priceFeeds.USDC_USD) {
    try {
      const usdcAddress = await usdcToken.getAddress();
      console.log("🔧 Setting up USDC token:", usdcAddress);
      
      let tx = await gateway.addSupportedToken(usdcAddress, priceFeeds.USDC_USD);
      await tx.wait();
      console.log("✅ USDC token added");
      
      tx = await gateway.setMaxPriceStaleness(usdcAddress, 86400);
      await tx.wait();
      console.log("✅ USDC staleness set");
    } catch (error) {
      console.log("⚠️  USDC setup failed:", error.message);
    }
  }
  
  // Setup USDT Token
  if (usdtToken && priceFeeds.USDT_USD) {
    try {
      const usdtAddress = await usdtToken.getAddress();
      console.log("🔧 Setting up USDT token:", usdtAddress);
      
      let tx = await gateway.addSupportedToken(usdtAddress, priceFeeds.USDT_USD);
      await tx.wait();
      console.log("✅ USDT token added");
      
      tx = await gateway.setMaxPriceStaleness(usdtAddress, 86400);
      await tx.wait();
      console.log("✅ USDT staleness set");
    } catch (error) {
      console.log("⚠️  USDT setup failed:", error.message);
    }
  }
  
  // Save deployment info
  const deployDir = path.join(__dirname, "..", "deployed");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  
  const deployFile = path.join(deployDir, `${network}.json`);
  fs.writeFileSync(deployFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n✅ Deployment info saved to:", deployFile);
  
  // Verify contracts
  if (network !== "localhost" && network !== "hardhat") {
    console.log("\n⏳ Waiting 30 seconds before verification...");
    await sleep(30000);
    
    console.log("\n🔍 Verifying contracts on block explorer...");
    
    const verificationResults = {
      network: network,
      timestamp: new Date().toISOString(),
      results: []
    };
    
    // Verify CryptoPaymentGateway
    const gatewayResult = await verifyContract(
      gatewayAddress,
      [ownerAddress, feeCollectorAddress, parseInt(initialFeePercentage)],
      "CryptoPaymentGateway",
      5
    );
    verificationResults.results.push(gatewayResult);
    await sleep(5000);
    
    // Verify Mock USDC
    if (usdcToken) {
      const usdcResult = await verifyContract(
        await usdcToken.getAddress(),
        ["USD Coin", "USDC", 6],
        "MockUSDC",
        5
      );
      verificationResults.results.push(usdcResult);
      await sleep(5000);
    }
    
    // Verify Mock USDT
    if (usdtToken) {
      const usdtResult = await verifyContract(
        await usdtToken.getAddress(),
        ["Tether USD", "USDT", 6],
        "MockUSDT",
        5
      );
      verificationResults.results.push(usdtResult);
    }
    
    // Save verification results
    const verifyFile = path.join(deployDir, `${network}-verification.json`);
    fs.writeFileSync(verifyFile, JSON.stringify(verificationResults, null, 2));
    console.log("\n✅ Verification results saved to:", verifyFile);
    
    // Summary
    const successful = verificationResults.results.filter(r => r.status === "success" || r.status === "already_verified").length;
    const failed = verificationResults.results.filter(r => r.status === "failed").length;
    
    console.log("\n📊 Verification Summary:");
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
  }
  
  console.log("\n========================================");
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log("\n📋 Gateway Address:", gatewayAddress);
  if (usdcToken) console.log("📋 Mock USDC:", await usdcToken.getAddress());
  if (usdtToken) console.log("📋 Mock USDT:", await usdtToken.getAddress());
  
  // Print Etherscan links for non-localhost
  if (network !== "localhost" && network !== "hardhat") {
    const explorerPrefix = network === 'mainnet' ? '' : network + '.';
    console.log("\n🔗 Etherscan Links:");
    console.log(`Gateway: https://${explorerPrefix}etherscan.io/address/${gatewayAddress}`);
    if (usdcToken) {
      console.log(`USDC: https://${explorerPrefix}etherscan.io/address/${await usdcToken.getAddress()}`);
    }
    if (usdtToken) {
      console.log(`USDT: https://${explorerPrefix}etherscan.io/address/${await usdtToken.getAddress()}`);
    }
  }
  
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
