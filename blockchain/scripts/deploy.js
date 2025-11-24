// scripts/deploy.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Chainlink Price Feed адреси за различни мрежи
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

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("🚀 DEPLOY CryptoPaymentGateway");
  console.log("========================================");
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Параметри от .env
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
  
  // Deploy MockERC20 tokens за тестови мрежи
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
  
  // Конфигурация на price feeds и tokens
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
    
    // Secondary oracles - използваме същите за тест
    if (primaryOracleAddress) {
      priceFeeds.ETH_USD_PRIMARY = primaryOracleAddress;
    }
    if (secondaryOracleAddress) {
      priceFeeds.ETH_USD_SECONDARY = secondaryOracleAddress;
    }
  } else {
    // За production мрежи - използваме реални Chainlink feeds
    priceFeeds = PRICE_FEEDS[network] || {};
    
    if (Object.keys(priceFeeds).length === 0) {
      console.log("⚠️  WARNING: No price feeds configured for", network);
      console.log("⚠️  Skipping token configuration. You must configure manually.");
    }
    
    // Добави custom oracle адреси от .env
    if (primaryOracleAddress) {
      priceFeeds.PRIMARY_ORACLE = primaryOracleAddress;
    }
    if (secondaryOracleAddress) {
      priceFeeds.SECONDARY_ORACLE = secondaryOracleAddress;
    }
  }
  
  deploymentInfo.priceFeeds = priceFeeds;
  
  // Setup Native Token (ETH/BNB/MATIC) само ако има price feed
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
      
      // Добави secondary oracle ако има
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
  
  // Запази deployment info
  const deployDir = path.join(__dirname, "..", "deployed");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  
  const deployFile = path.join(deployDir, `${network}.json`);
  fs.writeFileSync(deployFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n✅ Deployment info saved to:", deployFile);
  
  // Верификация на контракти (само за non-localhost мрежи)
  if (network !== "localhost" && network !== "hardhat") {
    console.log("\n⏳ Waiting 20 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    console.log("\n🔍 Verifying contracts on block explorer...");
    
    const verificationResults = {
      network: network,
      timestamp: new Date().toISOString(),
      results: []
    };
    
    // Verify CryptoPaymentGateway
    try {
      console.log("🔍 Verifying CryptoPaymentGateway...");
      await hre.run("verify:verify", {
        address: gatewayAddress,
        constructorArguments: [ownerAddress, feeCollectorAddress, initialFeePercentage]
      });
      console.log("✅ CryptoPaymentGateway verified");
      verificationResults.results.push({
        contract: "CryptoPaymentGateway",
        address: gatewayAddress,
        status: "success"
      });
    } catch (error) {
      console.log("⚠️  CryptoPaymentGateway verification failed:", error.message);
      verificationResults.results.push({
        contract: "CryptoPaymentGateway",
        address: gatewayAddress,
        status: "failed",
        error: error.message
      });
    }
    
    // Verify Mock Tokens
    if (usdcToken) {
      try {
        console.log("🔍 Verifying Mock USDC...");
        await hre.run("verify:verify", {
          address: await usdcToken.getAddress(),
          constructorArguments: ["USD Coin", "USDC", 6]
        });
        console.log("✅ Mock USDC verified");
        verificationResults.results.push({
          contract: "MockUSDC",
          address: await usdcToken.getAddress(),
          status: "success"
        });
      } catch (error) {
        console.log("⚠️  Mock USDC verification failed:", error.message);
        verificationResults.results.push({
          contract: "MockUSDC",
          address: await usdcToken.getAddress(),
          status: "failed",
          error: error.message
        });
      }
    }
    
    if (usdtToken) {
      try {
        console.log("🔍 Verifying Mock USDT...");
        await hre.run("verify:verify", {
          address: await usdtToken.getAddress(),
          constructorArguments: ["Tether USD", "USDT", 6]
        });
        console.log("✅ Mock USDT verified");
        verificationResults.results.push({
          contract: "MockUSDT",
          address: await usdtToken.getAddress(),
          status: "success"
        });
      } catch (error) {
        console.log("⚠️  Mock USDT verification failed:", error.message);
        verificationResults.results.push({
          contract: "MockUSDT",
          address: await usdtToken.getAddress(),
          status: "failed",
          error: error.message
        });
      }
    }
    
    // Запази verification results
    const verifyFile = path.join(deployDir, `${network}-verification.json`);
    fs.writeFileSync(verifyFile, JSON.stringify(verificationResults, null, 2));
    console.log("\n✅ Verification results saved to:", verifyFile);
  }
  
  console.log("\n========================================");
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log("\n📋 Gateway Address:", gatewayAddress);
  if (usdcToken) console.log("📋 Mock USDC:", await usdcToken.getAddress());
  if (usdtToken) console.log("📋 Mock USDT:", await usdtToken.getAddress());
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
