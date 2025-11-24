// scripts/debug-payment.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("🔍 DEBUG PAYMENT GATEWAY");
  console.log("========================================");
  console.log("Network:", network);
  
  // Load deployment
  const deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  
  // Check if ETH is supported
  const ethAddress = "0x0000000000000000000000000000000000000000";
  const isEthSupported = await gateway.supportedTokens(ethAddress);
  console.log("\n✅ ETH supported:", isEthSupported);
  
  if (!isEthSupported) {
    console.log("❌ ETH is not supported! This is the problem.");
    return;
  }
  
  // Check primary price feed
  const primaryFeed = await gateway.priceFeeds(ethAddress);
  console.log("Primary price feed:", primaryFeed);
  
  if (primaryFeed === "0x0000000000000000000000000000000000000000") {
    console.log("❌ No primary price feed set!");
    return;
  }
  
  // Check secondary price feed
  const secondaryFeed = await gateway.secondaryPriceFeeds(ethAddress);
  console.log("Secondary price feed:", secondaryFeed);
  
  const useSecondary = await gateway.useSecondaryOracle(ethAddress);
  console.log("Use secondary oracle:", useSecondary);
  
  // Try to get price
  console.log("\n🔍 Testing price fetch...");
  try {
    // Test view function first
    const quote = await gateway.getPriceQuote(ethAddress, 10000); // $100
    console.log("✅ getPriceQuote works!");
    console.log("Token amount:", hre.ethers.formatEther(quote.tokenAmount), "ETH");
    console.log("Token price:", Number(quote.tokenPriceUSD) / 1e8, "USD");
  } catch (error) {
    console.log("❌ getPriceQuote failed!");
    console.log("Error:", error.message);
    
    if (error.message.includes("PriceDeviationTooHigh")) {
      console.log("\n⚠️  PROBLEM: Price deviation between oracles is too high!");
      console.log("The two oracles have prices that differ too much.");
      
      const maxDeviation = await gateway.maxPriceDeviation();
      console.log("Max allowed deviation:", Number(maxDeviation) / 100, "%");
    }
    
    if (error.message.includes("BothOraclesFailed")) {
      console.log("\n⚠️  PROBLEM: Both oracles failed to return prices!");
    }
    
    if (error.message.includes("PriceFeedError")) {
      console.log("\n⚠️  PROBLEM: Primary oracle failed!");
    }
    
    return;
  }
  
  // Try to lock quote
  console.log("\n🔍 Testing quote locking...");
  try {
    const tx = await gateway.lockPriceQuote(ethAddress, 10000);
    const receipt = await tx.wait();
    console.log("✅ lockPriceQuote works! Tx:", receipt.hash);
    
    // Find the locked quote ID
    const event = receipt.logs.find(log => {
      try {
        const parsed = gateway.interface.parseLog(log);
        return parsed.name === "PriceQuoteLocked";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = gateway.interface.parseLog(event);
      const quoteId = parsed.args.quoteId;
      console.log("Locked quote ID:", quoteId);
      
      // Check quote details
      const quote = await gateway.priceQuotes(quoteId);
      console.log("\n📋 Quote details:");
      console.log("Token:", quote.token);
      console.log("USD Amount:", Number(quote.usdAmount) / 100, "USD");
      console.log("Token Amount:", hre.ethers.formatEther(quote.tokenAmount), "ETH");
      console.log("Is Used:", quote.isUsed);
      console.log("Valid Until:", new Date(Number(quote.validUntil) * 1000).toISOString());
    }
    
  } catch (error) {
    console.log("❌ lockPriceQuote failed!");
    console.log("Error:", error.message);
    
    // Try to decode the error
    if (error.data) {
      console.log("Error data:", error.data);
      
      // Try to decode custom error
      try {
        const iface = gateway.interface;
        const decodedError = iface.parseError(error.data);
        console.log("Decoded error:", decodedError.name);
        console.log("Error args:", decodedError.args);
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
