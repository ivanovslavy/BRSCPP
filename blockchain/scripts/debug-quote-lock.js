// scripts/debug-quote-lock.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("🔍 DEBUG QUOTE LOCK");
  console.log("========================================");
  
  const deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  
  const signers = await hre.ethers.getSigners();
  const merchant = signers[0];
  
  console.log("Gateway:", gatewayAddress);
  console.log("Signer:", merchant.address);
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  const ethAddress = "0x0000000000000000000000000000000000000000";
  
  // Lock quote
  console.log("\n📝 Locking quote for $200...");
  const usdAmount = 20000;
  
  const tx = await gateway.lockPriceQuote(ethAddress, usdAmount);
  console.log("Transaction sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed");
  console.log("Status:", receipt.status);
  console.log("Gas used:", receipt.gasUsed.toString());
  
  // Print ALL logs
  console.log("\n📋 ALL LOGS:");
  console.log("Total logs:", receipt.logs.length);
  
  receipt.logs.forEach((log, index) => {
    console.log(`\nLog ${index}:`);
    console.log("  Address:", log.address);
    console.log("  Topics:", log.topics);
    console.log("  Data:", log.data);
    
    // Try to parse
    try {
      const parsed = gateway.interface.parseLog({
        topics: log.topics,
        data: log.data
      });
      console.log("  ✅ Parsed event:", parsed.name);
      console.log("  Args:", parsed.args);
    } catch (e) {
      console.log("  ⚠️  Could not parse with gateway interface");
    }
  });
  
  // Check if lockPriceQuote returns anything
  console.log("\n🔍 Calling lockPriceQuote with callStatic...");
  try {
    const result = await gateway.lockPriceQuote.staticCall(ethAddress, usdAmount);
    console.log("Function returns:");
    console.log("  Quote ID:", result[0]);
    console.log("  Token Amount:", hre.ethers.formatEther(result[1]), "ETH");
    console.log("  Valid Until:", new Date(Number(result[2]) * 1000).toISOString());
    
    const quoteId = result[0];
    
    // Check the quote
    console.log("\n📋 Checking quote details...");
    const quote = await gateway.priceQuotes(quoteId);
    console.log("Token:", quote.token);
    console.log("USD Amount:", Number(quote.usdAmount) / 100, "USD");
    console.log("Token Amount:", hre.ethers.formatEther(quote.tokenAmount), "ETH");
    console.log("Token Price:", Number(quote.tokenPriceUSD) / 1e8, "USD");
    console.log("Valid Until:", new Date(Number(quote.validUntil) * 1000).toISOString());
    console.log("Is Used:", quote.isUsed);
    console.log("Created At:", new Date(Number(quote.createdAt) * 1000).toISOString());
    
    // Now try payment
    console.log("\n💳 Testing payment with this quote...");
    const customer = signers.length > 1 ? signers[1] : signers[0];
    console.log("Customer:", customer.address);
    console.log("Merchant:", merchant.address);
    
    try {
      // First try staticCall
      console.log("\n🔍 Testing with staticCall first...");
      await gateway.connect(customer).processETHPaymentWithQuote.staticCall(
        quoteId,
        merchant.address,
        "ORDER-DEBUG-001",
        { value: quote.tokenAmount }
      );
      console.log("✅ staticCall succeeded!");
      
      // Now real transaction
      console.log("\n🔍 Sending real transaction...");
      const payTx = await gateway.connect(customer).processETHPaymentWithQuote(
        quoteId,
        merchant.address,
        "ORDER-DEBUG-001",
        { value: quote.tokenAmount }
      );
      
      const payReceipt = await payTx.wait();
      console.log("✅ PAYMENT SUCCESSFUL!");
      console.log("Tx:", payReceipt.hash);
      
      // Parse payment events
      payReceipt.logs.forEach((log) => {
        try {
          const parsed = gateway.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          if (parsed.name === "PaymentProcessed") {
            console.log("\n🎉 PaymentProcessed Event:");
            console.log("Payment ID:", parsed.args.paymentId.toString());
            console.log("Merchant:", parsed.args.merchant);
            console.log("Customer:", parsed.args.customer);
            console.log("Token Amount:", hre.ethers.formatEther(parsed.args.tokenAmount), "ETH");
            console.log("Merchant Amount:", hre.ethers.formatEther(parsed.args.merchantAmount), "ETH");
            console.log("Fee Amount:", hre.ethers.formatEther(parsed.args.feeAmount), "ETH");
          }
        } catch (e) {
          // Ignore
        }
      });
      
    } catch (error) {
      console.log("\n❌ PAYMENT FAILED!");
      console.log("Error:", error.message);
      
      if (error.data) {
        console.log("Error data:", error.data);
        
        const errorSelectors = {
          "0xfb8f41b2": "InvalidAddress()",
          "0xf4d678b8": "InvalidAmount()",
          "0x0819bdcd": "QuoteExpired()",
          "0x1c18f846": "QuoteAlreadyUsed()",
          "0x742c5c42": "QuoteNotFound()",
          "0x5c6d5425": "InvalidQuote()",
          "0x1c18bddb": "AmountMismatch()"
        };
        
        const selector = error.data.slice(0, 10);
        if (errorSelectors[selector]) {
          console.log("🎯 ERROR:", errorSelectors[selector]);
        }
      }
    }
    
  } catch (error) {
    console.log("❌ staticCall failed:", error.message);
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
