// scripts/security-test.js - MASTER SECURITY TEST SUITE

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

class SecurityTester {
  constructor(gateway, attacker, victim, tokens) {
    this.gateway = gateway;
    this.attacker = attacker;
    this.victim = victim;
    this.tokens = tokens;
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      attacks: []
    };
  }

  async runTest(name, attackFn, shouldFail = true) {
    this.results.totalTests++;
    console.log(`\n🔍 TEST: ${name}`);
    console.log("Expected outcome:", shouldFail ? "❌ ATTACK BLOCKED" : "✅ ALLOWED");
    
    try {
      await attackFn();
      
      if (shouldFail) {
        console.log("⚠️  VULNERABILITY FOUND! Attack succeeded when it should have failed!");
        this.results.failed++;
        this.results.attacks.push({
          name,
          status: "VULNERABLE",
          severity: "CRITICAL",
          description: "Attack succeeded - security breach!"
        });
      } else {
        console.log("✅ Test passed - action allowed as expected");
        this.results.passed++;
        this.results.attacks.push({
          name,
          status: "PASSED",
          description: "Legitimate action worked correctly"
        });
      }
    } catch (error) {
      if (shouldFail) {
        console.log("✅ Attack blocked! Error:", error.message.split('\n')[0]);
        this.results.passed++;
        this.results.attacks.push({
          name,
          status: "SECURE",
          description: "Attack properly blocked",
          error: error.message.split('\n')[0]
        });
      } else {
        console.log("❌ Test failed - legitimate action was blocked!");
        this.results.failed++;
        this.results.attacks.push({
          name,
          status: "FAILED",
          description: "Legitimate action blocked incorrectly",
          error: error.message
        });
      }
    }
  }

  printSummary() {
    console.log("\n========================================");
    console.log("🛡️  SECURITY TEST SUMMARY");
    console.log("========================================");
    console.log("Total Tests:", this.results.totalTests);
    console.log("✅ Passed:", this.results.passed);
    console.log("❌ Failed:", this.results.failed);
    console.log("Security Score:", 
      ((this.results.passed / this.results.totalTests) * 100).toFixed(2) + "%");
    
    const vulnerabilities = this.results.attacks.filter(a => a.status === "VULNERABLE");
    if (vulnerabilities.length > 0) {
      console.log("\n⚠️  VULNERABILITIES FOUND:");
      vulnerabilities.forEach(v => {
        console.log(`  - ${v.name}: ${v.description}`);
      });
    } else {
      console.log("\n🎉 NO VULNERABILITIES FOUND!");
    }
  }
}

async function main() {
  console.log("\n========================================");
  console.log("🛡️  COMPREHENSIVE SECURITY TEST");
  console.log("========================================");
  
  const network = hre.network.name;
  const deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  const deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  const usdcAddress = deploymentInfo.contracts.MockUSDC;
  
  // Get signers
  const [owner, legitimate, hacker] = await hre.ethers.getSigners();
  
  console.log("Owner:", owner.address);
  console.log("Legitimate User:", legitimate.address);
  console.log("Hacker:", hacker.address);
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  const usdc = await hre.ethers.getContractAt("MockERC20", usdcAddress);
  
  // Setup
  console.log("\n🔧 Setup: Minting tokens to hacker...");
  await usdc.mint(hacker.address, hre.ethers.parseUnits("10000", 6));
  console.log("✅ Hacker has 10,000 USDC");
  
  const tester = new SecurityTester(gateway, hacker, legitimate, { usdc });
  const ethAddress = "0x0000000000000000000000000000000000000000";
  
  // ============ PHASE 1: BASIC ATTACKS ============
  console.log("\n========================================");
  console.log("PHASE 1: BASIC WALLET ATTACKS");
  console.log("========================================");
  
  // Attack 1: Unauthorized owner functions
  await tester.runTest(
    "Attack 1: Non-owner tries to update fee percentage",
    async () => {
      await gateway.connect(hacker).updateFeePercentage(9999); // Try to set 99.99% fee
    },
    true // Should fail
  );
  
  // Attack 2: Unauthorized fee collector change
  await tester.runTest(
    "Attack 2: Hacker tries to change fee collector to himself",
    async () => {
      await gateway.connect(hacker).updateFeeCollector(hacker.address);
    },
    true
  );
  
  // Attack 3: Quote replay attack
  await tester.runTest(
    "Attack 3: Replay same quote twice",
    async () => {
      // Lock a quote
      const tx = await gateway.lockPriceQuote(ethAddress, 10000);
      const receipt = await tx.wait();
      
      let quoteId;
      receipt.logs.forEach(log => {
        try {
          const parsed = gateway.interface.parseLog(log);
          if (parsed.name === "PriceQuoteGenerated") {
            quoteId = parsed.args[0];
          }
        } catch (e) {}
      });
      
      // Use it once
      const quote = await gateway.priceQuotes(quoteId);
      await gateway.connect(hacker).processETHPaymentWithQuote(
        quoteId,
        legitimate.address,
        "ORDER-1",
        { value: quote.tokenAmount }
      );
      
      // Try to use again (REPLAY ATTACK)
      await gateway.connect(hacker).processETHPaymentWithQuote(
        quoteId,
        legitimate.address,
        "ORDER-2",
        { value: quote.tokenAmount }
      );
    },
    true
  );
  
  // Attack 4: Expired quote usage
  await tester.runTest(
    "Attack 4: Use expired quote",
    async () => {
      const tx = await gateway.lockPriceQuote(ethAddress, 10000);
      const receipt = await tx.wait();
      
      let quoteId;
      receipt.logs.forEach(log => {
        try {
          const parsed = gateway.interface.parseLog(log);
          if (parsed.name === "PriceQuoteGenerated") {
            quoteId = parsed.args[0];
          }
        } catch (e) {}
      });
      
      // Wait for expiration (simulate by checking)
      const quote = await gateway.priceQuotes(quoteId);
      
      // Fast forward time simulation - use quote after validity
      await hre.network.provider.send("evm_increaseTime", [3600]); // 1 hour
      await hre.network.provider.send("evm_mine");
      
      await gateway.connect(hacker).processETHPaymentWithQuote(
        quoteId,
        legitimate.address,
        "ORDER-EXPIRED",
        { value: quote.tokenAmount }
      );
    },
    true
  );
  
  // Attack 5: Amount mismatch
  await tester.runTest(
    "Attack 5: Send wrong ETH amount",
    async () => {
      const tx = await gateway.lockPriceQuote(ethAddress, 10000);
      const receipt = await tx.wait();
      
      let quoteId, tokenAmount;
      receipt.logs.forEach(log => {
        try {
          const parsed = gateway.interface.parseLog(log);
          if (parsed.name === "PriceQuoteGenerated") {
            quoteId = parsed.args[0];
            tokenAmount = parsed.args[3];
          }
        } catch (e) {}
      });
      
      // Send LESS than required
      await gateway.connect(hacker).processETHPaymentWithQuote(
        quoteId,
        legitimate.address,
        "ORDER-UNDERPAY",
        { value: tokenAmount / 2n }
      );
    },
    true
  );
  
  // Attack 6: Pay to address(0)
  await tester.runTest(
    "Attack 6: Try to pay to zero address",
    async () => {
      const tx = await gateway.lockPriceQuote(ethAddress, 10000);
      const receipt = await tx.wait();
      
      let quoteId, tokenAmount;
      receipt.logs.forEach(log => {
        try {
          const parsed = gateway.interface.parseLog(log);
          if (parsed.name === "PriceQuoteGenerated") {
            quoteId = parsed.args[0];
            tokenAmount = parsed.args[3];
          }
        } catch (e) {}
      });
      
      await gateway.connect(hacker).processETHPaymentWithQuote(
        quoteId,
        "0x0000000000000000000000000000000000000000", // Zero address
        "ORDER-ZERO",
        { value: tokenAmount }
      );
    },
    true
  );
  
  // Attack 7: Pause contract without permission
  await tester.runTest(
    "Attack 7: Non-owner tries to pause contract",
    async () => {
      await gateway.connect(hacker).pause();
    },
    true
  );
  
  // Attack 8: Emergency withdraw without permission
  await tester.runTest(
    "Attack 8: Unauthorized emergency withdraw",
    async () => {
      await gateway.connect(hacker).emergencyWithdraw(
        ethAddress,
        hre.ethers.parseEther("1"),
        hacker.address
      );
    },
    true
  );
  
  // Attack 9: Token payment without approval
  await tester.runTest(
    "Attack 9: Pay with ERC20 without approval",
    async () => {
      const tx = await gateway.lockPriceQuote(usdcAddress, 10000);
      const receipt = await tx.wait();
      
      let quoteId;
      receipt.logs.forEach(log => {
        try {
          const parsed = gateway.interface.parseLog(log);
          if (parsed.name === "PriceQuoteGenerated") {
            quoteId = parsed.args[0];
          }
        } catch (e) {}
      });
      
      // DON'T approve - try to pay directly
      await gateway.connect(hacker).processTokenPaymentWithQuote(
        quoteId,
        legitimate.address,
        "ORDER-NOAPPROVAL"
      );
    },
    true
  );
  
  // Attack 10: Manipulate oracle (try to add fake oracle)
  await tester.runTest(
    "Attack 10: Non-owner tries to add malicious oracle",
    async () => {
      await gateway.connect(hacker).addSecondaryOracle(
        ethAddress,
        hacker.address // Malicious "oracle"
      );
    },
    true
  );
  
  // Attack 11: Front-running simulation
  await tester.runTest(
    "Attack 11: Front-run legitimate transaction",
    async () => {
      // Victim locks quote
      const victimTx = await gateway.connect(legitimate).lockPriceQuote(ethAddress, 10000);
      const victimReceipt = await victimTx.wait();
      
      let quoteId, tokenAmount;
      victimReceipt.logs.forEach(log => {
        try {
          const parsed = gateway.interface.parseLog(log);
          if (parsed.name === "PriceQuoteGenerated") {
            quoteId = parsed.args[0];
            tokenAmount = parsed.args[3];
          }
        } catch (e) {}
      });
      
      // Hacker sees this in mempool and tries to use the same quoteId
      await gateway.connect(hacker).processETHPaymentWithQuote(
        quoteId,
        hacker.address, // Hacker as merchant
        "ORDER-FRONTRUN",
        { value: tokenAmount }
      );
    },
    true // Should fail - quote is tied to msg.sender
  );
  
  // Attack 12: Integer overflow attempt
  await tester.runTest(
    "Attack 12: Try to cause integer overflow with huge amount",
    async () => {
      const maxUint = hre.ethers.MaxUint256;
      await gateway.lockPriceQuote(ethAddress, maxUint);
    },
    true
  );
  
  // Save results
  tester.printSummary();
  
  const testDir = path.join(__dirname, "..", "tested");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const resultFile = path.join(testDir, `security-test-${timestamp}.json`);
  fs.writeFileSync(resultFile, JSON.stringify(tester.results, null, 2));
  
  console.log("\n✅ Results saved to:", resultFile);
  console.log("\n========================================");
  console.log("🎉 SECURITY TEST COMPLETE!");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
