const hre = require("hardhat");

async function main() {
  console.log("\nProcessing Missed Payment\n");
  
  const txHash = "0x836da5f85f9a57c09ecb895f37b5139b3e2ffff1dae7bdcd89c2b3523e01cb73";
  const apiUrl = "https://api.pp.slavy.space";
  const orderId = "E2E-FULL-TEST-1763821134508";
  
  console.log("Transaction:", txHash);
  console.log("Order ID:", orderId);
  console.log("");
  
  // Get transaction receipt
  const provider = hre.ethers.provider;
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.error("Transaction not found!");
    return;
  }
  
  console.log("Transaction found in block:", receipt.blockNumber);
  console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
  console.log("");
  
  // Notify API to check this transaction
  console.log("Notifying API...");
  
  const response = await fetch(`${apiUrl}/api/customer/payment/${orderId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      txHash: txHash
    })
  });
  
  const result = await response.json();
  console.log("API Response:", result);
  console.log("");
  
  console.log("Wait 3 seconds for processing...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check status
  const statusResponse = await fetch(`${apiUrl}/api/customer/payment/${orderId}/status`);
  const statusData = await statusResponse.json();
  
  console.log("Payment Status:", statusData.status);
  if (statusData.payment) {
    console.log("Payment recorded in database!");
    console.log("Payment ID:", statusData.payment.id);
    console.log("TX Hash:", statusData.payment.txHash);
  } else {
    console.log("Payment not yet in database - Event Listener needed");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
