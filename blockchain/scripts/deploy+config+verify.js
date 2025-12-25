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
  gray: "\x1b[90m",
  white: "\x1b[37m"
};

const log = {
  title: () => console.log(`\n${colors.bright}${colors.cyan}${'═'.repeat(70)}${colors.reset}`),
  header: (msg) => console.log(`${colors.bright}${colors.cyan}║ ${msg}${colors.reset}`),
  divider: () => console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`),
  footer: () => console.log(`${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`),
  
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
  },
  
  bigSuccess: (msg) => {
    console.log(`\n  ${colors.bright}${colors.green}╔${'═'.repeat(50)}╗${colors.reset}`);
    console.log(`  ${colors.bright}${colors.green}║${' '.repeat(50)}║${colors.reset}`);
    console.log(`  ${colors.bright}${colors.green}║${msg.padStart(25 + msg.length/2).padEnd(50)}║${colors.reset}`);
    console.log(`  ${colors.bright}${colors.green}║${' '.repeat(50)}║${colors.reset}`);
    console.log(`  ${colors.bright}${colors.green}╚${'═'.repeat(50)}╝${colors.reset}\n`);
  }
};

// ============ NETWORK CONFIGURATIONS ============
const NETWORKS = {
  // =============================================
  // TESTNETS - 24h oracle staleness, 500 blocks
  // =============================================
  localhost: {
    chainId: 31337,
    nativeToken: "ETH",
    useMocks: true,
    feePercentage: 100,
    quoteValidityBlocks: 100,
    oracleStalenessSeconds: 86400,  // 24 hours
    explorer: "http://localhost",
    gas: null,
    isTestnet: true
  },
  
  sepolia: {
    chainId: 11155111,
    nativeToken: "ETH",
    useMocks: false,
    feePercentage: 50,
    quoteValidityBlocks: 100,       // 100 blocks × ~12 sec = ~20 min
    oracleStalenessSeconds: 86400,  // 24 hours (testnet oracles update rarely)
    tokens: {
      usdc: "0xC4De068C028127bdB44670Edb82e6E3Ff4113E49",
      usdt: "0x00D75E583DF2998C7582842e69208ad90820Eaa1"
    },
    oracles: {
      native: "0x694AA1769357215DE4FAC081bf1f309aDC325306",  // ETH/USD
      stable: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"   // USD/USD
    },
    explorer: "https://sepolia.etherscan.io",
    gas: { maxPriorityFeePerGas: "3", maxFeePerGas: "50" },
    isTestnet: true
  },
  
  bscTestnet: {
    chainId: 97,
    nativeToken: "BNB",
    useMocks: false,
    feePercentage: 50,
    quoteValidityBlocks: 500,       // 500 blocks (variable block time on testnet)
    oracleStalenessSeconds: 86400,  // 24 hours
    tokens: {
      usdc: "0x45787D76D24F3b47663eC3DEcc76f46C20Fa0c4C",
      usdt: "0xb6dFe9F6810955A3bcbdf7F99418C95Cb073F23D"
    },
    oracles: {
      native: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526",  // BNB/USD
      stable: "0x90c069C4538adAc136E051052E14c1cD799C41B7"   // USD/USD
    },
    explorer: "https://testnet.bscscan.com",
    gas: { maxPriorityFeePerGas: "5", maxFeePerGas: "10" },
    isTestnet: true
  },
  
  amoy: {
    chainId: 80002,
    nativeToken: "MATIC",
    useMocks: false,
    feePercentage: 50,
    quoteValidityBlocks: 500,       // 500 blocks
    oracleStalenessSeconds: 86400,  // 24 hours
    tokens: {
      usdc: "0x3F6357a74Bec93F6281aA1FC705133eC71a1BaE2",
      usdt: "0x9f9eF1DA8A630917383B0b78104887Da1D48dA01"
    },
    oracles: {
      native: "0x001382149eBa3441043c1c66972b4772963f5D43",  // MATIC/USD
      stable: "0x1b8739bB4CdF0089d07097A9Ae5Bd274b29C6F16"   // USD/USD
    },
    explorer: "https://amoy.polygonscan.com",
    gas: { maxPriorityFeePerGas: "50", maxFeePerGas: "100", gasLimit: "5000000" },  // Amoy needs high gas!
    isTestnet: true
  },

  // =============================================
  // MAINNETS - 4h oracle staleness, ~2 min quote
  // =============================================
  mainnet: {
    chainId: 1,
    nativeToken: "ETH",
    useMocks: false,
    feePercentage: 100,             // 1% fee
    quoteValidityBlocks: 10,        // 10 blocks × ~12 sec = ~2 min
    oracleStalenessSeconds: 14400,  // 4 hours
    tokens: {
      usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  // Real USDC
      usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7"   // Real USDT
    },
    oracles: {
      native: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",  // ETH/USD Chainlink
      stable: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6"   // USDC/USD Chainlink
    },
    explorer: "https://etherscan.io",
    gas: null,  // Let network decide (EIP-1559)
    isTestnet: false
  },
  
  bsc: {
    chainId: 56,
    nativeToken: "BNB",
    useMocks: false,
    feePercentage: 100,             // 1% fee
    quoteValidityBlocks: 40,        // 40 blocks × ~3 sec = ~2 min
    oracleStalenessSeconds: 14400,  // 4 hours
    tokens: {
      usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",  // BSC-Peg USDC
      usdt: "0x55d398326f99059fF775485246999027B3197955"   // BSC-Peg USDT
    },
    oracles: {
      native: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",  // BNB/USD Chainlink
      stable: "0x51597f405303C4377E36123cBc172b13269EA163"   // USDC/USD Chainlink
    },
    explorer: "https://bscscan.com",
    gas: { maxPriorityFeePerGas: "3", maxFeePerGas: "5" },
    isTestnet: false
  },
  
  polygon: {
    chainId: 137,
    nativeToken: "MATIC",
    useMocks: false,
    feePercentage: 100,             // 1% fee
    quoteValidityBlocks: 60,        // 60 blocks × ~2 sec = ~2 min
    oracleStalenessSeconds: 14400,  // 4 hours
    tokens: {
      usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",  // Native USDC (not bridged)
      usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"   // PoS USDT
    },
    oracles: {
      native: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",  // MATIC/USD Chainlink
      stable: "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7"   // USDC/USD Chainlink
    },
    explorer: "https://polygonscan.com",
    gas: { maxPriorityFeePerGas: "50", maxFeePerGas: "200" },
    isTestnet: false
  }
};

// ============ HELPER FUNCTIONS ============
function shortAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

async function sleep(seconds) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r      ${colors.gray}→ Waiting ${i}s...${colors.reset}   `);
    await new Promise(r => setTimeout(r, 1000));
  }
  process.stdout.write(`\r      ${colors.gray}→ Done waiting!${colors.reset}      \n`);
}

function getGasOverrides(config) {
  if (!config.gas) return {};
  
  const overrides = {
    maxPriorityFeePerGas: hre.ethers.parseUnits(config.gas.maxPriorityFeePerGas, "gwei"),
    maxFeePerGas: hre.ethers.parseUnits(config.gas.maxFeePerGas, "gwei")
  };
  
  // Add gasLimit if specified (needed for Amoy)
  if (config.gas.gasLimit) {
    overrides.gasLimit = BigInt(config.gas.gasLimit);
  }
  
  return overrides;
}

async function sendTx(description, contract, method, args, config) {
  log.substep(`${description}...`);
  
  const start = Date.now();
  const gasOverrides = getGasOverrides(config);
  
  const tx = await contract[method](...args, gasOverrides);
  log.tx(tx.hash);
  log.explorer(`${config.explorer}/tx/${tx.hash}`);
  
  log.pending("Waiting for confirmation...");
  const receipt = await tx.wait();
  log.substep(`Confirmed in ${formatDuration(Date.now() - start)} (block ${receipt.blockNumber})`);
  
  return receipt;
}

// ============ MOCK DEPLOYMENT ============
async function deployMocks(config) {
  log.step(1, 2, "Deploying Mock Tokens");
  
  const gasOverrides = getGasOverrides(config);
  const Token = await hre.ethers.getContractFactory("MockERC20");
  
  log.substep("Deploying Mock USDC...");
  const usdc = await Token.deploy("Mock USDC", "USDC", 6, gasOverrides);
  await usdc.waitForDeployment();
  log.success(`Mock USDC: ${usdc.target}`);
  
  log.substep("Deploying Mock USDT...");
  const usdt = await Token.deploy("Mock USDT", "USDT", 6, gasOverrides);
  await usdt.waitForDeployment();
  log.success(`Mock USDT: ${usdt.target}`);
  
  log.step(2, 2, "Deploying Mock Price Feeds");
  
  const Feed = await hre.ethers.getContractFactory("MockV3Aggregator");
  
  log.substep("Deploying ETH/USD feed ($2500)...");
  const nativeFeed = await Feed.deploy(8, 250000000000, gasOverrides);
  await nativeFeed.waitForDeployment();
  log.success(`ETH/USD: ${nativeFeed.target}`);
  
  log.substep("Deploying USD/USD feed ($1.00)...");
  const stableFeed = await Feed.deploy(8, 100000000, gasOverrides);
  await stableFeed.waitForDeployment();
  log.success(`USD/USD: ${stableFeed.target}`);
  
  return { usdc, usdt, nativeFeed, stableFeed };
}

// ============ MAIN DEPLOYMENT ============
async function main() {
  const networkName = hre.network.name;
  const config = NETWORKS[networkName];
  const startTime = Date.now();

  if (!config) {
    log.error(`Network "${networkName}" not configured!`);
    console.log(`\nAvailable networks: ${Object.keys(NETWORKS).join(", ")}`);
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  // ═══════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════
  log.title();
  log.header("🚀 CRYPTO PAYMENT GATEWAY - DEPLOYMENT v3.2");
  log.divider();
  log.info("Network", `${networkName} ${config.isTestnet ? '(TESTNET)' : '(MAINNET)'}`);
  log.info("Chain ID", config.chainId);
  log.info("Native Token", config.nativeToken);
  log.info("Time", new Date().toLocaleString());
  log.footer();

  // Safety check for mainnet
  if (!config.isTestnet) {
    log.title();
    log.header("⚠️  MAINNET DEPLOYMENT WARNING");
    log.divider();
    log.warning("You are deploying to MAINNET!");
    log.warning("Real funds will be used for gas.");
    log.warning("Press Ctrl+C within 10 seconds to cancel...");
    log.footer();
    await sleep(10);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DEPLOYER INFO
  // ═══════════════════════════════════════════════════════════════════
  log.title();
  log.header("👤 DEPLOYER");
  log.divider();
  log.table({
    "Address": deployer.address,
    "Balance": `${hre.ethers.formatEther(balance)} ${config.nativeToken}`,
    "Fee Collector": process.env.FEE_COLLECTOR_ADDRESS || deployer.address
  });
  
  if (config.gas) {
    console.log();
    log.info("Gas Priority", `${config.gas.maxPriorityFeePerGas} gwei`);
    log.info("Gas Max", `${config.gas.maxFeePerGas} gwei`);
  }
  log.footer();

  // ═══════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════
  log.title();
  log.header("⚙️  CONFIGURATION");
  log.divider();
  log.table({
    "Fee Percentage": `${config.feePercentage / 100}%`,
    "Quote Validity": `${config.quoteValidityBlocks} blocks`,
    "Oracle Staleness": `${config.oracleStalenessSeconds}s (${config.oracleStalenessSeconds / 3600}h)`,
    "Environment": config.isTestnet ? "Testnet" : "Mainnet",
    "Use Mocks": config.useMocks ? "Yes" : "No"
  });
  
  if (!config.useMocks) {
    console.log();
    console.log(`  ${colors.bright}Tokens:${colors.reset}`);
    log.info("USDC", config.tokens.usdc);
    log.info("USDT", config.tokens.usdt);
    console.log();
    console.log(`  ${colors.bright}Oracles:${colors.reset}`);
    log.info("Native", config.oracles.native);
    log.info("Stable", config.oracles.stable);
  }
  log.footer();

  // Deployment info object
  const deploymentInfo = {
    network: networkName,
    chainId: config.chainId,
    nativeToken: config.nativeToken,
    isTestnet: config.isTestnet,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {},
    oracles: {},
    config: {
      owner: process.env.OWNER_ADDRESS || deployer.address,
      feeCollector: process.env.FEE_COLLECTOR_ADDRESS || deployer.address,
      feePercentage: config.feePercentage,
      quoteValidityBlocks: config.quoteValidityBlocks,
      oracleStalenessSeconds: config.oracleStalenessSeconds
    },
    explorer: config.explorer
  };

  let usdc, usdt, nativeFeed, stableFeed;

  // ═══════════════════════════════════════════════════════════════════
  // DEPLOY MOCKS (if needed)
  // ═══════════════════════════════════════════════════════════════════
  if (config.useMocks) {
    log.title();
    log.header("🪙 DEPLOYING MOCK CONTRACTS");
    log.divider();
    
    const mocks = await deployMocks(config);
    usdc = mocks.usdc;
    usdt = mocks.usdt;
    nativeFeed = mocks.nativeFeed;
    stableFeed = mocks.stableFeed;
    
    deploymentInfo.contracts.usdc = usdc.target;
    deploymentInfo.contracts.usdt = usdt.target;
    deploymentInfo.oracles.native = nativeFeed.target;
    deploymentInfo.oracles.stable = stableFeed.target;
    
    log.footer();
  } else {
    deploymentInfo.contracts.usdc = config.tokens.usdc;
    deploymentInfo.contracts.usdt = config.tokens.usdt;
    deploymentInfo.oracles.native = config.oracles.native;
    deploymentInfo.oracles.stable = config.oracles.stable;
  }

  // ═══════════════════════════════════════════════════════════════════
  // DEPLOY GATEWAY
  // ═══════════════════════════════════════════════════════════════════
  log.title();
  log.header("💎 DEPLOYING GATEWAY CONTRACT");
  log.divider();

  const owner = process.env.OWNER_ADDRESS || deployer.address;
  const feeCollector = process.env.FEE_COLLECTOR_ADDRESS || deployer.address;

  log.step(1, 1, "Deploying CryptoPaymentGateway");
  log.substep(`Owner: ${shortAddress(owner)}`);
  log.substep(`Fee Collector: ${shortAddress(feeCollector)}`);
  log.substep(`Fee: ${config.feePercentage} basis points (${config.feePercentage / 100}%)`);

  const Gateway = await hre.ethers.getContractFactory("CryptoPaymentGateway");
  const deployStart = Date.now();
  const gasOverrides = getGasOverrides(config);
  
  const gateway = await Gateway.deploy(
    deployer.address,  // Temporary owner for setup
    feeCollector,
    config.feePercentage,
    gasOverrides
  );
  
  log.pending("Waiting for deployment...");
  await gateway.waitForDeployment();
  
  log.success(`Gateway deployed in ${formatDuration(Date.now() - deployStart)}`);
  log.info("Address", gateway.target);
  log.explorer(`${config.explorer}/address/${gateway.target}`);
  
  deploymentInfo.contracts.gateway = gateway.target;
  log.footer();

  // ═══════════════════════════════════════════════════════════════════
  // CONFIGURE GATEWAY
  // ═══════════════════════════════════════════════════════════════════
  log.title();
  log.header("🔧 CONFIGURING GATEWAY");
  log.divider();

  const totalSteps = 6;
  let currentStep = 0;

  try {
    // Step 1: Add native token
    currentStep++;
    log.step(currentStep, totalSteps, `Adding ${config.nativeToken} with oracle`);
    const nativeOracle = config.useMocks ? nativeFeed.target : config.oracles.native;
    await sendTx(`Adding ${config.nativeToken}`, gateway, "addSupportedToken", [ETH_ADDRESS, nativeOracle], config);
    
    // Step 2: Set native staleness
    currentStep++;
    log.step(currentStep, totalSteps, `Setting ${config.nativeToken} oracle staleness (${config.oracleStalenessSeconds / 3600}h)`);
    await sendTx(`Setting staleness to ${config.oracleStalenessSeconds}s`, gateway, "setMaxPriceStalenessSeconds", [ETH_ADDRESS, config.oracleStalenessSeconds], config);

    // Step 3: Add USDC
    currentStep++;
    log.step(currentStep, totalSteps, "Adding USDC with direct payment");
    const usdcAddress = config.useMocks ? usdc.target : config.tokens.usdc;
    const usdcOracle = config.useMocks ? stableFeed.target : config.oracles.stable;
    
    await sendTx("Adding USDC", gateway, "addSupportedToken", [usdcAddress, usdcOracle], config);
    await sendTx("Setting USDC staleness", gateway, "setMaxPriceStalenessSeconds", [usdcAddress, config.oracleStalenessSeconds], config);
    await sendTx("Enabling USDC direct payment", gateway, "enableDirectPayment", [usdcAddress], config);

    // Step 4: Add USDT
    currentStep++;
    log.step(currentStep, totalSteps, "Adding USDT with direct payment");
    const usdtAddress = config.useMocks ? usdt.target : config.tokens.usdt;
    const usdtOracle = config.useMocks ? stableFeed.target : config.oracles.stable;
    
    await sendTx("Adding USDT", gateway, "addSupportedToken", [usdtAddress, usdtOracle], config);
    await sendTx("Setting USDT staleness", gateway, "setMaxPriceStalenessSeconds", [usdtAddress, config.oracleStalenessSeconds], config);
    await sendTx("Enabling USDT direct payment", gateway, "enableDirectPayment", [usdtAddress], config);

    // Step 5: Set quote validity
    currentStep++;
    log.step(currentStep, totalSteps, `Setting quote validity (${config.quoteValidityBlocks} blocks)`);
    await sendTx(`Setting to ${config.quoteValidityBlocks} blocks`, gateway, "updateQuoteValidity", [config.quoteValidityBlocks], config);

    // Step 6: Transfer ownership (if different)
    currentStep++;
    log.step(currentStep, totalSteps, "Finalizing ownership");
    if (owner !== deployer.address) {
      await sendTx(`Transferring to ${shortAddress(owner)}`, gateway, "transferOwnership", [owner], config);
      deploymentInfo.config.ownershipTransferred = true;
    } else {
      log.substep("Owner is deployer, skipping transfer");
    }

    log.success("Gateway configured successfully!");

  } catch (error) {
    log.error(`Configuration failed at step ${currentStep}: ${error.message}`);
    deploymentInfo.configurationError = error.message;
    console.log(`\n${colors.gray}${error.stack}${colors.reset}`);
  }

  log.footer();

  // ═══════════════════════════════════════════════════════════════════
  // SAVE DEPLOYMENT INFO
  // ═══════════════════════════════════════════════════════════════════
  log.title();
  log.header("💾 SAVING DEPLOYMENT");
  log.divider();

  const deployDir = path.join(__dirname, "..", "deployed");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
    log.substep(`Created directory: ${deployDir}`);
  }

  const filename = path.join(deployDir, `${networkName}-v2.json`);
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  log.success(`Saved to: ${filename}`);
  log.footer();

  // ═══════════════════════════════════════════════════════════════════
  // VERIFY CONTRACT
  // ═══════════════════════════════════════════════════════════════════
  if (!config.useMocks && networkName !== "localhost" && networkName !== "hardhat") {
    log.title();
    log.header("🔍 VERIFYING CONTRACT");
    log.divider();
    
    log.pending("Waiting 15 seconds for block confirmations...");
    await sleep(15);
    
    log.step(1, 1, "Running verification");
    
    try {
      await hre.run("verify:verify", {
        address: gateway.target,
        constructorArguments: [
          deployer.address,
          feeCollector,
          config.feePercentage
        ]
      });
      log.success("Contract verified successfully!");
      deploymentInfo.verified = true;
    } catch (error) {
      if (error.message.includes("Already Verified") || error.message.includes("already been verified")) {
        log.success("Contract already verified!");
        deploymentInfo.verified = true;
      } else {
        log.warning(`Verification failed: ${error.message}`);
        log.substep("You can verify manually with:");
        console.log(`\n  npx hardhat verify --network ${networkName} ${gateway.target} "${deployer.address}" "${feeCollector}" ${config.feePercentage}\n`);
        deploymentInfo.verified = false;
        deploymentInfo.verificationError = error.message;
      }
    }
    
    // Save updated info with verification status
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    log.footer();
  }

  // ═══════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  const totalDuration = Date.now() - startTime;

  log.title();
  log.header("📊 DEPLOYMENT SUMMARY");
  log.divider();
  
  console.log();
  console.log(`  ${colors.bright}Contracts:${colors.reset}`);
  log.table({
    "Gateway": gateway.target,
    "USDC": deploymentInfo.contracts.usdc,
    "USDT": deploymentInfo.contracts.usdt
  });

  console.log();
  console.log(`  ${colors.bright}Settings:${colors.reset}`);
  log.table({
    "Fee": `${config.feePercentage / 100}%`,
    "Quote Validity": `${config.quoteValidityBlocks} blocks`,
    "Oracle Staleness": `${config.oracleStalenessSeconds / 3600}h`,
    "Owner": shortAddress(owner),
    "Fee Collector": shortAddress(feeCollector)
  });

  console.log();
  console.log(`  ${colors.bright}Links:${colors.reset}`);
  log.info("Explorer", `${config.explorer}/address/${gateway.target}`);
  log.info("Deployment File", filename);

  console.log();
  log.divider();
  log.info("Duration", formatDuration(totalDuration));
  log.info("Network", `${networkName} ${config.isTestnet ? '(Testnet)' : '(Mainnet)'}`);
  log.info("Verified", deploymentInfo.verified ? "✅ Yes" : "❌ No");
  log.info("Status", deploymentInfo.configurationError ? "⚠️ Partial" : "✅ Complete");
  
  log.footer();

  log.bigSuccess("🎉 DEPLOYMENT COMPLETE!");

  // Print command for backend update
  console.log(`${colors.bright}📝 Update backend networks.js with:${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────────────${colors.reset}`);
  console.log(`${networkName}: {`);
  console.log(`  chainId: ${config.chainId},`);
  console.log(`  name: "${config.isTestnet ? networkName.charAt(0).toUpperCase() + networkName.slice(1) + ' Testnet' : networkName.charAt(0).toUpperCase() + networkName.slice(1)}",`);
  console.log(`  nativeToken: "${config.nativeToken}",`);
  console.log(`  gateway: "${gateway.target}",`);
  console.log(`  usdc: "${deploymentInfo.contracts.usdc}",`);
  console.log(`  usdt: "${deploymentInfo.contracts.usdt}",`);
  console.log(`  explorerUrl: "${config.explorer}",`);
  console.log(`  blockTime: ${config.nativeToken === 'ETH' ? 12 : config.nativeToken === 'BNB' ? 3 : 2},`);
  console.log(`  quoteValidityBlocks: ${config.quoteValidityBlocks},`);
  console.log(`  oracleStalenessSeconds: ${config.oracleStalenessSeconds},`);
  console.log(`  enabled: true`);
  console.log(`}`);
  console.log(`${colors.cyan}─────────────────────────────────────────────────${colors.reset}\n`);

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
