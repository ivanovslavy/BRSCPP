const hre = require("hardhat");

async function main() {
  console.log("\n🧪 END-TO-END PAYMENT TEST");
  
  const gatewayAddress = "0x1378329ABE689594355a95bDAbEaBF015ef9CF39";
  const merchantAddress = "0x2786e48814C2E562A92aE53187b848DBB312d1a4";
  const usdAmount = 2500; // $25.00 in cents
  const orderId = "E2E-TEST-" + Date.now();
  
  const [customer] = await hre.ethers.getSigners();
  console.log("Customer:", customer.address);
  console.log("Merchant:", merchantAddress);
  console.log("Order ID:", orderId);
  console.log("USD Amount: $" + (usdAmount / 100).toFixed(2));
  
  const gateway = await hre.ethers.getContractAt(
    "CryptoPaymentGateway",
    gatewayAddress,
    customer
  );
  
  // STEP 1: Lock quote
  console.log("\n📝 Step 1: Locking price quote...");
  const quoteTx = await gateway.lockPriceQuote(
    hre.ethers.ZeroAddress, // ETH
    usdAmount
  );
  
  console.log("Quote TX:", quoteTx.hash);
  const quoteReceipt = await quoteTx.wait();
  console.log("✅ Quote locked in block", quoteReceipt.blockNumber);
  
  // Parse quote event
  let quoteId, tokenAmount, validUntil;
  for (const log of quoteReceipt.logs) {
    try {
      const parsed = gateway.interface.parseLog({
        topics: log.topics,
        data: log.data
      });
      
      if (parsed.name === 'PriceQuoteGenerated') {
        quoteId = parsed.args[0];
        tokenAmount = parsed.args[3];
        validUntil = parsed.args[5];
        
        console.log("\n💡 Quote Details:");
        console.log("  Quote ID:", quoteId);
        console.log("  Token Amount:", hre.ethers.formatEther(tokenAmount), "ETH");
        console.log("  Valid Until:", new Date(Number(validUntil) * 1000).toISOString());
        console.log("  Time left:", Math.floor((Number(validUntil) * 1000 - Date.now()) / 1000), "seconds");
        break;
      }
    } catch (e) {}
  }
  
  if (!quoteId) {
    console.error("❌ Failed to get quote ID");
    return;
  }
  
  // STEP 2: Process payment (immediately)
  console.log("\n💰 Step 2: Processing payment...");
  console.log("Sending", hre.ethers.formatEther(tokenAmount), "ETH");
  
  const paymentTx = await gateway.processETHPaymentWithQuote(
    quoteId,
    merchantAddress,
    orderId,
    { value: tokenAmount }
  );
  
  console.log("Payment TX:", paymentTx.hash);
  console.log("⏳ Waiting for confirmation...");
  
  const paymentReceipt = await paymentTx.wait();
  console.log("✅ Payment confirmed in block", paymentReceipt.blockNumber);
  console.log("Gas used:", paymentReceipt.gasUsed.toString());
  
  // Parse payment event
  for (const log of paymentReceipt.logs) {
    try {
      const parsed = gateway.interface.parseLog({
        topics: log.topics,
        data: log.data
      });
      
      if (parsed.name === 'PaymentProcessed') {
        console.log("\n🎉 PaymentProcessed Event:");
        console.log("  Payment ID:", parsed.args.paymentId.toString());
        console.log("  Quote ID:", parsed.args.quoteId);
        console.log("  Merchant:", parsed.args.merchant);
        console.log("  Customer:", parsed.args.customer);
        console.log("  Token:", parsed.args.token);
        console.log("  Total Amount:", hre.ethers.formatEther(parsed.args.totalAmount), "ETH");
        console.log("  Merchant Amount:", hre.ethers.formatEther(parsed.args.merchantAmount), "ETH");
        console.log("  Fee Amount:", hre.ethers.formatEther(parsed.args.feeAmount), "ETH");
        console.log("  USD Amount: $" + (Number(parsed.args.usdAmount) / 100).toFixed(2));
        console.log("  Order ID:", parsed.args.orderId);
        console.log("  Timestamp:", new Date(Number(parsed.args.timestamp) * 1000).toISOString());
      }
    } catch (e) {}
  }
  
  console.log("\n✅ E2E TEST COMPLETED!");
  console.log("\n📊 Check Event Listener logs:");
  console.log("   sudo journalctl -u brscpp-listener.service -f");
  console.log("\n📊 Verify in database:");
  console.log("   psql brscpp -c \"SELECT * FROM payments WHERE order_id = '" + orderId + "';\"");
  console.log("\n📊 Check webhook delivery:");
  console.log("   psql brscpp -c \"SELECT * FROM webhook_deliveries ORDER BY created_at DESC LIMIT 1;\"");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
