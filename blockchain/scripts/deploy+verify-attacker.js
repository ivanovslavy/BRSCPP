// scripts/deploy-attacker.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const network = hre.network.name;
  
  console.log("\n========================================");
  console.log("🦹 DEPLOY MALICIOUS ATTACKER");
  console.log("========================================");
  console.log("Network:", network);
  
  // Load existing deployment
  const deployFile = path.join(__dirname, "..", "deployed", `${network}-v2.json`);
  let deploymentInfo;
  
  if (fs.existsSync(deployFile)) {
    deploymentInfo = JSON.parse(fs.readFileSync(deployFile, "utf8"));
    console.log("Found existing V2 deployment");
  } else {
    // Try V1
    const v1File = path.join(__dirname, "..", "deployed", `${network}.json`);
    if (fs.existsSync(v1File)) {
      deploymentInfo = JSON.parse(fs.readFileSync(v1File, "utf8"));
      console.log("Found existing V1 deployment");
    } else {
      console.error("❌ No existing deployment found. Deploy gateway first!");
      process.exit(1);
    }
  }
  
  const gatewayAddress = deploymentInfo.contracts.CryptoPaymentGateway;
  console.log("Target Gateway:", gatewayAddress);
  
  // Get signers
  const signers = await hre.ethers.getSigners();
  const hacker = signers.length > 2 ? signers[2] : signers[0];
  
  console.log("\n👤 Attacker Info:");
  console.log("Address:", hacker.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(hacker.address)), "ETH");
  
  // Check if already deployed
  if (deploymentInfo.contracts.MaliciousAttacker) {
    console.log("\n⚠️  MaliciousAttacker already deployed at:", deploymentInfo.contracts.MaliciousAttacker);
    console.log("Do you want to redeploy? (Delete the entry from JSON if yes)");
    return;
  }
  
  // Deploy MaliciousAttacker
  console.log("\n🦹 Deploying MaliciousAttacker contract...");
  const MaliciousAttacker = await hre.ethers.getContractFactory("MaliciousAttacker", hacker);
  
  const attacker = await MaliciousAttacker.deploy(gatewayAddress);
  await attacker.waitForDeployment();
  const attackerAddress = await attacker.getAddress();
  
  console.log("✅ MaliciousAttacker deployed:", attackerAddress);
  console.log("   Owner:", hacker.address);
  console.log("   Target Gateway:", gatewayAddress);
  
  // Fund with ETH
  const fundAmount = process.env.ATTACKER_FUND_AMOUNT || "0.1";
  if (network !== "mainnet" && parseFloat(fundAmount) > 0) {
    console.log(`\n💰 Funding MaliciousAttacker with ${fundAmount} ETH...`);
    const fundTx = await hacker.sendTransaction({
      to: attackerAddress,
      value: hre.ethers.parseEther(fundAmount)
    });
    await fundTx.wait();
    console.log(`✅ Funded with ${fundAmount} ETH`);
    
    const contractBalance = await hre.ethers.provider.getBalance(attackerAddress);
    console.log("Contract balance:", hre.ethers.formatEther(contractBalance), "ETH");
  }
  
  // Update deployment file
  deploymentInfo.contracts.MaliciousAttacker = attackerAddress;
  deploymentInfo.maliciousAttacker = {
    address: attackerAddress,
    owner: hacker.address,
    targetGateway: gatewayAddress,
    deployedAt: new Date().toISOString(),
    funded: fundAmount + " ETH"
  };
  
  const saveFile = fs.existsSync(deployFile) ? deployFile : path.join(__dirname, "..", "deployed", `${network}.json`);
  fs.writeFileSync(saveFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ Updated deployment file:", saveFile);
  
  // Verify
  if (network !== "localhost" && network !== "hardhat") {
    console.log("\n⏳ Waiting 20 seconds before verification...");
    await sleep(20000);
    
    console.log("🔍 Verifying MaliciousAttacker on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: attackerAddress,
        constructorArguments: [gatewayAddress]
      });
      console.log("✅ Verified successfully!");
      
      deploymentInfo.maliciousAttacker.verified = true;
      deploymentInfo.maliciousAttacker.verifiedAt = new Date().toISOString();
      fs.writeFileSync(saveFile, JSON.stringify(deploymentInfo, null, 2));
      
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ Already verified");
        deploymentInfo.maliciousAttacker.verified = true;
        fs.writeFileSync(saveFile, JSON.stringify(deploymentInfo, null, 2));
      } else {
        console.log("⚠️  Verification failed:", error.message.split('\n')[0]);
        deploymentInfo.maliciousAttacker.verified = false;
        deploymentInfo.maliciousAttacker.verificationError = error.message.split('\n')[0];
        fs.writeFileSync(saveFile, JSON.stringify(deploymentInfo, null, 2));
      }
    }
  }
  
  console.log("\n========================================");
  console.log("🎉 ATTACKER DEPLOYED!");
  console.log("========================================");
  console.log("\n📋 Summary:");
  console.log("Attacker Address:", attackerAddress);
  console.log("Owner:", hacker.address);
  console.log("Target Gateway:", gatewayAddress);
  console.log("ETH Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(attackerAddress)), "ETH");
  
  if (network !== "localhost" && network !== "hardhat") {
    const explorerPrefix = network === 'mainnet' ? '' : network + '.';
    console.log("\n🔗 Etherscan:");
    console.log(`https://${explorerPrefix}etherscan.io/address/${attackerAddress}`);
  }
  
  console.log("\n📝 Available Attack Functions:");
  console.log("  - attackReentrancy(quoteId, merchant)");
  console.log("  - attackFrontRun(victimQuoteId, selfAsMerchant)");
  console.log("  - attackReplay(quoteId, merchant)");
  console.log("  - attackERC20WithoutApproval(quoteId, merchant)");
  console.log("  - attackERC20Reentrancy(token, quoteId, merchant, amount)");
  
  console.log("\n💰 Withdraw Functions:");
  console.log("  - withdrawETH(to, amount)");
  console.log("  - withdrawAllETH(to)");
  console.log("  - withdrawERC20(token, to, amount)");
  console.log("  - withdrawAllERC20(token, to)");
  
  console.log("\n🛡️  Ready for security testing!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
