const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

// ============ COLORS FOR CONSOLE ============
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m"
};

const log = {
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'═'.repeat(60)}${colors.reset}`),
  header: (msg) => console.log(`${colors.bright}${colors.cyan}║ ${msg}${colors.reset}`),
  divider: () => console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}`),
  footer: () => console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`),
  
  info: (label, value) => console.log(`  ${colors.gray}${label}:${colors.reset} ${colors.bright}${value}${colors.reset}`),
  success: (msg) => console.log(`  ${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`  ${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`  ${colors.yellow}⚠️  ${msg}${colors.reset}`),
  pending: (msg) => console.log(`  ${colors.blue}⏳ ${msg}${colors.reset}`),
  tx: (hash) => console.log(`  ${colors.magenta}📝 TX: ${hash}${colors.reset}`),
  explorer: (url) => console.log(`  ${colors.gray}🔗 ${url}${colors.reset}`),
  
  step: (num, total, msg) => console.log(`\n  ${colors.bright}[${num}/${total}]${colors.reset} ${colors.yellow}${msg}${colors.reset}`),
  substep: (msg) => console.log(`      ${colors.gray}→ ${msg}${colors.reset}`),
  
  table: (data) => {
    const maxKey = Math.max(...Object.keys(data).map(k => k.length));
    Object.entries(data).forEach(([key, value]) => {
      console.log(`  ${colors.gray}${key.padEnd(maxKey)}${colors.reset} │ ${colors.bright}${value}${colors.reset}`);
    });
  }
};

// ============ TEST CONFIGURATION ============
const TEST_CONFIG = {
  erc20Amount: "10",      // 10 USDC/USDT
  ethUsdAmount: 100,      // $1.00 in cents (will get ~0.0004 ETH at $2500/ETH)
  vipDiscount: 10000,     // 100% discount (10000 basis points)
  gasSettings: {
    amoy: { maxPriorityFeePerGas: "35", maxFeePerGas: "50" },
    bscTestnet: { maxPriorityFeePerGas: "3", maxFeePerGas: "5" },
    sepolia: { maxPriorityFeePerGas: "2", maxFeePerGas: "20" },
    default: { maxPriorityFeePerGas: "2", maxFeePerGas: "20" }
  }
};

// ============ HELPER FUNCTIONS ============
async function getGasSettings(networkName) {
  const settings = TEST_CONFIG.gasSettings[networkName] || TEST_CONFIG.gasSettings.default;
  return {
    maxPriorityFeePerGas: hre.ethers.parseUnits(settings.maxPriorityFeePerGas, "gwei"),
    maxFeePerGas: hre.ethers.parseUnits(settings.maxFeePerGas, "gwei")
  };
}

function getExplorerUrl(networkName, txHash) {
  const explorers = {
    amoy: `https://amoy.polygonscan.com/tx/${txHash}`,
    bscTestnet: `https://testnet.bscscan.com/tx/${txHash}`,
    sepolia: `https://sepolia.etherscan.io/tx/${txHash}`,
    polygon: `https://polygonscan.com/tx/${txHash}`,
    bscMainnet: `https://bscscan.com/tx/${txHash}`,
    mainnet: `https://etherscan.io/tx/${txHash}`
  };
  return explorers[networkName] || `TX: ${txHash}`;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function shortAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ============ MAIN TEST RUNNER ============
async function main() {
  const networkName = hre.network.name;
  const startTime = Date.now();
  
  // ═══════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════
  log.title();
  log.header("🚀 CRYPTO PAYMENT GATEWAY - TEST SUITE v3.1");
  log.divider();
  log.info("Network", networkName);
  log.info("Time", new Date().toLocaleString());
  log.footer();

  // Load signers
  const signers = await hre.ethers.getSigners();
  if (signers.length < 4) {
    log.error("Insufficient accounts! Need at least 4 signers in config.");
    process.exit(1);
  }

  const [owner, customer, merchant, vipMerchant] = signers;

  // Load deployment
  const deployFile = path.join(__dirname, "..", "deployed", `${networkName}-v2.json`);
  if (!fs.existsSync(deployFile)) {
    log.error(`Deployment file not found: ${deployFile}`);
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  
  const gateway = await (await hre.ethers.getContractFactory("CryptoPaymentGateway")).attach(deployment.contracts.gateway);
  const usdc = await (await hre.ethers.getContractFactory("MockERC20")).attach(deployment.contracts.usdc);

  // Get balances
  const customerEthBal = await hre.ethers.provider.getBalance(customer.address);
  const customerUsdcBal = await usdc.balanceOf(customer.address);
  const decimals = await usdc.decimals();

  // ═══════════════════════════════════════════════════════
  // DISPLAY CONFIGURATION
  // ═══════════════════════════════════════════════════════
  log.title();
  log.header("📋 TEST CONFIGURATION");
  log.divider();
  
  console.log("\n  ${colors.bright}Accounts:${colors.reset}");
  log.table({
    "Owner": shortAddress(owner.address),
    "Customer": shortAddress(customer.address),
    "Merchant": shortAddress(merchant.address),
    "VIP Merchant": shortAddress(vipMerchant.address)
  });

  console.log(`\n  ${colors.bright}Contracts:${colors.reset}`);
  log.table({
    "Gateway": shortAddress(deployment.contracts.gateway),
    "USDC": shortAddress(deployment.contracts.usdc),
    "USDT": shortAddress(deployment.contracts.usdt)
  });

  console.log(`\n  ${colors.bright}Customer Balances:${colors.reset}`);
  log.table({
    "Native": `${hre.ethers.formatEther(customerEthBal)} ${deployment.nativeToken}`,
    "USDC": `${hre.ethers.formatUnits(customerUsdcBal, decimals)} USDC`
  });

  // Read contract state
  const feePercentage = await gateway.feePercentage();
  const quoteValidity = await gateway.quoteValidityDurationBlocks();
  
  console.log(`\n  ${colors.bright}Contract Settings:${colors.reset}`);
  log.table({
    "Fee": `${Number(feePercentage) / 100}%`,
    "Quote Validity": `${quoteValidity} blocks`
  });
  
  log.footer();

  // ═══════════════════════════════════════════════════════
  // TEST RESULTS TRACKER
  // ═══════════════════════════════════════════════════════
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  async function runTest(name, testFn) {
    log.title();
    log.header(`🧪 ${name}`);
    log.divider();
    
    const testStart = Date.now();
    let success = false;
    let error = null;
    
    try {
      await testFn();
      success = true;
      results.passed++;
    } catch (e) {
      error = e;
      results.failed++;
    }
    
    const duration = Date.now() - testStart;
    
    console.log();
    log.divider();
    if (success) {
      log.success(`PASSED in ${formatDuration(duration)}`);
    } else {
      log.error(`FAILED: ${error.message}`);
      console.log(`  ${colors.gray}${error.stack?.split('\n').slice(1, 3).join('\n')}${colors.reset}`);
    }
    log.footer();
    
    results.tests.push({ name, success, duration, error: error?.message });
  }

  // ═══════════════════════════════════════════════════════
  // HELPER: APPROVE WITH DEBUG
  // ═══════════════════════════════════════════════════════
  async function approveToken(signer, token, spender, amount, tokenName = "TOKEN") {
    const signerAddr = await signer.getAddress();
    const currentAllowance = await token.allowance(signerAddr, spender);
    
    log.substep(`Current allowance: ${hre.ethers.formatUnits(currentAllowance, decimals)} ${tokenName}`);
    
    if (currentAllowance >= amount) {
      log.substep(`Sufficient allowance, skipping approve`);
      return null;
    }
    
    log.substep(`Approving ${hre.ethers.formatUnits(amount, decimals)} ${tokenName}...`);
    
    const gas = await getGasSettings(networkName);
    const tx = await token.connect(signer).approve(spender, amount, gas);
    log.tx(tx.hash);
    log.explorer(getExplorerUrl(networkName, tx.hash));
    
    const start = Date.now();
    log.pending("Waiting for confirmation...");
    await tx.wait();
    log.substep(`Confirmed in ${formatDuration(Date.now() - start)}`);
    
    return tx;
  }

  // ═══════════════════════════════════════════════════════
  // HELPER: SEND TX WITH DEBUG
  // ═══════════════════════════════════════════════════════
  async function sendTx(description, txPromise) {
    log.substep(`${description}...`);
    
    const tx = await txPromise;
    log.tx(tx.hash);
    log.explorer(getExplorerUrl(networkName, tx.hash));
    
    const start = Date.now();
    log.pending("Waiting for confirmation...");
    const receipt = await tx.wait();
    log.substep(`Confirmed in ${formatDuration(Date.now() - start)} (block ${receipt.blockNumber})`);
    
    return receipt;
  }

  // ═══════════════════════════════════════════════════════
  // TEST 1: DIRECT USDC PAYMENT
  // ═══════════════════════════════════════════════════════
  await runTest("Direct USDC Payment (Normal Fee)", async () => {
    const amount = hre.ethers.parseUnits(TEST_CONFIG.erc20Amount, decimals);
    const orderId = `ORDER-USDC-${Date.now()}`;
    
    log.step(1, 3, "Checking balances");
    const merchantBefore = await usdc.balanceOf(merchant.address);
    log.substep(`Merchant USDC before: ${hre.ethers.formatUnits(merchantBefore, decimals)}`);
    
    log.step(2, 3, "Approving USDC");
    await approveToken(customer, usdc, gateway.target, amount, "USDC");
    
    log.step(3, 3, "Processing payment");
    const gas = await getGasSettings(networkName);
    const receipt = await sendTx(
      `Sending ${TEST_CONFIG.erc20Amount} USDC to ${shortAddress(merchant.address)}`,
      gateway.connect(customer).processDirectPayment(
        usdc.target, amount, merchant.address, orderId, gas
      )
    );
    
    // Parse event
    const event = receipt.logs.map(l => {
      try { return gateway.interface.parseLog(l); } catch { return null; }
    }).find(e => e?.name === "DirectPaymentProcessed");
    
    if (event) {
      const { paymentId, merchantAmount, feeAmount } = event.args;
      console.log();
      log.info("Payment ID", paymentId.toString());
      log.info("Merchant received", `${hre.ethers.formatUnits(merchantAmount, decimals)} USDC`);
      log.info("Fee collected", `${hre.ethers.formatUnits(feeAmount, decimals)} USDC`);
    }
    
    // Verify balance change
    const merchantAfter = await usdc.balanceOf(merchant.address);
    const received = merchantAfter - merchantBefore;
    log.substep(`Merchant balance change: +${hre.ethers.formatUnits(received, decimals)} USDC`);
  });

  // ═══════════════════════════════════════════════════════
  // TEST 2: VIP WHITELIST SETUP
  // ═══════════════════════════════════════════════════════
  await runTest("VIP Whitelist Setup (100% Discount)", async () => {
    log.step(1, 2, "Checking current VIP status");
    const currentDiscount = await gateway.whitelistDiscount(vipMerchant.address);
    log.substep(`Current discount: ${Number(currentDiscount) / 100}%`);
    
    if (currentDiscount > 0n) {
      log.substep("Already VIP, removing first...");
      const gas = await getGasSettings(networkName);
      await sendTx("Removing VIP status", gateway.connect(owner).removeFromWhitelist(vipMerchant.address, gas));
    }
    
    log.step(2, 2, "Setting VIP discount");
    const gas = await getGasSettings(networkName);
    await sendTx(
      `Setting ${TEST_CONFIG.vipDiscount / 100}% discount for ${shortAddress(vipMerchant.address)}`,
      gateway.connect(owner).setWhitelistDiscount(vipMerchant.address, TEST_CONFIG.vipDiscount, gas)
    );
    
    // Verify
    const newDiscount = await gateway.whitelistDiscount(vipMerchant.address);
    log.info("New discount", `${Number(newDiscount) / 100}%`);
  });

  // ═══════════════════════════════════════════════════════
  // TEST 3: VIP PAYMENT (0% FEE)
  // ═══════════════════════════════════════════════════════
  await runTest("VIP USDC Payment (0% Fee)", async () => {
    const amount = hre.ethers.parseUnits(TEST_CONFIG.erc20Amount, decimals);
    const orderId = `ORDER-VIP-${Date.now()}`;
    
    log.step(1, 3, "Checking balances");
    const vipBefore = await usdc.balanceOf(vipMerchant.address);
    log.substep(`VIP Merchant USDC before: ${hre.ethers.formatUnits(vipBefore, decimals)}`);
    
    log.step(2, 3, "Approving USDC");
    await approveToken(customer, usdc, gateway.target, amount, "USDC");
    
    log.step(3, 3, "Processing VIP payment");
    const gas = await getGasSettings(networkName);
    const receipt = await sendTx(
      `Sending ${TEST_CONFIG.erc20Amount} USDC to VIP ${shortAddress(vipMerchant.address)}`,
      gateway.connect(customer).processDirectPayment(
        usdc.target, amount, vipMerchant.address, orderId, gas
      )
    );
    
    // Parse event
    const event = receipt.logs.map(l => {
      try { return gateway.interface.parseLog(l); } catch { return null; }
    }).find(e => e?.name === "DirectPaymentProcessed");
    
    if (event) {
      const { merchantAmount, feeAmount } = event.args;
      console.log();
      log.info("Merchant received", `${hre.ethers.formatUnits(merchantAmount, decimals)} USDC`);
      log.info("Fee collected", `${hre.ethers.formatUnits(feeAmount, decimals)} USDC (should be 0)`);
      
      if (feeAmount === 0n) {
        log.success("VIP discount applied correctly!");
      } else {
        throw new Error("Fee should be 0 for VIP merchant!");
      }
    }
  });

  // ═══════════════════════════════════════════════════════
  // TEST 4: NATIVE TOKEN PAYMENT WITH QUOTE
  // ═══════════════════════════════════════════════════════
  await runTest(`Native ${deployment.nativeToken} Payment with Quote`, async () => {
    const orderId = `ORDER-${deployment.nativeToken}-${Date.now()}`;
    
    log.step(1, 4, "Checking balances");
    const merchantBefore = await hre.ethers.provider.getBalance(merchant.address);
    log.substep(`Merchant ${deployment.nativeToken} before: ${hre.ethers.formatEther(merchantBefore)}`);
    
    log.step(2, 4, "Locking price quote");
    log.substep(`Requesting quote for $${TEST_CONFIG.ethUsdAmount / 100} USD`);
    
    const gas = await getGasSettings(networkName);
    const lockTx = await gateway.connect(customer).lockPriceQuote(ETH_ADDRESS, TEST_CONFIG.ethUsdAmount, gas);
    log.tx(lockTx.hash);
    log.explorer(getExplorerUrl(networkName, lockTx.hash));
    
    const lockStart = Date.now();
    log.pending("Waiting for quote confirmation...");
    const lockReceipt = await lockTx.wait();
    log.substep(`Quote locked in ${formatDuration(Date.now() - lockStart)} (block ${lockReceipt.blockNumber})`);
    
    // Parse quote event
    const quoteEvent = lockReceipt.logs.map(l => {
      try { return gateway.interface.parseLog(l); } catch { return null; }
    }).find(e => e?.name === "PriceQuoteGenerated");
    
    if (!quoteEvent) throw new Error("PriceQuoteGenerated event not found");
    
    const { quoteId, tokenAmount, tokenPriceUSD, validUntilBlock } = quoteEvent.args;
    
    log.step(3, 4, "Quote details");
    console.log();
    log.info("Quote ID", quoteId.slice(0, 18) + "...");
    log.info(`${deployment.nativeToken} Required`, `${hre.ethers.formatEther(tokenAmount)} ${deployment.nativeToken}`);
    log.info(`${deployment.nativeToken} Price`, `$${(Number(tokenPriceUSD) / 100000000).toFixed(2)} USD`);
    log.info("Valid Until Block", validUntilBlock.toString());
    
    // Check blocks remaining
    const currentBlock = await hre.ethers.provider.getBlockNumber();
    const blocksRemaining = Number(validUntilBlock) - currentBlock;
    log.info("Blocks Remaining", `${blocksRemaining} blocks`);
    
    if (blocksRemaining < 5) {
      log.warning("Low blocks remaining! Payment may fail.");
    }
    
    log.step(4, 4, "Processing payment");
    const payGas = await getGasSettings(networkName);
    const payReceipt = await sendTx(
      `Sending ${hre.ethers.formatEther(tokenAmount)} ${deployment.nativeToken}`,
      gateway.connect(customer).processETHPaymentWithQuote(
        quoteId, merchant.address, orderId,
        { value: tokenAmount, ...payGas }
      )
    );
    
    // Check blocks used
    const blocksUsed = payReceipt.blockNumber - lockReceipt.blockNumber;
    log.info("Blocks Used", `${blocksUsed} blocks (lock → pay)`);
    
    // Parse payment event
    const payEvent = payReceipt.logs.map(l => {
      try { return gateway.interface.parseLog(l); } catch { return null; }
    }).find(e => e?.name === "PaymentProcessed");
    
    if (payEvent) {
      const { paymentId, merchantAmount, feeAmount, usdAmount } = payEvent.args;
      console.log();
      log.info("Payment ID", paymentId.toString());
      log.info("USD Amount", `$${(Number(usdAmount) / 100).toFixed(2)}`);
      log.info("Merchant received", `${hre.ethers.formatEther(merchantAmount)} ${deployment.nativeToken}`);
      log.info("Fee collected", `${hre.ethers.formatEther(feeAmount)} ${deployment.nativeToken}`);
    }
    
    // Verify balance change
    const merchantAfter = await hre.ethers.provider.getBalance(merchant.address);
    const received = merchantAfter - merchantBefore;
    log.substep(`Merchant balance change: +${hre.ethers.formatEther(received)} ${deployment.nativeToken}`);
  });

  // ═══════════════════════════════════════════════════════
  // TEST 5: CLEANUP - REMOVE VIP
  // ═══════════════════════════════════════════════════════
  await runTest("Cleanup: Remove VIP Status", async () => {
    log.step(1, 1, "Removing VIP whitelist");
    const gas = await getGasSettings(networkName);
    await sendTx(
      `Removing VIP from ${shortAddress(vipMerchant.address)}`,
      gateway.connect(owner).removeFromWhitelist(vipMerchant.address, gas)
    );
    
    // Verify
    const discount = await gateway.whitelistDiscount(vipMerchant.address);
    log.info("Discount after removal", `${Number(discount)}%`);
  });

  // ═══════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════
  const totalDuration = Date.now() - startTime;
  
  log.title();
  log.header("📊 TEST SUMMARY");
  log.divider();
  
  console.log();
  results.tests.forEach((test, i) => {
    const status = test.success ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    const duration = `${colors.gray}(${formatDuration(test.duration)})${colors.reset}`;
    console.log(`  ${i + 1}. ${status} ${test.name} ${duration}`);
    if (!test.success) {
      console.log(`     ${colors.red}└─ ${test.error}${colors.reset}`);
    }
  });
  
  console.log();
  log.divider();
  
  const passRate = ((results.passed / results.tests.length) * 100).toFixed(0);
  console.log(`  ${colors.bright}Results:${colors.reset} ${colors.green}${results.passed} passed${colors.reset}, ${colors.red}${results.failed} failed${colors.reset} (${passRate}%)`);
  console.log(`  ${colors.bright}Duration:${colors.reset} ${formatDuration(totalDuration)}`);
  console.log(`  ${colors.bright}Network:${colors.reset} ${networkName}`);
  
  log.footer();
  
  // Exit with error if any test failed
  if (results.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
