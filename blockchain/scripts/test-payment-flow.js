// scripts/test-payment-flow.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function formatTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

async function main() {
  const network = hre.network.name;
  const testStartTime = new Date().toISOString();
  
  console.log("\n========================================");
  console.log("🧪 PAYMENT FLOW TEST");
  console.log("========================================");
  console.log("Network:", network);
  console.log("Test Start:", testStartTime);
  
  const testLog = {
    network: network,
    testStartTime: testStartTime,
    steps: [],
    summary: {}
  };
  
  // Load deployment info
  const deployFile = path.join(__dirname, "..", "deployed", `${network}.json`);
  if (!fs.existsSync(deployFile)) {
    console.error("❌ Deployment file not found:", deployFile);
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  const usdcAddress = deploymentInfo.contracts.MockUSDC;
  const usdtAddress = deploymentInfo.contracts.MockUSDT;
  
  console.log("Gateway:", gatewayAddress);
  console.log("USDC:", usdcAddress);
  console.log("USDT:", usdtAddress);
  
  testLog.contracts = {
    gateway: gatewayAddress,
    usdc: usdcAddress,
    usdt: usdtAddress
  };
  
  // Get signers
  const signers = await hre.ethers.getSigners();
  const merchant = signers[0];
  
  let customer;
  if (signers.length > 1) {
    customer = signers[1];
    console.log("\n👤 Actors:");
    console.log("Merchant (owner):", merchant.address);
    console.log("Customer (buyer):", customer.address);
  } else {
    customer = merchant;
    console.log("\n👤 Actors:");
    console.log("Merchant (owner):", merchant.address);
    console.log("Customer (buyer):", customer.address, "(⚠️  Same address - testing mode)");
  }
  
  testLog.actors = {
    merchant: merchant.address,
    customer: customer.address,
    sameAddress: merchant.address === customer.address
  };
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  const usdc = await hre.ethers.getContractAt("MockERC20", usdcAddress);
  const usdt = await hre.ethers.getContractAt("MockERC20", usdtAddress);
  
  // Get fee info
  const feePercentage = await gateway.feePercentage();
  const feeCollector = await gateway.feeCollector();
  
  console.log("\n💰 Gateway Config:");
  console.log("Fee Percentage:", feePercentage.toString(), "basis points (", Number(feePercentage) / 100, "%)");
  console.log("Fee Collector:", feeCollector);
  
  testLog.gatewayConfig = {
    feePercentage: feePercentage.toString(),
    feePercentageDecimal: Number(feePercentage) / 100 + "%",
    feeCollector: feeCollector
  };
  
  // Mint tokens to customer
  console.log("\n🪙 Minting test tokens to customer...");
  let tx = await usdc.mint(customer.address, hre.ethers.parseUnits("1000", 6));
  await tx.wait();
  console.log("✅ Minted 1000 USDC to customer");
  
  tx = await usdt.mint(customer.address, hre.ethers.parseUnits("1000", 6));
  await tx.wait();
  console.log("✅ Minted 1000 USDT to customer");
  
  testLog.steps.push({
    step: "Mint tokens",
    description: "Minted 1000 USDC and 1000 USDT to customer"
  });
  
  // ============ TEST 1: ETH PAYMENT ============
  console.log("\n\n========================================");
  console.log("TEST 1: ETH PAYMENT");
  console.log("========================================");
  
  const test1 = {
    testName: "ETH Payment",
    token: "ETH (Native)",
    tokenAddress: "0x0000000000000000000000000000000000000000"
  };
  
  // Get initial balances
  const merchantEthBefore = await hre.ethers.provider.getBalance(merchant.address);
  const customerEthBefore = await hre.ethers.provider.getBalance(customer.address);
  const feeCollectorEthBefore = await hre.ethers.provider.getBalance(feeCollector);
  
  console.log("\n📊 Balances BEFORE:");
  console.log("Merchant ETH:", hre.ethers.formatEther(merchantEthBefore));
  console.log("Customer ETH:", hre.ethers.formatEther(customerEthBefore));
  console.log("Fee Collector ETH:", hre.ethers.formatEther(feeCollectorEthBefore));
  
  test1.balancesBefore = {
    merchant: hre.ethers.formatEther(merchantEthBefore),
    customer: hre.ethers.formatEther(customerEthBefore),
    feeCollector: hre.ethers.formatEther(feeCollectorEthBefore)
  };
  
  // Lock quote and get quoteId from event
  console.log("\n🔐 Step 1: Locking quote for $200...");
  const ethUsdAmount = 20000; // $200
  
  try {
    tx = await gateway.lockPriceQuote(
      "0x0000000000000000000000000000000000000000",
      ethUsdAmount
    );
    const receipt = await tx.wait();
    console.log("✅ Quote locked, tx:", receipt.hash);
    
    // Find quoteId from PriceQuoteGenerated event
    let quoteId, tokenAmount;
    receipt.logs.forEach((log) => {
      try {
        const parsed = gateway.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsed.name === "PriceQuoteGenerated") {
          quoteId = parsed.args[0];
          tokenAmount = parsed.args[3];
          console.log("📝 Quote ID:", quoteId);
          console.log("📝 Token Amount:", hre.ethers.formatEther(tokenAmount), "ETH");
          console.log("📝 Token Price:", Number(parsed.args[4]) / 1e8, "USD");
          
          test1.priceQuote = {
            quoteId: quoteId,
            usdAmount: "$200.00",
            tokenAmount: hre.ethers.formatEther(tokenAmount) + " ETH",
            tokenPriceUSD: "$" + (Number(parsed.args[4]) / 1e8).toFixed(2)
          };
        }
      } catch (e) {
        // Ignore
      }
    });
    
    if (!quoteId) {
      throw new Error("Could not find PriceQuoteGenerated event");
    }
    
    // Make payment
    console.log("\n💳 Step 2: Customer makes payment...");
    tx = await gateway.connect(customer).processETHPaymentWithQuote(
      quoteId,
      merchant.address,
      "ORDER-ETH-001",
      { value: tokenAmount }
    );
    const payReceipt = await tx.wait();
    console.log("✅ Payment successful, tx:", payReceipt.hash);
    
    // Parse payment events
    payReceipt.logs.forEach((log) => {
      try {
        const parsed = gateway.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsed.name === "PaymentProcessed") {
          const args = parsed.args;
          console.log("\n📢 PaymentProcessed Event:");
          console.log("  Payment ID:", args.paymentId.toString());
          console.log("  Token Amount:", hre.ethers.formatEther(args.tokenAmount), "ETH");
          console.log("  Merchant Amount:", hre.ethers.formatEther(args.merchantAmount), "ETH");
          console.log("  Fee Amount:", hre.ethers.formatEther(args.feeAmount), "ETH");
          console.log("  USD Amount:", "$" + (Number(args.usdAmount) / 100).toFixed(2));
          
          test1.payment = {
            paymentId: args.paymentId.toString(),
            tokenAmount: hre.ethers.formatEther(args.tokenAmount),
            merchantAmount: hre.ethers.formatEther(args.merchantAmount),
            feeAmount: hre.ethers.formatEther(args.feeAmount),
            usdAmount: "$" + (Number(args.usdAmount) / 100).toFixed(2)
          };
          
          // Verify math
          const expectedFee = args.tokenAmount * BigInt(feePercentage) / 10000n;
          const expectedMerchant = args.tokenAmount - expectedFee;
          
          console.log("\n🔬 Math Verification:");
          console.log("  Expected Fee:", hre.ethers.formatEther(expectedFee), "ETH");
          console.log("  Actual Fee:", hre.ethers.formatEther(args.feeAmount), "ETH");
          const feeMatch = expectedFee === args.feeAmount;
          console.log("  Fee Match:", feeMatch ? "✅ CORRECT" : "❌ INCORRECT");
          
          console.log("  Expected Merchant:", hre.ethers.formatEther(expectedMerchant), "ETH");
          console.log("  Actual Merchant:", hre.ethers.formatEther(args.merchantAmount), "ETH");
          const merchantMatch = expectedMerchant === args.merchantAmount;
          console.log("  Merchant Match:", merchantMatch ? "✅ CORRECT" : "❌ INCORRECT");
          
          test1.verification = {
            feeCalculation: feeMatch ? "CORRECT" : "INCORRECT",
            merchantAmount: merchantMatch ? "CORRECT" : "INCORRECT"
          };
        }
      } catch (e) {
        // Ignore
      }
    });
    
  } catch (error) {
    console.log("❌ Error:", error.message);
    test1.error = error.message;
  }
  
  // Get final balances
  const merchantEthAfter = await hre.ethers.provider.getBalance(merchant.address);
  const customerEthAfter = await hre.ethers.provider.getBalance(customer.address);
  const feeCollectorEthAfter = await hre.ethers.provider.getBalance(feeCollector);
  
  console.log("\n📊 Balances AFTER:");
  console.log("Merchant ETH:", hre.ethers.formatEther(merchantEthAfter));
  console.log("Customer ETH:", hre.ethers.formatEther(customerEthAfter));
  console.log("Fee Collector ETH:", hre.ethers.formatEther(feeCollectorEthAfter));
  
  test1.balancesAfter = {
    merchant: hre.ethers.formatEther(merchantEthAfter),
    customer: hre.ethers.formatEther(customerEthAfter),
    feeCollector: hre.ethers.formatEther(feeCollectorEthAfter)
  };
  
  const merchantEthDiff = merchantEthAfter - merchantEthBefore;
  const customerEthDiff = customerEthAfter - customerEthBefore;
  const feeCollectorEthDiff = feeCollectorEthAfter - feeCollectorEthBefore;
  
  console.log("\n📈 Balance Changes:");
  console.log("Merchant:", hre.ethers.formatEther(merchantEthDiff), "ETH");
  console.log("Customer:", hre.ethers.formatEther(customerEthDiff), "ETH");
  console.log("Fee Collector:", hre.ethers.formatEther(feeCollectorEthDiff), "ETH");
  
  test1.balanceChanges = {
    merchant: hre.ethers.formatEther(merchantEthDiff) + " ETH",
    customer: hre.ethers.formatEther(customerEthDiff) + " ETH",
    feeCollector: hre.ethers.formatEther(feeCollectorEthDiff) + " ETH"
  };
  
  testLog.steps.push(test1);
  
  // ============ TEST 2: USDC PAYMENT ============
  console.log("\n\n========================================");
  console.log("TEST 2: USDC PAYMENT");
  console.log("========================================");
  
  const test2 = {
    testName: "USDC Payment",
    token: "USDC (ERC20)",
    tokenAddress: usdcAddress
  };
  
  // Approve USDC
  console.log("\n✅ Step 1: Customer approves USDC...");
  tx = await usdc.connect(customer).approve(gatewayAddress, hre.ethers.parseUnits("200", 6));
  await tx.wait();
  console.log("✅ USDC approved");
  
  // Get initial balances
  const merchantUsdcBefore = await usdc.balanceOf(merchant.address);
  const customerUsdcBefore = await usdc.balanceOf(customer.address);
  const feeCollectorUsdcBefore = await usdc.balanceOf(feeCollector);
  
  console.log("\n📊 Balances BEFORE:");
  console.log("Merchant USDC:", hre.ethers.formatUnits(merchantUsdcBefore, 6));
  console.log("Customer USDC:", hre.ethers.formatUnits(customerUsdcBefore, 6));
  console.log("Fee Collector USDC:", hre.ethers.formatUnits(feeCollectorUsdcBefore, 6));
  
  test2.balancesBefore = {
    merchant: hre.ethers.formatUnits(merchantUsdcBefore, 6),
    customer: hre.ethers.formatUnits(customerUsdcBefore, 6),
    feeCollector: hre.ethers.formatUnits(feeCollectorUsdcBefore, 6)
  };
  
  // Lock quote
  console.log("\n🔐 Step 2: Locking quote for $100...");
  const usdcUsdAmount = 10000; // $100
  
  try {
    tx = await gateway.lockPriceQuote(usdcAddress, usdcUsdAmount);
    const receipt = await tx.wait();
    console.log("✅ Quote locked, tx:", receipt.hash);
    
    let quoteId, tokenAmount;
    receipt.logs.forEach((log) => {
      try {
        const parsed = gateway.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsed.name === "PriceQuoteGenerated") {
          quoteId = parsed.args[0];
          tokenAmount = parsed.args[3];
          console.log("📝 Quote ID:", quoteId);
          console.log("📝 Token Amount:", hre.ethers.formatUnits(tokenAmount, 6), "USDC");
          console.log("📝 Token Price:", Number(parsed.args[4]) / 1e8, "USD");
          
          test2.priceQuote = {
            quoteId: quoteId,
            usdAmount: "$100.00",
            tokenAmount: hre.ethers.formatUnits(tokenAmount, 6) + " USDC",
            tokenPriceUSD: "$" + (Number(parsed.args[4]) / 1e8).toFixed(6)
          };
        }
      } catch (e) {
        // Ignore
      }
    });
    
    if (!quoteId) {
      throw new Error("Could not find PriceQuoteGenerated event");
    }
    
    // Make payment
    console.log("\n💳 Step 3: Customer makes payment...");
    tx = await gateway.connect(customer).processTokenPaymentWithQuote(
      quoteId,
      merchant.address,
      "ORDER-USDC-001"
    );
    const payReceipt = await tx.wait();
    console.log("✅ Payment successful, tx:", payReceipt.hash);
    
    // Parse events
    payReceipt.logs.forEach((log) => {
      try {
        const parsed = gateway.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsed.name === "PaymentProcessed") {
          const args = parsed.args;
          console.log("\n📢 PaymentProcessed Event:");
          console.log("  Token Amount:", hre.ethers.formatUnits(args.tokenAmount, 6), "USDC");
          console.log("  Merchant Amount:", hre.ethers.formatUnits(args.merchantAmount, 6), "USDC");
          console.log("  Fee Amount:", hre.ethers.formatUnits(args.feeAmount, 6), "USDC");
          
          test2.payment = {
            paymentId: args.paymentId.toString(),
            tokenAmount: hre.ethers.formatUnits(args.tokenAmount, 6),
            merchantAmount: hre.ethers.formatUnits(args.merchantAmount, 6),
            feeAmount: hre.ethers.formatUnits(args.feeAmount, 6)
          };
          
          // Verify math
          const expectedFee = args.tokenAmount * BigInt(feePercentage) / 10000n;
          const expectedMerchant = args.tokenAmount - expectedFee;
          
          console.log("\n🔬 Math Verification:");
          console.log("  Expected Fee:", hre.ethers.formatUnits(expectedFee, 6), "USDC");
          console.log("  Actual Fee:", hre.ethers.formatUnits(args.feeAmount, 6), "USDC");
          const feeMatch = expectedFee === args.feeAmount;
          console.log("  Fee Match:", feeMatch ? "✅ CORRECT" : "❌ INCORRECT");
          
          console.log("  Expected Merchant:", hre.ethers.formatUnits(expectedMerchant, 6), "USDC");
          console.log("  Actual Merchant:", hre.ethers.formatUnits(args.merchantAmount, 6), "USDC");
          const merchantMatch = expectedMerchant === args.merchantAmount;
          console.log("  Merchant Match:", merchantMatch ? "✅ CORRECT" : "❌ INCORRECT");
          
          test2.verification = {
            feeCalculation: feeMatch ? "CORRECT" : "INCORRECT",
            merchantAmount: merchantMatch ? "CORRECT" : "INCORRECT"
          };
        }
      } catch (e) {
        // Ignore
      }
    });
    
  } catch (error) {
    console.log("❌ Error:", error.message);
    test2.error = error.message;
  }
  
  // Final balances
  const merchantUsdcAfter = await usdc.balanceOf(merchant.address);
  const customerUsdcAfter = await usdc.balanceOf(customer.address);
  const feeCollectorUsdcAfter = await usdc.balanceOf(feeCollector);
  
  console.log("\n📊 Balances AFTER:");
  console.log("Merchant USDC:", hre.ethers.formatUnits(merchantUsdcAfter, 6));
  console.log("Customer USDC:", hre.ethers.formatUnits(customerUsdcAfter, 6));
  console.log("Fee Collector USDC:", hre.ethers.formatUnits(feeCollectorUsdcAfter, 6));
  
  test2.balancesAfter = {
    merchant: hre.ethers.formatUnits(merchantUsdcAfter, 6),
    customer: hre.ethers.formatUnits(customerUsdcAfter, 6),
    feeCollector: hre.ethers.formatUnits(feeCollectorUsdcAfter, 6)
  };
  
  const merchantUsdcDiff = merchantUsdcAfter - merchantUsdcBefore;
  const customerUsdcDiff = customerUsdcAfter - customerUsdcBefore;
  const feeCollectorUsdcDiff = feeCollectorUsdcAfter - feeCollectorUsdcBefore;
  
  console.log("\n📈 Balance Changes:");
  console.log("Merchant:", hre.ethers.formatUnits(merchantUsdcDiff, 6), "USDC");
  console.log("Customer:", hre.ethers.formatUnits(customerUsdcDiff, 6), "USDC");
  console.log("Fee Collector:", hre.ethers.formatUnits(feeCollectorUsdcDiff, 6), "USDC");
  
  test2.balanceChanges = {
    merchant: hre.ethers.formatUnits(merchantUsdcDiff, 6) + " USDC",
    customer: hre.ethers.formatUnits(customerUsdcDiff, 6) + " USDC",
    feeCollector: hre.ethers.formatUnits(feeCollectorUsdcDiff, 6) + " USDC"
  };
  
  testLog.steps.push(test2);
  
  // ============ TEST 3: USDT PAYMENT ============
  console.log("\n\n========================================");
  console.log("TEST 3: USDT PAYMENT");
  console.log("========================================");
  
  const test3 = {
    testName: "USDT Payment",
    token: "USDT (ERC20)",
    tokenAddress: usdtAddress
  };
  
  // Approve USDT
  console.log("\n✅ Step 1: Customer approves USDT...");
  tx = await usdt.connect(customer).approve(gatewayAddress, hre.ethers.parseUnits("200", 6));
  await tx.wait();
  console.log("✅ USDT approved");
  
  // Get initial balances
  const merchantUsdtBefore = await usdt.balanceOf(merchant.address);
  const customerUsdtBefore = await usdt.balanceOf(customer.address);
  const feeCollectorUsdtBefore = await usdt.balanceOf(feeCollector);
  
  console.log("\n📊 Balances BEFORE:");
  console.log("Merchant USDT:", hre.ethers.formatUnits(merchantUsdtBefore, 6));
  console.log("Customer USDT:", hre.ethers.formatUnits(customerUsdtBefore, 6));
  console.log("Fee Collector USDT:", hre.ethers.formatUnits(feeCollectorUsdtBefore, 6));
  
  test3.balancesBefore = {
    merchant: hre.ethers.formatUnits(merchantUsdtBefore, 6),
    customer: hre.ethers.formatUnits(customerUsdtBefore, 6),
    feeCollector: hre.ethers.formatUnits(feeCollectorUsdtBefore, 6)
  };
  
  // Lock quote
  console.log("\n🔐 Step 2: Locking quote for $100...");
  
  try {
    tx = await gateway.lockPriceQuote(usdtAddress, usdcUsdAmount);
    const receipt = await tx.wait();
    console.log("✅ Quote locked, tx:", receipt.hash);
    
    let quoteId, tokenAmount;
    receipt.logs.forEach((log) => {
      try {
        const parsed = gateway.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsed.name === "PriceQuoteGenerated") {
          quoteId = parsed.args[0];
          tokenAmount = parsed.args[3];
          console.log("📝 Quote ID:", quoteId);
          console.log("📝 Token Amount:", hre.ethers.formatUnits(tokenAmount, 6), "USDT");
          console.log("📝 Token Price:", Number(parsed.args[4]) / 1e8, "USD");
          
          test3.priceQuote = {
            quoteId: quoteId,
            usdAmount: "$100.00",
            tokenAmount: hre.ethers.formatUnits(tokenAmount, 6) + " USDT",
            tokenPriceUSD: "$" + (Number(parsed.args[4]) / 1e8).toFixed(6)
          };
        }
      } catch (e) {
        // Ignore
      }
    });
    
    if (!quoteId) {
      throw new Error("Could not find PriceQuoteGenerated event");
    }
    
    // Make payment
    console.log("\n💳 Step 3: Customer makes payment...");
    tx = await gateway.connect(customer).processTokenPaymentWithQuote(
      quoteId,
      merchant.address,
      "ORDER-USDT-001"
    );
    const payReceipt = await tx.wait();
    console.log("✅ Payment successful, tx:", payReceipt.hash);
    
    // Parse events
    payReceipt.logs.forEach((log) => {
      try {
        const parsed = gateway.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsed.name === "PaymentProcessed") {
          const args = parsed.args;
          console.log("\n📢 PaymentProcessed Event:");
          console.log("  Token Amount:", hre.ethers.formatUnits(args.tokenAmount, 6), "USDT");
          console.log("  Merchant Amount:", hre.ethers.formatUnits(args.merchantAmount, 6), "USDT");
          console.log("  Fee Amount:", hre.ethers.formatUnits(args.feeAmount, 6), "USDT");
          
          test3.payment = {
            paymentId: args.paymentId.toString(),
            tokenAmount: hre.ethers.formatUnits(args.tokenAmount, 6),
            merchantAmount: hre.ethers.formatUnits(args.merchantAmount, 6),
            feeAmount: hre.ethers.formatUnits(args.feeAmount, 6)
          };
          
          // Verify math
          const expectedFee = args.tokenAmount * BigInt(feePercentage) / 10000n;
          const expectedMerchant = args.tokenAmount - expectedFee;
          
          console.log("\n🔬 Math Verification:");
          console.log("  Expected Fee:", hre.ethers.formatUnits(expectedFee, 6), "USDT");
          console.log("  Actual Fee:", hre.ethers.formatUnits(args.feeAmount, 6), "USDT");
          const feeMatch = expectedFee === args.feeAmount;
          console.log("  Fee Match:", feeMatch ? "✅ CORRECT" : "❌ INCORRECT");
          
          console.log("  Expected Merchant:", hre.ethers.formatUnits(expectedMerchant, 6), "USDT");
          console.log("  Actual Merchant:", hre.ethers.formatUnits(args.merchantAmount, 6), "USDT");
          const merchantMatch = expectedMerchant === args.merchantAmount;
          console.log("  Merchant Match:", merchantMatch ? "✅ CORRECT" : "❌ INCORRECT");
          
          test3.verification = {
            feeCalculation: feeMatch ? "CORRECT" : "INCORRECT",
            merchantAmount: merchantMatch ? "CORRECT" : "INCORRECT"
          };
        }
      } catch (e) {
        // Ignore
      }
    });
    
  } catch (error) {
    console.log("❌ Error:", error.message);
    test3.error = error.message;
  }
  
  // Final balances
  const merchantUsdtAfter = await usdt.balanceOf(merchant.address);
  const customerUsdtAfter = await usdt.balanceOf(customer.address);
  const feeCollectorUsdtAfter = await usdt.balanceOf(feeCollector);
  
  console.log("\n📊 Balances AFTER:");
  console.log("Merchant USDT:", hre.ethers.formatUnits(merchantUsdtAfter, 6));
  console.log("Customer USDT:", hre.ethers.formatUnits(customerUsdtAfter, 6));
  console.log("Fee Collector USDT:", hre.ethers.formatUnits(feeCollectorUsdtAfter, 6));
  
  test3.balancesAfter = {
    merchant: hre.ethers.formatUnits(merchantUsdtAfter, 6),
    customer: hre.ethers.formatUnits(customerUsdtAfter, 6),
    feeCollector: hre.ethers.formatUnits(feeCollectorUsdtAfter, 6)
  };
  
  const merchantUsdtDiff = merchantUsdtAfter - merchantUsdtBefore;
  const customerUsdtDiff = customerUsdtAfter - customerUsdtBefore;
  const feeCollectorUsdtDiff = feeCollectorUsdtAfter - feeCollectorUsdtBefore;
  
  console.log("\n📈 Balance Changes:");
  console.log("Merchant:", hre.ethers.formatUnits(merchantUsdtDiff, 6), "USDT");
  console.log("Customer:", hre.ethers.formatUnits(customerUsdtDiff, 6), "USDT");
  console.log("Fee Collector:", hre.ethers.formatUnits(feeCollectorUsdtDiff, 6), "USDT");
  
  test3.balanceChanges = {
    merchant: hre.ethers.formatUnits(merchantUsdtDiff, 6) + " USDT",
    customer: hre.ethers.formatUnits(customerUsdtDiff, 6) + " USDT",
    feeCollector: hre.ethers.formatUnits(feeCollectorUsdtDiff, 6) + " USDT"
  };
  
  testLog.steps.push(test3);
  
  // Summary
  const testEndTime = new Date().toISOString();
  console.log("\n========================================");
  console.log("📋 TEST SUMMARY");
  console.log("========================================");
  
  testLog.testEndTime = testEndTime;
  testLog.summary = {
    totalTests: 3,
    completed: testLog.steps.filter(s => !s.error).length,
    failed: testLog.steps.filter(s => s.error).length
  };
  
  console.log("Total Tests:", testLog.summary.totalTests);
  console.log("✅ Passed:", testLog.summary.completed);
  console.log("❌ Failed:", testLog.summary.failed);
  console.log("Test Duration:", ((new Date(testEndTime) - new Date(testStartTime)) / 1000).toFixed(2), "seconds");
  
  // Save test results
  const testDir = path.join(__dirname, "..", "tested");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const timestamp = formatTimestamp();
  const testFile = path.join(testDir, `payment-flow-test-${timestamp}.json`);
  fs.writeFileSync(testFile, JSON.stringify(testLog, null, 2));
  
  console.log("\n✅ Test results saved to:", testFile);
  console.log("\n========================================");
  console.log("🎉 ALL TESTS COMPLETE!");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
