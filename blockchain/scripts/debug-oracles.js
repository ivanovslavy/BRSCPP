// scripts/debug-oracles.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("🔍 DEBUG ORACLES");
  console.log("========================================");
  console.log("Network:", network);
  
  // Load deployment
  const deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  const ethAddress = "0x0000000000000000000000000000000000000000";
  
  // Get oracle addresses
  const primaryFeedAddr = await gateway.priceFeeds(ethAddress);
  const secondaryFeedAddr = await gateway.secondaryPriceFeeds(ethAddress);
  
  console.log("\n📡 Oracle Addresses:");
  console.log("Primary (Chainlink):", primaryFeedAddr);
  console.log("Secondary (Mock):", secondaryFeedAddr);
  
  // Test primary oracle
  console.log("\n🔍 Testing PRIMARY oracle (Chainlink)...");
  try {
    const primaryFeed = await hre.ethers.getContractAt(
      "AggregatorV3Interface",
      primaryFeedAddr
    );
    
    const roundData = await primaryFeed.latestRoundData();
    console.log("✅ Primary oracle works!");
    console.log("Price:", Number(roundData.answer) / 1e8, "USD");
    console.log("Updated at:", new Date(Number(roundData.updatedAt) * 1000).toISOString());
    console.log("Round ID:", roundData.roundId.toString());
    
    // Check staleness
    const now = Math.floor(Date.now() / 1000);
    const age = now - Number(roundData.updatedAt);
    console.log("Age:", age, "seconds (", Math.floor(age / 60), "minutes )");
    
    const maxStaleness = await gateway.maxPriceStaleness(ethAddress);
    console.log("Max staleness allowed:", Number(maxStaleness), "seconds");
    
    if (age > Number(maxStaleness)) {
      console.log("⚠️  WARNING: Price is stale!");
    }
    
  } catch (error) {
    console.log("❌ Primary oracle failed!");
    console.log("Error:", error.message);
  }
  
  // Test secondary oracle
  console.log("\n🔍 Testing SECONDARY oracle (Mock)...");
  try {
    const secondaryFeed = await hre.ethers.getContractAt(
      "MockV3Aggregator",
      secondaryFeedAddr
    );
    
    const roundData = await secondaryFeed.latestRoundData();
    console.log("✅ Secondary oracle works!");
    console.log("Price:", Number(roundData.answer) / 1e8, "USD");
    console.log("Updated at:", new Date(Number(roundData.updatedAt) * 1000).toISOString());
    
    const now = Math.floor(Date.now() / 1000);
    const age = now - Number(roundData.updatedAt);
    console.log("Age:", age, "seconds");
    
  } catch (error) {
    console.log("❌ Secondary oracle failed!");
    console.log("Error:", error.message);
  }
  
  // Calculate price deviation
  console.log("\n🔍 Checking price deviation...");
  try {
    const primaryFeed = await hre.ethers.getContractAt("AggregatorV3Interface", primaryFeedAddr);
    const secondaryFeed = await hre.ethers.getContractAt("MockV3Aggregator", secondaryFeedAddr);
    
    const primary = await primaryFeed.latestRoundData();
    const secondary = await secondaryFeed.latestRoundData();
    
    const primaryPrice = Number(primary.answer);
    const secondaryPrice = Number(secondary.answer);
    
    console.log("Primary price:", primaryPrice / 1e8, "USD");
    console.log("Secondary price:", secondaryPrice / 1e8, "USD");
    
    // Calculate deviation (same formula as contract)
    let deviation;
    if (primaryPrice > secondaryPrice) {
      deviation = ((primaryPrice - secondaryPrice) * 10000) / primaryPrice;
    } else {
      deviation = ((secondaryPrice - primaryPrice) * 10000) / secondaryPrice;
    }
    
    console.log("Deviation:", deviation / 100, "%");
    
    const maxDeviation = await gateway.maxPriceDeviation();
    console.log("Max allowed deviation:", Number(maxDeviation) / 100, "%");
    
    if (deviation > Number(maxDeviation)) {
      console.log("❌ PROBLEM FOUND: Deviation is TOO HIGH!");
      console.log("This is why the transaction reverts.");
      console.log("\nSOLUTION OPTIONS:");
      console.log("1. Increase maxPriceDeviation in gateway");
      console.log("2. Update secondary oracle price to be closer to primary");
      console.log("3. Disable secondary oracle for ETH");
    } else {
      console.log("✅ Deviation is acceptable");
    }
    
  } catch (error) {
    console.log("❌ Could not calculate deviation");
    console.log("Error:", error.message);
  }
  
  // Try calling getTokenPriceUSD directly
  console.log("\n🔍 Testing getTokenPriceUSD()...");
  try {
    // This is a state-changing call, so we use callStatic to simulate
    const price = await gateway.getTokenPriceUSD.staticCall(ethAddress);
    console.log("✅ getTokenPriceUSD works!");
    console.log("Average price:", Number(price) / 1e8, "USD");
  } catch (error) {
    console.log("❌ getTokenPriceUSD failed!");
    console.log("Error:", error.message);
    
    // Try to get more details
    if (error.data) {
      console.log("\n🔍 Trying to decode error...");
      try {
        // Get error selector
        const errorSelector = error.data.slice(0, 10);
        console.log("Error selector:", errorSelector);
        
        // Common error selectors
        const errors = {
          "0x07ed6ee6": "PriceDeviationTooHigh()",
          "0xd81b2f2e": "PriceFeedError()",
          "0x3204506f": "InvalidPriceFeed()",
          "0xc184c27b": "BothOraclesFailed()"
        };
        
        if (errors[errorSelector]) {
          console.log("⚠️  Decoded error:", errors[errorSelector]);
        }
      } catch (e) {
        console.log("Could not decode error");
      }
    }
  }
  
  console.log("\n========================================");
  console.log("🏁 DEBUG COMPLETE");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
