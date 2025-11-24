// scripts/analyze-vulnerabilities.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n========================================");
  console.log("🔍 DETAILED VULNERABILITY ANALYSIS");
  console.log("========================================\n");
  
  const network = hre.network.name;
  const deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  const [owner, victim, hacker] = await hre.ethers.getSigners();
  
  console.log("Gateway:", gatewayAddress);
  console.log("Victim:", victim.address);
  console.log("Hacker:", hacker.address);
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  const ethAddress = "0x0000000000000000000000000000000000000000";
  
  const results = {
    vulnerabilities: []
  };
  
  // ============ VULNERABILITY 1: QUOTE REPLAY ============
  console.log("\n========================================");
  console.log("🚨 VULNERABILITY 1: QUOTE REPLAY ATTACK");
  console.log("========================================\n");
  
  console.log("📋 Description:");
  console.log("Hacker може да използва СЪЩИЯ quote ID два пъти!");
  console.log("Това означава плащане само веднъж, но получаване на стоки/услуги два пъти.\n");
  
  console.log("🔍 Step-by-step demonstration:\n");
  
  // Step 1: Lock a quote
  console.log("Step 1: Hacker locks quote for $100...");
  const tx1 = await gateway.connect(hacker).lockPriceQuote(ethAddress, 10000);
  const receipt1 = await tx1.wait();
  console.log("✅ Quote locked, tx:", receipt1.hash);
  
  let quoteId, tokenAmount;
  receipt1.logs.forEach(log => {
    try {
      const parsed = gateway.interface.parseLog(log);
      if (parsed.name === "PriceQuoteGenerated") {
        quoteId = parsed.args[0];
        tokenAmount = parsed.args[3];
        console.log("\n📝 Quote Details:");
        console.log("  Quote ID:", quoteId);
        console.log("  Token Amount:", hre.ethers.formatEther(tokenAmount), "ETH");
      }
    } catch (e) {}
  });
  
  // Check quote status
  let quote = await gateway.priceQuotes(quoteId);
  console.log("\n📊 Quote Status BEFORE first payment:");
  console.log("  Is Used:", quote.isUsed);
  console.log("  USD Amount:", Number(quote.usdAmount) / 100, "USD");
  
  // Step 2: First payment
  console.log("\nStep 2: Hacker makes FIRST payment...");
  const merchantBalanceBefore = await hre.ethers.provider.getBalance(victim.address);
  
  const tx2 = await gateway.connect(hacker).processETHPaymentWithQuote(
    quoteId,
    victim.address,
    "ORDER-1",
    { value: tokenAmount }
  );
  const receipt2 = await tx2.wait();
  console.log("✅ First payment successful, tx:", receipt2.hash);
  
  const merchantBalanceAfter1 = await hre.ethers.provider.getBalance(victim.address);
  const merchantReceived1 = merchantBalanceAfter1 - merchantBalanceBefore;
  console.log("💰 Merchant received:", hre.ethers.formatEther(merchantReceived1), "ETH");
  
  // Check quote status after first use
  quote = await gateway.priceQuotes(quoteId);
  console.log("\n📊 Quote Status AFTER first payment:");
  console.log("  Is Used:", quote.isUsed);
  
  // Step 3: Try second payment with SAME quote
  console.log("\nStep 3: Hacker tries SECOND payment with SAME quote...");
  console.log("⚠️  This should FAIL but let's see...\n");
  
  try {
    const tx3 = await gateway.connect(hacker).processETHPaymentWithQuote(
      quoteId,
      victim.address,
      "ORDER-2-REPLAY",
      { value: tokenAmount }
    );
    const receipt3 = await tx3.wait();
    
    const merchantBalanceAfter2 = await hre.ethers.provider.getBalance(victim.address);
    const merchantReceived2 = merchantBalanceAfter2 - merchantBalanceAfter1;
    
    console.log("🚨 VULNERABILITY CONFIRMED!");
    console.log("✅ Second payment also successful, tx:", receipt3.hash);
    console.log("💰 Merchant received AGAIN:", hre.ethers.formatEther(merchantReceived2), "ETH");
    
    console.log("\n💥 IMPACT:");
    console.log("  Hacker paid:", hre.ethers.formatEther(tokenAmount * 2n), "ETH TOTAL");
    console.log("  Merchant received:", hre.ethers.formatEther(merchantReceived1 + merchantReceived2), "ETH");
    console.log("  ⚠️  Hacker can potentially get goods/services twice for single payment!");
    
    results.vulnerabilities.push({
      id: "VULN-001",
      name: "Quote Replay Attack",
      severity: "CRITICAL",
      status: "CONFIRMED",
      impact: "Hacker can reuse quote multiple times",
      txHashes: [receipt2.hash, receipt3.hash],
      recommendation: "Check if quote.isUsed BEFORE processing payment"
    });
    
  } catch (error) {
    console.log("✅ SECURE: Second payment was blocked");
    console.log("Error:", error.message.split('\n')[0]);
    
    results.vulnerabilities.push({
      id: "VULN-001",
      name: "Quote Replay Attack",
      severity: "NONE",
      status: "FALSE POSITIVE",
      impact: "None - properly protected"
    });
  }
  
  // ============ VULNERABILITY 2: FRONT-RUNNING ============
  console.log("\n\n========================================");
  console.log("🚨 VULNERABILITY 2: FRONT-RUNNING ATTACK");
  console.log("========================================\n");
  
  console.log("📋 Description:");
  console.log("Hacker може да види victim's transaction в mempool и да я front-run-не.");
  console.log("Ако quoteId не е обвързан със sender-а, hacker може да открадне транзакцията!\n");
  
  console.log("🔍 Step-by-step demonstration:\n");
  
  // Step 1: Victim locks quote
  console.log("Step 1: VICTIM locks quote for $100...");
  const victimTx = await gateway.connect(victim).lockPriceQuote(ethAddress, 10000);
  const victimReceipt = await victimTx.wait();
  console.log("✅ Victim's quote locked, tx:", victimReceipt.hash);
  
  let victimQuoteId, victimTokenAmount;
  victimReceipt.logs.forEach(log => {
    try {
      const parsed = gateway.interface.parseLog(log);
      if (parsed.name === "PriceQuoteGenerated") {
        victimQuoteId = parsed.args[0];
        victimTokenAmount = parsed.args[3];
        console.log("\n📝 Victim's Quote:");
        console.log("  Quote ID:", victimQuoteId);
        console.log("  Token Amount:", hre.ethers.formatEther(victimTokenAmount), "ETH");
      }
    } catch (e) {}
  });
  
  // Step 2: Hacker sees this in mempool
  console.log("\nStep 2: HACKER sees victim's quote in mempool...");
  console.log("Hacker extracts the quoteId from the transaction logs");
  console.log("Hacker now knows: quoteId =", victimQuoteId);
  
  // Step 3: Hacker tries to front-run
  console.log("\nStep 3: HACKER sends transaction with HIGHER GAS to front-run...");
  console.log("Hacker uses VICTIM's quoteId but redirects payment to HIMSELF!\n");
  
  const hackerBalanceBefore = await hre.ethers.provider.getBalance(hacker.address);
  
  try {
    const hackerTx = await gateway.connect(hacker).processETHPaymentWithQuote(
      victimQuoteId, // Victim's quote!
      hacker.address, // But hacker as merchant!
      "ORDER-FRONTRUN",
      { value: victimTokenAmount }
    );
    const hackerReceipt = await hackerTx.wait();
    
    const hackerBalanceAfter = await hre.ethers.provider.getBalance(hacker.address);
    const netChange = hackerBalanceAfter - hackerBalanceBefore;
    
    console.log("🚨 VULNERABILITY CONFIRMED!");
    console.log("✅ Hacker successfully front-ran victim's transaction!");
    console.log("Tx:", hackerReceipt.hash);
    console.log("\n💥 IMPACT:");
    console.log("  Hacker net change:", hre.ethers.formatEther(netChange), "ETH");
    console.log("  ⚠️  Hacker used victim's quote for his own benefit!");
    console.log("  ⚠️  Victim's quote is now CONSUMED and victim cannot use it!");
    
    // Check if victim can still use it
    console.log("\nStep 4: Victim tries to use HIS OWN quote...");
    try {
      await gateway.connect(victim).processETHPaymentWithQuote(
        victimQuoteId,
        victim.address,
        "VICTIM-LEGIT",
        { value: victimTokenAmount }
      );
      console.log("✅ Victim can still use quote (GOOD)");
    } catch (e) {
      console.log("❌ Victim CANNOT use his own quote anymore!");
      console.log("Quote was stolen by front-runner!");
    }
    
    results.vulnerabilities.push({
      id: "VULN-002",
      name: "Front-Running / Quote Theft",
      severity: "CRITICAL",
      status: "CONFIRMED",
      impact: "Attacker can steal victim's quotes and use them",
      txHashes: [victimReceipt.hash, hackerReceipt.hash],
      recommendation: "Bind quoteId to msg.sender who locked it"
    });
    
  } catch (error) {
    console.log("✅ SECURE: Front-running attempt was blocked");
    console.log("Error:", error.message.split('\n')[0]);
    console.log("\nQuote is properly bound to the creator!");
    
    results.vulnerabilities.push({
      id: "VULN-002",
      name: "Front-Running / Quote Theft",
      severity: "NONE",
      status: "FALSE POSITIVE",
      impact: "None - quote properly bound to creator"
    });
  }
  
  // ============ ROOT CAUSE ANALYSIS ============
  console.log("\n\n========================================");
  console.log("📊 ROOT CAUSE ANALYSIS");
  console.log("========================================\n");
  
  const critical = results.vulnerabilities.filter(v => v.severity === "CRITICAL");
  
  if (critical.length > 0) {
    console.log("⚠️  CRITICAL VULNERABILITIES FOUND:", critical.length);
    console.log("\n🔧 RECOMMENDED FIXES:\n");
    
    critical.forEach((vuln, i) => {
      console.log(`${i + 1}. ${vuln.name} (${vuln.id})`);
      console.log(`   Impact: ${vuln.impact}`);
      console.log(`   Fix: ${vuln.recommendation}\n`);
    });
    
    console.log("📝 CODE CHANGES NEEDED:\n");
    console.log("In lockPriceQuote():");
    console.log("  - Store msg.sender in PriceQuote struct");
    console.log("  - Add 'address creator' field\n");
    
    console.log("In processETHPaymentWithQuote() / processTokenPaymentWithQuote():");
    console.log("  - Check: require(quote.creator == msg.sender, 'Not quote creator')");
    console.log("  - Or allow anyone but track who created it\n");
    
    console.log("In _validateAndConsumeQuote():");
    console.log("  - ALREADY marks quote.isUsed = true");
    console.log("  - BUT need to check BEFORE processing payment");
    console.log("  - Move isUsed check EARLIER in the function\n");
    
  } else {
    console.log("✅ NO CRITICAL VULNERABILITIES!");
    console.log("Contract is secure against these attacks.");
  }
  
  // Save detailed report
  const reportDir = path.join(__dirname, "..", "tested");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const reportFile = path.join(reportDir, `vulnerability-analysis-${timestamp}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  
  console.log("========================================");
  console.log("📄 DETAILED REPORT SAVED");
  console.log("========================================");
  console.log("File:", reportFile);
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
