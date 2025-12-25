// scripts/setup-oracles-v2.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("SETUP ORACLES - CRYPTOPAYMENTGATEWAY V2");
  console.log("========================================");
  console.log("Network:", network);
  console.log("");
  
  // Load deployment info
  let deployFile = path.join(__dirname, "..", "deployed", `${network}-v2.json`);
  if (!fs.existsSync(deployFile)) {
    deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  }
  
  if (!fs.existsSync(deployFile)) {
    console.error("ERROR: Deployment file not found");
    console.error("Expected:", deployFile);
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  const gatewayAddress = deployment.contracts.gateway;
  const usdcAddress = deployment.contracts.usdc;
  const usdtAddress = deployment.contracts.usdt;
  
  console.log("Gateway:", gatewayAddress);
  console.log("USDC:", usdcAddress);
  console.log("USDT:", usdtAddress);
  console.log("");
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), network === "localhost" ? "ETH" : hre.network.config.nativeToken || "ETH");
  console.log("");
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  const nativeToken = "0x0000000000000000000000000000000000000000";
  
  // Get current oracle prices
  console.log("========================================");
  console.log("CURRENT ORACLE PRICES");
  console.log("========================================\n");
  
  try {
    const ethFeed = await gateway.priceFeeds(nativeToken);
    const usdcFeed = await gateway.priceFeeds(usdcAddress);
    
    if (ethFeed !== "0x0000000000000000000000000000000000000000") {
      const ethOracle = await hre.ethers.getContractAt("AggregatorV3Interface", ethFeed);
      const ethData = await ethOracle.latestRoundData();
      console.log("ETH/USD Primary:", hre.ethers.formatUnits(ethData[1], 8), "USD");
      console.log("ETH Oracle:", ethFeed);
    }
    
    if (usdcFeed !== "0x0000000000000000000000000000000000000000") {
      const usdcOracle = await hre.ethers.getContractAt("AggregatorV3Interface", usdcFeed);
      const usdcData = await usdcOracle.latestRoundData();
      console.log("USDC/USD Primary:", hre.ethers.formatUnits(usdcData[1], 8), "USD");
      console.log("USDC Oracle:", usdcFeed);
    }
    
    console.log("");
  } catch (error) {
    console.log("Could not read current prices");
    console.log("");
  }
  
  // Deploy Secondary Mock Oracles (for localhost/testing)
  if (network === "localhost" || network === "hardhat") {
    console.log("========================================");
    console.log("DEPLOYING SECONDARY MOCK ORACLES");
    console.log("========================================\n");
    
    const MockV3Aggregator = await hre.ethers.getContractFactory("MockV3Aggregator");
    
    // ETH/USD Secondary = $3110 (primary from Chainlink ~$3100)
    console.log("Deploying ETH/USD Secondary ($3110)...");
    const ethSecondary = await MockV3Aggregator.deploy(8, 311000000000n); // $3110 (използване на 'n' за BigInt)
    await ethSecondary.waitForDeployment();
    const ethSecondaryAddr = ethSecondary.target;
    console.log("Deployed:", ethSecondaryAddr);
    console.log("");
    
    // USDC/USD Secondary = $0.9995 (primary $1.00)
    console.log("Deploying USDC/USD Secondary ($0.9995)...");
    const usdcSecondary = await MockV3Aggregator.deploy(8, 99950000n); // $0.9995
    await usdcSecondary.waitForDeployment();
    const usdcSecondaryAddr = usdcSecondary.target;
    console.log("Deployed:", usdcSecondaryAddr);
    console.log("");
    
    // USDT/USD Secondary = $1.0005 (primary $1.00)
    console.log("Deploying USDT/USD Secondary ($1.0005)...");
    const usdtSecondary = await MockV3Aggregator.deploy(8, 100050000n); // $1.0005
    await usdtSecondary.waitForDeployment();
    const usdtSecondaryAddr = usdtSecondary.target;
    console.log("Deployed:", usdtSecondaryAddr);
    console.log("");
    
    // Setup Secondary Oracles in Gateway
    console.log("========================================");
    console.log("CONFIGURING SECONDARY ORACLES");
    console.log("========================================\n");
    
    // ETH Secondary
    try {
      console.log("Adding ETH secondary oracle...");
      const tx1 = await gateway.addSecondaryOracle(nativeToken, ethSecondaryAddr);
      await tx1.wait();
      console.log("SUCCESS: ETH secondary oracle added");
      console.log("");
    } catch (error) {
      console.log("ERROR:", error.message);
      console.log("");
    }
    
    // USDC Secondary
    try {
      console.log("Adding USDC secondary oracle...");
      const tx2 = await gateway.addSecondaryOracle(usdcAddress, usdcSecondaryAddr);
      await tx2.wait();
      console.log("SUCCESS: USDC secondary oracle added");
      console.log("");
    } catch (error) {
      console.log("ERROR:", error.message);
      console.log("");
    }
    
    // USDT Secondary
    try {
      console.log("Adding USDT secondary oracle...");
      const tx3 = await gateway.addSecondaryOracle(usdtAddress, usdtSecondaryAddr);
      await tx3.wait();
      console.log("SUCCESS: USDT secondary oracle added");
      console.log("");
    } catch (error) {
      console.log("ERROR:", error.message);
      console.log("");
    }
    
    // Save oracle info
    const oracleInfo = {
      network: network,
      timestamp: new Date().toISOString(),
      gateway: gatewayAddress,
      oracles: {
        ETH: {
          primary: deployment.oracles.native,
          secondary: ethSecondaryAddr,
          primaryPrice: "~$3100 (Chainlink)",
          secondaryPrice: "$3110 (Mock)"
        },
        USDC: {
          primary: deployment.oracles.stable,
          secondary: usdcSecondaryAddr,
          primaryPrice: "$1.00 (Chainlink)",
          secondaryPrice: "$0.9995 (Mock)"
        },
        USDT: {
          primary: deployment.oracles.stable,
          secondary: usdtSecondaryAddr,
          primaryPrice: "$1.00 (Chainlink)",
          secondaryPrice: "$1.0005 (Mock)"
        }
      }
    };
    
    const oracleFile = path.join(__dirname, "..", "deployed", `${network}-oracles-v2.json`);
    fs.writeFileSync(oracleFile, JSON.stringify(oracleInfo, null, 2));
    console.log("Oracle info saved:", oracleFile);
    console.log("");
  }
  
  // Update prices for existing mock oracles (localhost)
  if (network === "localhost" || network === "hardhat") {
    console.log("========================================");
    console.log("UPDATE PRIMARY ORACLE PRICES");
    console.log("========================================\n");
    
    try {
      const ethFeedAddr = deployment.oracles.native;
      const ethFeed = await hre.ethers.getContractAt("MockV3Aggregator", ethFeedAddr);
      
      console.log("Updating ETH/USD to $3100...");
      const updateTx = await ethFeed.updateAnswer(310000000000n); // $3100
      await updateTx.wait();
      console.log("SUCCESS: ETH price updated to $3100");
      console.log("");
    } catch (error) {
      console.log("INFO: Could not update price (probably not a mock oracle)");
      console.log("");
    }
  }
  
  // Test price fetching
  console.log("========================================");
  console.log("TEST PRICE QUOTE");
  console.log("========================================\n");
  
  try {
    console.log("Getting price quote for $100 in ETH...");
    // Променихме .validUntil на .validUntilBlock
    const quote = await gateway.getPriceQuote(nativeToken, 10000);
    
    console.log("Quote ID:", quote.quoteId);
    console.log("ETH Amount:", hre.ethers.formatEther(quote.tokenAmount));
    console.log("ETH Price:", hre.ethers.formatUnits(quote.tokenPriceUSD, 8), "USD");
    // FIX: Извеждане на Block Number вместо преобразуване в дата
    console.log("Valid Until Block:", quote.validUntilBlock.toString()); 
    console.log("SUCCESS: Price quote working");
    console.log("");
  } catch (error) {
    console.log("ERROR:", error.message);
    console.log("");
  }
  
  try {
    console.log("Getting price quote for $100 in USDC...");
    // Променихме .validUntil на .validUntilBlock
    const quote = await gateway.getPriceQuote(usdcAddress, 10000);
    
    console.log("Quote ID:", quote.quoteId);
    console.log("USDC Amount:", hre.ethers.formatUnits(quote.tokenAmount, 6));
    console.log("USDC Price:", hre.ethers.formatUnits(quote.tokenPriceUSD, 8), "USD");
    // FIX: Извеждане на Block Number вместо преобразуване в дата
    console.log("Valid Until Block:", quote.validUntilBlock.toString());
    console.log("SUCCESS: Price quote working");
    console.log("");
  } catch (error) {
    console.log("ERROR:", error.message);
    console.log("NOTE: USDC quote may fail if oracle is stale");
    console.log("SOLUTION: Use direct payment for USDC (1:1)");
    console.log("");
  }
  
  // Check configuration
  console.log("========================================");
  console.log("GATEWAY CONFIGURATION");
  console.log("========================================\n");
  
  const owner = await gateway.owner();
  const feeCollector = await gateway.feeCollector();
  const feePercentage = await gateway.feePercentage();
  // FIX: Променихме quoteValidityDuration на quoteValidityDurationBlocks
  const quoteValidity = await gateway.quoteValidityDurationBlocks(); 
  const maxDeviation = await gateway.maxPriceDeviation();
  
  console.log("Owner:", owner);
  console.log("Fee Collector:", feeCollector);
  console.log("Fee:", feePercentage.toString(), "basis points");
  // FIX: Променихме изхода да показва "blocks" вместо "seconds"
  console.log("Quote Validity:", quoteValidity.toString(), "blocks");
  console.log("Max Price Deviation:", maxDeviation.toString(), "basis points");
  console.log("");
  
  // Check token support
  const ethSupported = await gateway.supportedTokens(nativeToken);
  const usdcSupported = await gateway.supportedTokens(usdcAddress);
  const usdtSupported = await gateway.supportedTokens(usdtAddress);
  
  console.log("Supported Tokens:");
  console.log("ETH:", ethSupported);
  console.log("USDC:", usdcSupported);
  console.log("USDT:", usdtSupported);
  console.log("");
  
  // Check direct payment
  const usdcDirect = await gateway.directPaymentTokens(usdcAddress);
  const usdtDirect = await gateway.directPaymentTokens(usdtAddress);
  
  console.log("Direct Payment Enabled:");
  console.log("USDC:", usdcDirect);
  console.log("USDT:", usdtDirect);
  console.log("");
  
  console.log("========================================");
  console.log("ORACLE SETUP COMPLETE");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
