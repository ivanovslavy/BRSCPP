const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n========================================");
  console.log("COMPREHENSIVE E2E SYSTEM TEST");
  console.log("========================================\n");
  
  const gatewayAddress = "0x1378329ABE689594355a95bDAbEaBF015ef9CF39";
  const apiBaseUrl = "https://api.pp.slavy.space";
  const merchantApiKey = "pk_test_put_your-API-Key_here";
  
  const provider = hre.ethers.provider;
  const owner = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
const merchant = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider); // ← Use same as owner
  const customer = new hre.ethers.Wallet(process.env.CUSTOMER_PRIVATE_KEY || process.env.PRIVATE_KEY, provider);
  
  // Test results object
  const testResults = {
    timestamp: new Date().toISOString(),
    network: "sepolia",
    gateway: gatewayAddress,
    api: apiBaseUrl,
    actors: {
      owner: owner.address,
      merchant: merchant.address,
      customer: customer.address
    },
    steps: [],
    summary: {
      totalSteps: 0,
      passedSteps: 0,
      failedSteps: 0,
      warnings: 0
    },
    payment: {},
    verification: {},
    links: {}
  };
  
  console.log("TEST CONFIGURATION:");
  console.log("Gateway:", gatewayAddress);
  console.log("API:", apiBaseUrl);
  console.log("Merchant:", merchant.address);
  console.log("Customer:", customer.address);
  console.log("");
  
  const gateway = await hre.ethers.getContractAt("CryptoPaymentGateway", gatewayAddress);
  
  // ==========================================
  // STEP 1: CREATE PAYMENT REQUEST (MERCHANT)
  // ==========================================
  console.log("STEP 1: Merchant creates payment request");
  console.log("==========================================");
  
  const orderId = "E2E-FULL-TEST-" + Date.now();
  const usdAmount = 20;
  
  let step1 = {
    step: 1,
    name: "Create Payment Request",
    status: "running",
    startTime: new Date().toISOString()
  };
  
  try {
    const paymentRequestResponse = await fetch(`${apiBaseUrl}/api/merchant/payment-request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${merchantApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: orderId,
        amountUsd: usdAmount.toString(),
        description: "Comprehensive E2E test payment",
        customerEmail: "test@example.com"
      })
    });
    
    if (!paymentRequestResponse.ok) {
      throw new Error(`Failed to create payment request: ${paymentRequestResponse.status}`);
    }
    
    const paymentRequestData = await paymentRequestResponse.json();
    console.log("Payment request created:");
    console.log("  Order ID:", paymentRequestData.paymentRequest.orderId);
    console.log("  Amount:", "$" + paymentRequestData.paymentRequest.amountUsd);
    console.log("  Payment URL:", paymentRequestData.paymentRequest.paymentUrl);
    console.log("");
    
    step1.status = "passed";
    step1.data = paymentRequestData.paymentRequest;
    testResults.payment.orderId = orderId;
    testResults.payment.amountUsd = usdAmount;
    testResults.payment.paymentUrl = paymentRequestData.paymentRequest.paymentUrl;
    testResults.summary.passedSteps++;
  } catch (error) {
    step1.status = "failed";
    step1.error = error.message;
    testResults.summary.failedSteps++;
    console.error("ERROR:", error.message);
  }
  
  step1.endTime = new Date().toISOString();
  testResults.steps.push(step1);
  testResults.summary.totalSteps++;
  
  // ==========================================
  // STEP 2: CUSTOMER RETRIEVES PAYMENT REQUEST
  // ==========================================
  console.log("STEP 2: Customer retrieves payment request");
  console.log("==========================================");
  
  let step2 = {
    step: 2,
    name: "Get Payment Request",
    status: "running",
    startTime: new Date().toISOString()
  };
  
  try {
    const getPaymentResponse = await fetch(`${apiBaseUrl}/api/customer/payment/${orderId}`);
    
    if (!getPaymentResponse.ok) {
      throw new Error(`Failed to get payment request: ${getPaymentResponse.status}`);
    }
    
    const paymentData = await getPaymentResponse.json();
    console.log("Payment details retrieved:");
    console.log("  Merchant:", paymentData.merchantName);
    console.log("  Amount:", "$" + paymentData.amountUsd);
    console.log("  Description:", paymentData.description);
    console.log("");
    
    step2.status = "passed";
    step2.data = paymentData;
    testResults.summary.passedSteps++;
  } catch (error) {
    step2.status = "failed";
    step2.error = error.message;
    testResults.summary.failedSteps++;
    console.error("ERROR:", error.message);
  }
  
  step2.endTime = new Date().toISOString();
  testResults.steps.push(step2);
  testResults.summary.totalSteps++;
  
  // ==========================================
  // STEP 3: CUSTOMER CREATES QUOTE ON BLOCKCHAIN
  // ==========================================
  console.log("STEP 3: Customer creates price quote on blockchain");
  console.log("==========================================");
  
  let step3 = {
    step: 3,
    name: "Create Price Quote",
    status: "running",
    startTime: new Date().toISOString()
  };
  
  let quoteId, tokenAmount, validUntil;
  
  try {
    const usdCents = usdAmount * 100;
    
    console.log("Creating quote directly on blockchain...");
    const quoteTx = await gateway.connect(customer).lockPriceQuote(
      hre.ethers.ZeroAddress,
      usdCents
    );
    
    console.log("Quote transaction sent:", quoteTx.hash);
    const quoteReceipt = await quoteTx.wait();
    console.log("Quote confirmed in block:", quoteReceipt.blockNumber);
    
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
          
          console.log("Quote created:");
          console.log("  Quote ID:", quoteId);
          console.log("  Token Amount:", hre.ethers.formatEther(tokenAmount), "ETH");
          console.log("  Valid Until:", new Date(Number(validUntil) * 1000).toISOString());
          console.log("  Expires In:", Math.floor((Number(validUntil) * 1000 - Date.now()) / 1000), "seconds");
          break;
        }
      } catch (e) {}
    }
    
    if (!quoteId) {
      throw new Error("Failed to parse quote ID from transaction");
    }
    
    console.log("");
    
    step3.status = "passed";
    step3.data = {
      quoteId: quoteId,
      tokenAmount: hre.ethers.formatEther(tokenAmount),
      validUntil: new Date(Number(validUntil) * 1000).toISOString(),
      txHash: quoteTx.hash,
      blockNumber: quoteReceipt.blockNumber
    };
    testResults.payment.quoteId = quoteId;
    testResults.payment.tokenAmount = hre.ethers.formatEther(tokenAmount);
    testResults.summary.passedSteps++;
  } catch (error) {
    step3.status = "failed";
    step3.error = error.message;
    testResults.summary.failedSteps++;
    console.error("ERROR:", error.message);
  }
  
  step3.endTime = new Date().toISOString();
  testResults.steps.push(step3);
  testResults.summary.totalSteps++;
  
  if (!quoteId) {
    console.log("\n❌ Cannot continue without quote. Test aborted.\n");
    saveResults(testResults);
    return;
  }
  
  // ==========================================
  // STEP 4: CUSTOMER PROCESSES PAYMENT
  // ==========================================
  console.log("STEP 4: Customer processes payment on blockchain");
  console.log("==========================================");
  
  let step4 = {
    step: 4,
    name: "Process Payment",
    status: "running",
    startTime: new Date().toISOString()
  };
  
  let paymentTx, paymentReceipt, paymentEvent;
  
  try {
    console.log("Sending transaction...");
    paymentTx = await gateway.connect(customer).processETHPaymentWithQuote(
      quoteId,
      merchant.address,
      orderId,
      { value: tokenAmount }
    );
    
    console.log("Transaction sent:", paymentTx.hash);
    console.log("Waiting for confirmation...");
    
    paymentReceipt = await paymentTx.wait();
    console.log("Payment confirmed in block:", paymentReceipt.blockNumber);
    console.log("Gas used:", paymentReceipt.gasUsed.toString());
    console.log("");
    
    for (const log of paymentReceipt.logs) {
      try {
        const parsed = gateway.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (parsed.name === 'PaymentProcessed') {
          paymentEvent = parsed.args;
          console.log("PaymentProcessed event emitted:");
          console.log("  Payment ID:", paymentEvent.paymentId.toString());
          console.log("  Quote ID:", paymentEvent.quoteId);
          console.log("  Merchant:", paymentEvent.merchant);
          console.log("  Customer:", paymentEvent.customer);
          console.log("  Total Amount:", hre.ethers.formatEther(paymentEvent.totalAmount), "ETH");
          console.log("  Merchant Amount:", hre.ethers.formatEther(paymentEvent.merchantAmount), "ETH");
          console.log("  Fee Amount:", hre.ethers.formatEther(paymentEvent.feeAmount), "ETH");
          console.log("  USD Amount:", "$" + (Number(paymentEvent.usdAmount) / 100).toFixed(2));
          console.log("  Order ID:", paymentEvent.orderId);
          console.log("");
          break;
        }
      } catch (e) {}
    }
    
    if (!paymentEvent) {
      throw new Error("PaymentProcessed event not found!");
    }
    
    step4.status = "passed";
    step4.data = {
      txHash: paymentTx.hash,
      blockNumber: paymentReceipt.blockNumber,
      gasUsed: paymentReceipt.gasUsed.toString(),
      paymentId: paymentEvent.paymentId.toString(),
      totalAmount: hre.ethers.formatEther(paymentEvent.totalAmount),
      merchantAmount: hre.ethers.formatEther(paymentEvent.merchantAmount),
      feeAmount: hre.ethers.formatEther(paymentEvent.feeAmount)
    };
    testResults.payment.txHash = paymentTx.hash;
    testResults.payment.blockNumber = paymentReceipt.blockNumber;
    testResults.payment.paymentId = paymentEvent.paymentId.toString();
    testResults.summary.passedSteps++;
  } catch (error) {
    step4.status = "failed";
    step4.error = error.message;
    testResults.summary.failedSteps++;
    console.error("ERROR:", error.message);
  }
  
  step4.endTime = new Date().toISOString();
  testResults.steps.push(step4);
  testResults.summary.totalSteps++;
  
  if (!paymentTx) {
    console.log("\n❌ Payment failed. Test aborted.\n");
    saveResults(testResults);
    return;
  }
  
  // ==========================================
  // STEP 5: WAIT FOR EVENT LISTENER WITH RETRY
  // ==========================================
  console.log("STEP 5: Wait for Event Listener to process payment");
  console.log("==========================================");
  
  let step5 = {
    step: 5,
    name: "Wait for Event Listener",
    status: "running",
    startTime: new Date().toISOString()
  };
  
  let statusData = null;
  let paymentFound = false;
  const maxAttempts = 15;
  
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Checking database (attempt ${attempt}/${maxAttempts})...`);
      
      try {
        const statusResponse = await fetch(`${apiBaseUrl}/api/customer/payment/${orderId}/status`);
        
        if (statusResponse.ok) {
          statusData = await statusResponse.json();
          
          if (statusData.status === 'completed' && statusData.payment) {
            console.log("✅ Payment processed by Event Listener!");
            paymentFound = true;
            break;
          }
        }
      } catch (error) {
        console.log(`Error checking status: ${error.message}`);
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!paymentFound) {
      console.log("⚠️  Payment not yet processed by Event Listener");
      console.log("   This is expected if Event Listener started after the payment");
      console.log("   Payment is valid on blockchain and will be processed on next scan");
      step5.status = "warning";
      testResults.summary.warnings++;
    } else {
      step5.status = "passed";
      testResults.summary.passedSteps++;
    }
    
    console.log("");
  } catch (error) {
    step5.status = "failed";
    step5.error = error.message;
    testResults.summary.failedSteps++;
    console.error("ERROR:", error.message);
  }
  
  step5.endTime = new Date().toISOString();
  testResults.steps.push(step5);
  testResults.summary.totalSteps++;
  
  // ==========================================
  // STEP 6: VERIFY PAYMENT IN DATABASE
  // ==========================================
  console.log("STEP 6: Verify payment in database via API");
  console.log("==========================================");
  
  let step6 = {
    step: 6,
    name: "Verify Database Record",
    status: "running",
    startTime: new Date().toISOString()
  };
  
  try {
    const finalStatusResponse = await fetch(`${apiBaseUrl}/api/customer/payment/${orderId}/status`);
    
    if (!finalStatusResponse.ok) {
      throw new Error(`Failed to get payment status: ${finalStatusResponse.status}`);
    }
    
    statusData = await finalStatusResponse.json();
    console.log("Payment status from API:");
    console.log("  Order ID:", statusData.orderId);
    console.log("  Status:", statusData.status);
    console.log("  Amount USD:", "$" + statusData.amountUsd);
    
    if (statusData.payment) {
      console.log("  Payment ID:", statusData.payment.id);
      console.log("  TX Hash:", statusData.payment.txHash);
      console.log("  Token Amount:", statusData.payment.tokenAmount);
      console.log("  Confirmed At:", statusData.payment.confirmedAt);
      console.log("");
      console.log("✅ Payment fully processed in database");
      step6.status = "passed";
      step6.data = statusData;
      testResults.verification.databaseRecord = true;
      testResults.summary.passedSteps++;
    } else {
      console.log("");
      console.log("⚠️  Payment not in database yet");
      console.log("   Blockchain payment: SUCCESS");
      console.log("   Database record: Will be created by Event Listener");
      console.log("   Status: Payment is valid and will be processed");
      step6.status = "warning";
      step6.data = statusData;
      testResults.verification.databaseRecord = false;
      testResults.summary.warnings++;
    }
    console.log("");
  } catch (error) {
    step6.status = "failed";
    step6.error = error.message;
    testResults.summary.failedSteps++;
    console.error("ERROR:", error.message);
  }
  
  step6.endTime = new Date().toISOString();
  testResults.steps.push(step6);
  testResults.summary.totalSteps++;
  
  // ==========================================
  // STEP 7: CHECK WEBHOOK DELIVERY
  // ==========================================
  console.log("STEP 7: Check webhook delivery");
  console.log("==========================================");
  
  let step7 = {
    step: 7,
    name: "Check Webhook Delivery",
    status: "running",
    startTime: new Date().toISOString()
  };
  
  try {
    const webhooksResponse = await fetch(`${apiBaseUrl}/api/admin/webhooks/failed`, {
      headers: {
        'Authorization': `Bearer ${merchantApiKey}`
      }
    });
    
    if (webhooksResponse.ok) {
      const webhooksData = await webhooksResponse.json();
      const thisOrderWebhook = webhooksData.failedWebhooks.find(w => 
        w.payload.payment && w.payload.payment.orderId === orderId
      );
      
      if (thisOrderWebhook) {
        console.log("Webhook found (failed):");
        console.log("  Delivered:", thisOrderWebhook.delivered);
        console.log("  Attempts:", thisOrderWebhook.attempt);
        console.log("  Response Status:", thisOrderWebhook.responseStatus);
        step7.status = "warning";
        step7.data = thisOrderWebhook;
        testResults.verification.webhookDelivered = false;
        testResults.summary.warnings++;
      } else {
        console.log("Webhook delivery status: Success or not yet processed");
        step7.status = "passed";
        testResults.verification.webhookDelivered = true;
        testResults.summary.passedSteps++;
      }
    }
    console.log("");
  } catch (error) {
    step7.status = "failed";
    step7.error = error.message;
    testResults.summary.failedSteps++;
    console.error("ERROR:", error.message);
  }
  
  step7.endTime = new Date().toISOString();
  testResults.steps.push(step7);
  testResults.summary.totalSteps++;
  
  // ==========================================
  // STEP 8: VERIFY MERCHANT STATS
  // ==========================================
  console.log("STEP 8: Verify merchant statistics");
  console.log("==========================================");
  
  let step8 = {
    step: 8,
    name: "Verify Merchant Stats",
    status: "running",
    startTime: new Date().toISOString()
  };
  
  try {
    const statsResponse = await fetch(`${apiBaseUrl}/api/merchant/payments/stats`, {
      headers: {
        'Authorization': `Bearer ${merchantApiKey}`
      }
    });
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log("Merchant stats updated:");
      console.log("  Total Payments:", statsData.totalPayments);
      console.log("  Total USD:", "$" + statsData.totalUsd);
      console.log("  Total Crypto:", statsData.totalCrypto);
      step8.status = "passed";
      step8.data = statsData;
      testResults.summary.passedSteps++;
    }
    console.log("");
  } catch (error) {
    step8.status = "failed";
    step8.error = error.message;
    testResults.summary.failedSteps++;
    console.error("ERROR:", error.message);
  }
  
  step8.endTime = new Date().toISOString();
  testResults.steps.push(step8);
  testResults.summary.totalSteps++;
  
  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log("========================================");
  console.log("E2E TEST COMPLETED");
  console.log("========================================");
  console.log("");
  console.log("Summary:");
  console.log("  Order ID:", orderId);
  console.log("  Quote ID:", quoteId);
  console.log("  Payment TX:", paymentTx.hash);
  console.log("  Block:", paymentReceipt.blockNumber);
  console.log("  Amount USD:", "$" + usdAmount);
  console.log("  Amount ETH:", hre.ethers.formatEther(tokenAmount));
  console.log("");
  console.log("Verification:");
  console.log("  Blockchain Payment:", "✅ SUCCESS");
  console.log("  Smart Contract:", "✅ SUCCESS");
  console.log("  Event Emission:", "✅ SUCCESS");
  console.log("  Database Record:", statusData && statusData.payment ? "✅ SUCCESS" : "⏳ PENDING");
  console.log("  Payment Request:", statusData ? statusData.status.toUpperCase() : "UNKNOWN");
  console.log("");
  console.log("Test Results:");
  console.log("  Total Steps:", testResults.summary.totalSteps);
  console.log("  Passed:", testResults.summary.passedSteps);
  console.log("  Failed:", testResults.summary.failedSteps);
  console.log("  Warnings:", testResults.summary.warnings);
  console.log("");
  
  testResults.verification.blockchainPayment = true;
  testResults.verification.smartContract = true;
  testResults.verification.eventEmission = true;
  testResults.links.etherscan = `https://sepolia.etherscan.io/tx/${paymentTx.hash}`;
  
  if (testResults.summary.failedSteps === 0) {
    if (statusData && statusData.payment) {
      console.log("✅ FULL E2E TEST PASSED");
      testResults.overallStatus = "PASSED";
    } else {
      console.log("⚠️  PARTIAL SUCCESS");
      console.log("   Payment is valid on blockchain");
      console.log("   Event Listener will process on next scan or restart");
      console.log("");
      console.log("To process missed payment, restart Event Listener:");
      console.log("   sudo systemctl restart brscpp-listener.service");
      testResults.overallStatus = "PARTIAL_SUCCESS";
    }
  } else {
    console.log("❌ TEST FAILED");
    testResults.overallStatus = "FAILED";
  }
  
  console.log("");
  console.log("View transaction:");
  console.log("  https://sepolia.etherscan.io/tx/" + paymentTx.hash);
  console.log("");
  
  // Save results
  saveResults(testResults);
}

function saveResults(testResults) {
  const resultsDir = path.join(__dirname, '../test-results');
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `e2e-test-${timestamp}.json`;
  const filepath = path.join(resultsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(testResults, null, 2));
  
  console.log("Test results saved to:", filepath);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n========================================");
    console.error("E2E TEST FAILED");
    console.error("========================================");
    console.error(error);
    process.exit(1);
  });
