// scripts/debug-payment-flow.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("🔍 DEBUG PAYMENT FLOW");
  console.log("========================================");
  
  const deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  
  const signers = await hre.ethers.getSigners();
  const merchant = signers[0];
  const customer = signers.length > 1 ? signers[1] : signers[0];
  
  console.log("Merchant:", merchant.address);
  console.log("Customer:", customer.address);
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  const ethAddress = "0x0000000000000000000000000000000000000000";
  
  // Step 1: Lock quote
  console.log("\n📝 Step 1: Locking quote for $200...");
  const usdAmount = 20000; // $200
  
  const tx = await gateway.lockPriceQuote(ethAddress, usdAmount);
  const receipt = await tx.wait();
  console.log("✅ Quote locked, tx:", receipt.hash);
  
  // Find quote ID from event
  const lockedEvent = receipt.logs.find(log => {
    try {
      const parsed = gateway.interface.parseLog(log);
      return parsed.name === "PriceQuoteLocked";
    } catch {
      return false;
    }
  });
  
  if (!lockedEvent) {
    console.log("❌ Could not find PriceQuoteLocked event!");
    return;
  }
  
  const parsed = gateway.interface.parseLog(lockedEvent);
  const quoteId = parsed.args.quoteId;
  const tokenAmount = parsed.args.tokenAmount;
  
  console.log("Quote ID:", quoteId);
  console.log("Token Amount:", hre.ethers.formatEther(tokenAmount), "ETH");
  
  // Check quote details
  console.log("\n📋 Checking quote details...");
  const quote = await gateway.priceQuotes(quoteId);
  
  console.log("Quote token:", quote.token);
  console.log("Quote USD amount:", Number(quote.usdAmount) / 100, "USD");
  console.log("Quote token amount:", hre.ethers.formatEther(quote.tokenAmount), "ETH");
  console.log("Quote is used:", quote.isUsed);
  console.log("Quote valid until:", new Date(Number(quote.validUntil) * 1000).toISOString());
  console.log("Current time:", new Date().toISOString());
  
  const now = Math.floor(Date.now() / 1000);
  if (now > Number(quote.validUntil)) {
    console.log("⚠️  WARNING: Quote has EXPIRED!");
  }
  
  // Step 2: Try payment with detailed error handling
  console.log("\n💳 Step 2: Attempting payment...");
  console.log("Merchant:", merchant.address);
  console.log("Customer:", customer.address);
  console.log("Amount to send:", hre.ethers.formatEther(tokenAmount), "ETH");
  
  try {
    // Estimate gas first
    console.log("\n🔍 Estimating gas...");
    const gasEstimate = await gateway.connect(customer).processETHPaymentWithQuote.estimateGas(
      quoteId,
      merchant.address,
      "ORDER-TEST-001",
      { value: tokenAmount }
    );
    console.log("✅ Gas estimate:", gasEstimate.toString());
    
    // Try the actual transaction
    console.log("\n🔍 Sending transaction...");
    const payTx = await gateway.connect(customer).processETHPaymentWithQuote(
      quoteId,
      merchant.address,
      "ORDER-TEST-001",
      { value: tokenAmount }
    );
    
    console.log("⏳ Waiting for confirmation...");
    const payReceipt = await payTx.wait();
    console.log("✅ Payment successful! Tx:", payReceipt.hash);
    
  } catch (error) {
    console.log("\n❌ PAYMENT FAILED!");
    console.log("Error message:", error.message);
    
    // Try to decode the error
    if (error.data) {
      console.log("\n🔍 Error data:", error.data);
      
      // Try to decode custom errors
      const errorSelectors = {
        "0xfb8f41b2": "InvalidAddress()",
        "0xf4d678b8": "InvalidAmount()",
        "0x3204506f": "InvalidPriceFeed()",
        "0xd81b2f2e": "PriceFeedError()",
        "0xa24a13a6": "TokenNotSupported()",
        "0x356680b7": "InsufficientBalance()",
        "0x90b8ec18": "TransferFailed()",
        "0x07ed6ee6": "PriceDeviationTooHigh()",
        "0xc184c27b": "BothOraclesFailed()",
        "0x0819bdcd": "QuoteExpired()",
        "0x1c18f846": "QuoteAlreadyUsed()",
        "0x742c5c42": "QuoteNotFound()",
        "0x5c6d5425": "InvalidQuote()",
        "0x1c18bddb": "AmountMismatch()"
      };
      
      const selector = error.data.slice(0, 10);
      if (errorSelectors[selector]) {
        console.log("🎯 DECODED ERROR:", errorSelectors[selector]);
      } else {
        console.log("Unknown error selector:", selector);
      }
    }
    
    // Try staticCall to see what would happen
    console.log("\n🔍 Testing with staticCall...");
    try {
      await gateway.connect(customer).processETHPaymentWithQuote.staticCall(
        quoteId,
        merchant.address,
        "ORDER-TEST-001",
        { value: tokenAmount }
      );
      console.log("✅ staticCall succeeded (weird!)");
    } catch (staticError) {
      console.log("❌ staticCall also failed:", staticError.message);
      if (staticError.data) {
        const selector = staticError.data.slice(0, 10);
        const errorName = errorSelectors[selector] || "Unknown";
        console.log("staticCall error:", errorName);
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
