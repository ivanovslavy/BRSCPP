// scripts/test-real-payment.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("🧪 REAL PAYMENT TEST");
  console.log("========================================");
  
  const deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  
  const signers = await hre.ethers.getSigners();
  const merchant = signers[0];
  const customer = signers.length > 1 ? signers[1] : signers[0];
  
  console.log("Gateway:", gatewayAddress);
  console.log("Merchant:", merchant.address);
  console.log("Customer:", customer.address);
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  const ethAddress = "0x0000000000000000000000000000000000000000";
  
  // Step 1: Lock quote and get REAL quoteId from event
  console.log("\n📝 Step 1: Locking quote for $200...");
  const usdAmount = 20000;
  
  const tx = await gateway.lockPriceQuote(ethAddress, usdAmount);
  const receipt = await tx.wait();
  console.log("✅ Quote locked, tx:", receipt.hash);
  
  // Find the REAL quoteId from event
  let quoteId, tokenAmount, validUntil;
  
  receipt.logs.forEach((log) => {
    try {
      const parsed = gateway.interface.parseLog({
        topics: log.topics,
        data: log.data
      });
      if (parsed.name === "PriceQuoteGenerated") {
        quoteId = parsed.args[0];
        tokenAmount = parsed.args[3];
        validUntil = parsed.args[5];
        console.log("\n📋 Quote from event:");
        console.log("Quote ID:", quoteId);
        console.log("Token Amount:", hre.ethers.formatEther(tokenAmount), "ETH");
        console.log("Valid Until:", new Date(Number(validUntil) * 1000).toISOString());
      }
    } catch (e) {
      // Ignore
    }
  });
  
  if (!quoteId) {
    console.log("❌ Could not find quote ID!");
    return;
  }
  
  // Verify quote is stored
  console.log("\n🔍 Verifying quote storage...");
  const storedQuote = await gateway.priceQuotes(quoteId);
  console.log("Stored USD Amount:", Number(storedQuote.usdAmount) / 100, "USD");
  console.log("Stored Token Amount:", hre.ethers.formatEther(storedQuote.tokenAmount), "ETH");
  console.log("Is Used:", storedQuote.isUsed);
  
  if (Number(storedQuote.usdAmount) === 0) {
    console.log("❌ Quote not properly stored!");
    return;
  }
  
  // Step 2: Make payment
  console.log("\n💳 Step 2: Making payment...");
  console.log("Sending", hre.ethers.formatEther(tokenAmount), "ETH");
  
  try {
    const payTx = await gateway.connect(customer).processETHPaymentWithQuote(
      quoteId,
      merchant.address,
      "ORDER-TEST-SUCCESS",
      { value: tokenAmount }
    );
    
    console.log("⏳ Waiting for confirmation...");
    const payReceipt = await payTx.wait();
    console.log("✅ PAYMENT SUCCESSFUL!");
    console.log("Tx:", payReceipt.hash);
    
    // Parse events
    payReceipt.logs.forEach((log) => {
      try {
        const parsed = gateway.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsed.name === "PaymentProcessed") {
          console.log("\n🎉 PaymentProcessed Event:");
          console.log("Payment ID:", parsed.args.paymentId.toString());
          console.log("Token Amount:", hre.ethers.formatEther(parsed.args.tokenAmount), "ETH");
          console.log("Merchant Amount:", hre.ethers.formatEther(parsed.args.merchantAmount), "ETH");
          console.log("Fee Amount:", hre.ethers.formatEther(parsed.args.feeAmount), "ETH");
          console.log("USD Amount:", "$" + (Number(parsed.args.usdAmount) / 100).toFixed(2));
          
          // Verify math
          const fee = parsed.args.tokenAmount * 50n / 10000n; // 0.5%
          const merchantAmt = parsed.args.tokenAmount - fee;
          
          console.log("\n🔬 Math Verification:");
          console.log("Expected Fee:", hre.ethers.formatEther(fee), "ETH");
          console.log("Actual Fee:", hre.ethers.formatEther(parsed.args.feeAmount), "ETH");
          console.log("Match:", fee === parsed.args.feeAmount ? "✅" : "❌");
          
          console.log("Expected Merchant:", hre.ethers.formatEther(merchantAmt), "ETH");
          console.log("Actual Merchant:", hre.ethers.formatEther(parsed.args.merchantAmount), "ETH");
          console.log("Match:", merchantAmt === parsed.args.merchantAmount ? "✅" : "❌");
        }
      } catch (e) {
        // Ignore
      }
    });
    
  } catch (error) {
    console.log("\n❌ PAYMENT FAILED!");
    console.log("Error:", error.message);
    
    if (error.data) {
      const errorSelectors = {
        "0x2c5211c6": "QuoteNotFound()",
        "0x0819bdcd": "QuoteExpired()",
        "0x1c18f846": "QuoteAlreadyUsed()",
        "0x1c18bddb": "AmountMismatch()",
        "0xfb8f41b2": "InvalidAddress()",
        "0xf4d678b8": "InvalidAmount()"
      };
      
      const selector = error.data.slice(0, 10);
      console.log("Error selector:", selector);
      if (errorSelectors[selector]) {
        console.log("🎯 ERROR:", errorSelectors[selector]);
      }
    }
  }
  
  console.log("\n========================================");
  console.log("🏁 TEST COMPLETE");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
