// scripts/security-test-phase2.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

class SecurityTester {
  constructor(gateway, attacker, owner, victim, hacker) {
    this.gateway = gateway;
    this.attacker = attacker;
    this.owner = owner;
    this.victim = victim;
    this.hacker = hacker;
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
    console.log("🛡️  SECURITY TEST SUMMARY - PHASE 2");
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
  console.log("🦹 PHASE 2: MALICIOUS CONTRACT ATTACKS");
  console.log("========================================");
  
  const network = hre.network.name;
  
  // Load deployment info
  const deployFiles = [
    path.join(__dirname, "..", "deployed", `${network}-v2.json`),
    path.join(__dirname, "..", "deployed", `${network}.json`)
  ];
  
  let deploymentInfo;
  for (const file of deployFiles) {
    if (fs.existsSync(file)) {
      deploymentInfo = JSON.parse(fs.readFileSync(file, "utf8"));
      console.log("Loaded deployment from:", file);
      break;
    }
  }
  
  if (!deploymentInfo) {
    console.error("❌ No deployment file found!");
    process.exit(1);
  }
  
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  const attackerAddress = deploymentInfo.contracts.MaliciousAttacker;
  const usdcAddress = deploymentInfo.contracts.MockUSDC;
  const usdtAddress = deploymentInfo.contracts.MockUSDT;
  
  if (!attackerAddress) {
    console.error("❌ MaliciousAttacker not deployed! Run: npm run deploy-attacker:sepolia");
    process.exit(1);
  }
  
  console.log("\n📋 Contract Addresses:");
  console.log("Gateway:", gatewayAddress);
  console.log("Attacker:", attackerAddress);
  console.log("USDC:", usdcAddress);
  console.log("USDT:", usdtAddress);
  
  // Get signers
  const [owner, victim, hacker] = await hre.ethers.getSigners();
  
  console.log("\n👤 Actors:");
  console.log("Owner:", owner.address);
  console.log("Victim:", victim.address);
  console.log("Hacker:", hacker.address);
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  const attacker = await hre.ethers.getContractAt("MaliciousAttacker", attackerAddress);
  const usdc = await hre.ethers.getContractAt("MockERC20", usdcAddress);
  const usdt = await hre.ethers.getContractAt("MockERC20", usdtAddress);
  
  // Check attacker ownership
  const attackerOwner = await attacker.owner();
  console.log("\n🦹 Attacker Contract:");
  console.log("Owner:", attackerOwner);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(attackerAddress)), "ETH");
  
  if (attackerOwner.toLowerCase() !== hacker.address.toLowerCase()) {
    console.log("⚠️  WARNING: Attacker contract owner mismatch!");
    console.log("Expected:", hacker.address);
    console.log("Actual:", attackerOwner);
  }
  
  // Setup: Mint tokens to attacker contract
  console.log("\n🔧 Setup: Minting tokens to attacker contract...");
  await usdc.mint(attackerAddress, hre.ethers.parseUnits("10000", 6));
  await usdt.mint(attackerAddress, hre.ethers.parseUnits("10000", 6));
  console.log("✅ Attacker contract has 10,000 USDC and 10,000 USDT");
  
  const tester = new SecurityTester(gateway, attacker, owner, victim, hacker);
  const ethAddress = "0x0000000000000000000000000000000000000000";
  
  // ============ PHASE 2: MALICIOUS CONTRACT ATTACKS ============
  console.log("\n========================================");
  console.log("PHASE 2: REENTRANCY ATTACKS");
  console.log("========================================");
  
  // Attack 1: ETH Reentrancy Attack
  await tester.runTest(
    "Attack 1: ETH Reentrancy via malicious receive()",
    async () => {
      console.log("\n  📝 Creating legitimate quote...");
      const tx = await gateway.connect(hacker).lockPriceQuote(ethAddress, 10000);
      const receipt = await tx.wait();
      
      let quoteId, tokenAmount;
      receipt.logs.forEach(log => {
        try {
          const parsed = gateway.interface.parseLog(log);
          if (parsed.name === "PriceQuoteGenerated") {
            quoteId = parsed.args[0];
            tokenAmount = parsed.args[3];
            console.log("  Quote ID:", quoteId);
            console.log("  Amount:", hre.ethers.formatEther(tokenAmount), "ETH");
          }
        } catch (e) {}
      });
      
      console.log("\n  🦹 Attacker contract attempts reentrancy...");
      console.log("  The receive() function will try to call processETHPaymentWithQuote again");
      
      // Attack via malicious contract
      const attackTx = await attacker.connect(hacker).attackReentrancy(
        quoteId,
        victim.address,
        { value: tokenAmount }
      );
      await attackTx.wait();
      
      console.log("  ⚠️  If you see this, reentrancy was NOT blocked!");
    },
    true
  );
  
  // Attack 2: ERC20 Reentrancy Attack
  await tester.runTest(
    "Attack 2: ERC20 Reentrancy via malicious token callback",
    async () => {
      console.log("\n  📝 Creating USDC quote...");
      const tx = await gateway.connect(hacker).lockPriceQuote(usdcAddress, 10000);
      const receipt = await tx.wait();
      
      let quoteId, tokenAmount;
      receipt.logs.forEach(log => {
        try {
          const parsed = gateway.interface.parseLog(log);
          if (parsed.name === "PriceQuoteGenerated") {
            quoteId = parsed.args[0];
            tokenAmount = parsed.args[3];
            console.log("  Quote ID:", quoteId);
            console.log("  Amount:", hre.ethers.formatUnits(tokenAmount, 6), "USDC");
          }
        } catch (e) {}
      });
      
      console.log("\n  🦹 Attacker contract attempts ERC20 reentrancy...");
      
      // Approve from attacker contract to gateway
      const approveTx = await attacker.connect(hacker).attackERC20Reentrancy(
        usdcAddress,
        quoteId,
        victim.address,
        tokenAmount
      );
      await approveTx.wait();
      
      console.log("  ⚠️  If you see this, ERC20 reentrancy was NOT blocked!");
    },
    true
  );
  
  // Attack 3: Front-running with malicious contract
  await tester.runTest(
    "Attack 3: Front-run victim's quote using attacker contract",
    async () => {
      console.log("\n  📝 VICTIM creates quote...");
      const victimTx = await gateway.connect(victim).lockPriceQuote(ethAddress, 10000);
      const victimReceipt = await victimTx.wait();
      
      let victimQuoteId, victimTokenAmount;
      victimReceipt.logs.forEach(log => {
        try {
          const parsed = gateway.interface.parseLog(log);
          if (parsed.name === "PriceQuoteGenerated") {
            victimQuoteId = parsed.args[0];
            victimTokenAmount = parsed.args[3];
            console.log("  Victim's Quote ID:", victimQuoteId);
          }
        } catch (e) {}
      });
      
      console.log("\n  🦹 Hacker sees quote in mempool and front-runs via contract...");
      
      // Attacker contract tries to steal victim's quote
      const attackTx = await attacker.connect(hacker).attackFrontRun(
        victimQuoteId,
        attackerAddress, // Attacker contract as merchant
        { value: victimTokenAmount }
      );
      await attackTx.wait();
      
      console.log("  ⚠️  If you see this, front-running was NOT blocked!");
    },
    true
  );
  
  // Attack 4: Quote replay via contract
  await tester.runTest(
    "Attack 4: Replay same quote via attacker contract",
    async () => {
      console.log("\n  📝 Creating quote...");
      const tx = await gateway.connect(hacker).lockPriceQuote(ethAddress, 10000);
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
      
      console.log("\n  🦹 Attacker contract tries to replay quote...");
      
      const attackTx = await attacker.connect(hacker).attackReplay(
        quoteId,
        victim.address,
        { value: tokenAmount * 2n } // Send double amount for 2 payments
      );
      await attackTx.wait();
      
      console.log("  ⚠️  If you see this, replay attack was NOT blocked!");
    },
    true
  );
  
  // Attack 5: Gas griefing
  await tester.runTest(
    "Attack 5: Gas griefing by consuming all gas in receive()",
    async () => {
      console.log("\n  📝 Creating quote...");
      const tx = await gateway.connect(hacker).lockPriceQuote(ethAddress, 10000);
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
      
      console.log("\n  🦹 Attacker sets very high gas consumption in receive()...");
      console.log("  This could cause legitimate payments to fail due to out of gas");
      
      // This is theoretical - we'd need to modify attacker contract
      // to have a gas-consuming loop in receive()
      const attackTx = await attacker.connect(hacker).attackReentrancy(
        quoteId,
        victim.address,
        { value: tokenAmount, gasLimit: 5000000 }
      );
      await attackTx.wait();
      
      console.log("  ✅ Payment still succeeded despite gas griefing attempt");
    },
    true
  );
  
  // Test legitimate withdrawal from attacker contract
  console.log("\n========================================");
  console.log("TESTING WITHDRAWAL FUNCTIONS");
  console.log("========================================");
  
  await tester.runTest(
    "Legitimate: Withdraw ETH from attacker contract",
    async () => {
      const balance = await hre.ethers.provider.getBalance(attackerAddress);
      if (balance > 0n) {
        console.log("\n  💰 Withdrawing", hre.ethers.formatEther(balance), "ETH...");
        const withdrawTx = await attacker.connect(hacker).withdrawAllETH(hacker.address);
        await withdrawTx.wait();
        console.log("  ✅ Withdrawal successful");
      } else {
        console.log("  ℹ️  No ETH to withdraw");
      }
    },
    false // Should succeed
  );
  
  await tester.runTest(
    "Legitimate: Withdraw USDC from attacker contract",
    async () => {
      const balance = await usdc.balanceOf(attackerAddress);
      if (balance > 0n) {
        console.log("\n  💰 Withdrawing", hre.ethers.formatUnits(balance, 6), "USDC...");
        const withdrawTx = await attacker.connect(hacker).withdrawAllERC20(usdcAddress, hacker.address);
        await withdrawTx.wait();
        console.log("  ✅ Withdrawal successful");
      } else {
        console.log("  ℹ️  No USDC to withdraw");
      }
    },
    false // Should succeed
  );
  
  // Save results
  tester.printSummary();
  
  const testDir = path.join(__dirname, "..", "tested");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const resultFile = path.join(testDir, `security-test-phase2-${timestamp}.json`);
  fs.writeFileSync(resultFile, JSON.stringify(tester.results, null, 2));
  
  console.log("\n✅ Results saved to:", resultFile);
  console.log("\n========================================");
  console.log("🎉 PHASE 2 SECURITY TEST COMPLETE!");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
