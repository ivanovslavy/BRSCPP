const hre = require("hardhat");

async function main() {
  console.log("\n💰 TEST PAYMENT PROCESSING");
  
  // Config
  const gatewayAddress = "0x1378329ABE689594355a95bDAbEaBF015ef9CF39";
  const merchantAddress = "0x2786e48814C2E562A92aE53187b848DBB312d1a4";
  
  // SET THESE FROM API RESPONSES:
  const quoteId = "0x48e339722998a4f7100f12aae1a67a9349dea8393c3b69e477d037a8edd612ce"; // ← PASTE quote ID here
  const orderId = "TEST-E2E-001";
  const ethAmount = "25"; // ← PASTE tokenAmount here
  
  const [customer] = await hre.ethers.getSigners();
  console.log("Customer:", customer.address);
  console.log("Merchant:", merchantAddress);
  console.log("Quote ID:", quoteId);
  console.log("Order ID:", orderId);
  console.log("ETH Amount:", ethAmount);
  
  const gateway = await hre.ethers.getContractAt(
    "CryptoPaymentGateway",
    gatewayAddress,
    customer
  );
  
  // Check quote
  const quote = await gateway.priceQuotes(quoteId);
  console.log("\nQuote Details:");
  console.log("  Token:", quote.token);
  console.log("  USD:", quote.usdAmount.toString());
  console.log("  Token Amount:", hre.ethers.formatEther(quote.tokenAmount));
  console.log("  Valid Until:", new Date(Number(quote.validUntil) * 1000).toISOString());
  console.log("  Is Used:", quote.isUsed);
  
  if (quote.isUsed) {
    console.log("❌ Quote already used!");
    return;
  }
  
  if (Date.now() > Number(quote.validUntil) * 1000) {
    console.log("❌ Quote expired!");
    return;
  }
  
  // Process payment
  console.log("\n📤 Processing payment...");
  const tx = await gateway.processETHPaymentWithQuote(
    quoteId,
    merchantAddress,
    orderId,
    { value: quote.tokenAmount }
  );
  
  console.log("Transaction sent:", tx.hash);
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await tx.wait();
  console.log("✅ Payment processed!");
  console.log("Block:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
  
  // Parse events
  for (const log of receipt.logs) {
    try {
      const parsed = gateway.interface.parseLog({
        topics: log.topics,
        data: log.data
      });
      
      if (parsed.name === 'PaymentProcessed') {
        console.log("\n💰 PaymentProcessed Event:");
        console.log("  Payment ID:", parsed.args.paymentId.toString());
        console.log("  Quote ID:", parsed.args.quoteId);
        console.log("  Merchant:", parsed.args.merchant);
        console.log("  Customer:", parsed.args.customer);
        console.log("  Order ID:", parsed.args.orderId);
        console.log("  USD Amount:", (Number(parsed.args.usdAmount) / 100).toFixed(2));
      }
    } catch (e) {}
  }
  
  console.log("\n✅ Test payment completed!");
  console.log("Check Event Listener logs for webhook delivery.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
