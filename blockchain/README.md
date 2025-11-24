# BRSCryptoPaymentProtocol (BRSCPP)

**Author:** Slavcho Ivanov (Slavy)  
**Website:** [me.slavy.space](https://me.slavy.space)  
**GitHub:** [@ivanovslavy](https://github.com/ivanovslavy)  
**License:** MIT

## Overview

BRSCryptoPaymentProtocol is a decentralized cryptocurrency payment gateway for EVM-compatible blockchains. The protocol enables merchants to accept cryptocurrency payments without custody of funds, implementing a trustless payment processing system with built-in security features and hybrid oracle price validation.

## Architecture

### Core Components

**CryptoPaymentGateway Contract**
- Non-custodial payment processing
- Multi-token support (ETH, ERC20)
- Hybrid dual-oracle price validation system
- Quote-based payment locking mechanism
- Configurable fee structure with basis points
- Emergency pause functionality

**Oracle System**
- Primary: Chainlink Price Feeds
- Secondary: Custom fallback oracle
- Price deviation validation (configurable threshold)
- Staleness checks with per-token configuration
- Automatic failover between oracle sources

**Security Architecture**
- ReentrancyGuard protection (OpenZeppelin)
- Quote creator binding (prevents front-running)
- Quote usage tracking (prevents replay attacks)
- SafeERC20 implementation
- Ownable access control
- Pausable emergency mechanism

## Smart Contract Details

### Key Features

**Payment Processing**
- Lock price quotes with validity window (30-300 seconds)
- Process payments with locked quotes (ETH and ERC20)
- Automatic fee calculation and distribution
- Direct merchant settlement (no escrow)

**Fee Management**
- Configurable fee percentage (basis points)
- Separate fee collector address
- Owner-only fee configuration updates

**Supported Tokens**
- Native tokens (ETH, BNB, MATIC)
- ERC20 stablecoins (USDC, USDT)
- Extensible token support system

### Contract Functions

**User Functions**
```solidity
lockPriceQuote(address token, uint256 usdAmount) 
    returns (bytes32 quoteId, uint256 tokenAmount, uint256 validUntil)

processETHPaymentWithQuote(bytes32 quoteId, address merchant, string orderId) payable

processTokenPaymentWithQuote(bytes32 quoteId, address merchant, string orderId)

getPriceQuote(address token, uint256 usdAmount) view 
    returns (uint256 tokenAmount, uint256 tokenPriceUSD, uint256 validityDuration)
```

**Admin Functions**
```solidity
updateFeePercentage(uint256 newFeePercentage)
updateFeeCollector(address newFeeCollector)
addSupportedToken(address token, address priceFeed)
removeSupportedToken(address token)
addSecondaryOracle(address token, address secondaryOracle)
updateQuoteValidity(uint256 newDuration)
updateMaxPriceDeviation(uint256 newDeviation)
pause()
unpause()
emergencyWithdraw(address token, uint256 amount, address to)
```

## Deployment

### Network Configuration

The protocol has been deployed and verified on Ethereum Sepolia testnet with comprehensive testing infrastructure.

**Deployment Script: `scripts/deploy+verify.js`**

Features:
- Automated contract deployment
- Mock token deployment (testnet only)
- Oracle configuration and setup
- Automatic Etherscan verification
- Deployment state persistence (JSON)
- Support for mainnet, testnet, and local networks

**Deployment Process:**
```bash
npx hardhat run scripts/deploy+verify.js --network sepolia
```

**Configuration (.env):**
```
PRIVATE_KEY=<deployer_private_key>
OWNER_ADDRESS=<contract_owner>
FEE_COLLECTOR_ADDRESS=<fee_recipient>
INITIAL_FEE_PERCENTAGE=50
INFURA_API_KEY=<infura_key>
ETHERSCAN_API_KEY=<etherscan_key>
```

**Deployment Output:**
- Contract addresses saved to `deployed/{network}.json`
- Verification results saved to `deployed/{network}-verification.json`
- Automatic Etherscan verification with retry logic
- Oracle configuration records

### Security Testing Deployment

**Attacker Contract Deployment: `scripts/deploy-attacker.js`**

Features:
- MaliciousAttacker contract deployment
- Hacker wallet as contract owner
- Automatic funding with test ETH
- Etherscan verification
- Integration with existing gateway deployment

**Deployment Process:**
```bash
npx hardhat run scripts/deploy-attacker.js --network sepolia
```

**MaliciousAttacker Contract:**
- Reentrancy attack simulation
- Front-running attack simulation
- Quote replay attack simulation
- Gas griefing simulation
- Withdraw functions (ETH and ERC20)

## Testing

### Phase 1: Basic Security Tests

**Script: `scripts/security-test.js`**

Test Coverage:
- Unauthorized access attempts (owner-only functions)
- Quote replay attacks
- Expired quote usage
- Amount mismatch validation
- Zero address protection
- Unauthorized pause attempts
- Unauthorized emergency withdraw
- Token approval requirements
- Oracle manipulation attempts
- Front-running protection
- Integer overflow protection

**Execution:**
```bash
npx hardhat run scripts/security-test.js --network sepolia
```

**Results:** 12/12 tests passed (100% security score)

### Phase 2: Advanced Contract Attacks

**Script: `scripts/security-test-phase2.js`**

Test Coverage:
- ETH reentrancy via malicious receive()
- ERC20 reentrancy via token callbacks
- Front-running with malicious contract
- Quote replay via attacker contract
- Gas griefing attacks
- Legitimate withdrawal operations

**Attack Vectors Tested:**
1. Reentrancy on ETH payment
2. Reentrancy on ERC20 payment
3. Quote theft via front-running
4. Quote replay exploitation
5. Gas consumption attacks
6. Withdrawal function verification

**Execution:**
```bash
npx hardhat run scripts/security-test-phase2.js --network sepolia
```

**Results:** 7/7 tests passed (100% security score)

### Payment Flow Tests

**Script: `scripts/test-payment-flow.js`**

Test Coverage:
- Complete payment workflow (ETH, USDC, USDT)
- Quote generation and locking
- Price feed validation
- Fee calculation verification
- Balance change tracking
- Event emission validation

**Execution:**
```bash
npx hardhat run scripts/test-payment-flow.js --network sepolia
```

**Results:** All payment flows successful with correct fee distribution

### Vulnerability Analysis

**Script: `scripts/analyze-vulnerabilities.js`**

Detailed analysis with step-by-step demonstration:
- Quote replay attack demonstration
- Front-running attack demonstration
- Root cause analysis
- Impact assessment
- Recommended fixes validation

**Execution:**
```bash
npx hardhat run scripts/analyze-vulnerabilities.js --network sepolia
```

### Static Analysis

**Slither Analysis:**
```bash
slither contracts/CryptoPaymentGateway.sol
```

**Results:** 0 vulnerabilities detected

## Security Measures

### Implemented Protections

**Reentrancy Protection**
- OpenZeppelin ReentrancyGuard on all payment functions
- Prevents nested function calls during execution
- Tested against malicious receive() callbacks

**Front-Running Protection**
- Quote creator binding (quotes tied to msg.sender)
- UnauthorizedQuoteUse error for mismatched creators
- Prevents quote theft in mempool

**Replay Attack Protection**
- Quote usage tracking (isUsed flag)
- QuoteAlreadyUsed error on reuse attempts
- One-time use enforcement per quote

**Access Control**
- Ownable pattern for admin functions
- onlyOwner modifier on sensitive operations
- Separate fee collector address management

**Oracle Security**
- Dual oracle validation system
- Price deviation checks (configurable threshold)
- Staleness validation per token
- Automatic fallback mechanism

**ERC20 Safety**
- SafeERC20 library usage
- Protection against malformed tokens
- Approval validation before transfers

**Gas Management**
- Low-level call() instead of transfer()
- Prevents gas griefing attacks
- Graceful failure handling

**Emergency Controls**
- Pausable functionality
- Emergency withdrawal (owner-only)
- Circuit breaker mechanism

## Technical Specifications

**Solidity Version:** 0.8.20  
**Dependencies:**
- OpenZeppelin Contracts 5.0.0
- Chainlink Contracts 1.2.0

**Gas Optimization:**
- Efficient storage patterns
- Minimal external calls
- Optimized loop structures

**Network Support:**
- Ethereum (Mainnet, Sepolia)
- BSC (Mainnet, Testnet)
- Polygon (Mainnet, Amoy)
- Any EVM-compatible chain with Chainlink oracles

## Project Structure
```
gateway2/
├── contracts/
│   ├── CryptoPaymentGateway.sol    # Main payment gateway
│   ├── MaliciousAttacker.sol       # Security testing contract
│   ├── MockERC20.sol               # Test token implementation
│   └── MockV3Aggregator.sol        # Test oracle implementation
├── scripts/
│   ├── deploy+verify.js            # Main deployment script
│   ├── deploy-attacker.js          # Attacker contract deployment
│   ├── security-test.js            # Phase 1 security tests
│   ├── security-test-phase2.js     # Phase 2 security tests
│   ├── test-payment-flow.js        # Payment workflow tests
│   ├── analyze-vulnerabilities.js  # Vulnerability analysis
│   └── change-fee-collector.js     # Fee collector update utility
├── deployed/
│   ├── {network}.json              # Deployment addresses
│   └── {network}-verification.json # Verification results
├── tested/
│   ├── security-test-*.json        # Security test results
│   ├── payment-flow-test-*.json    # Payment test results
│   └── vulnerability-analysis-*.json # Analysis results
├── hardhat.config.js               # Hardhat configuration
├── package.json                    # Project dependencies
└── README.md                       # This file
```

## Configuration

### Environment Variables
```
PRIVATE_KEY=                    # Deployer private key
CUSTOMER_PRIVATE_KEY=           # Test customer private key
HACKER_PRIVATE_KEY=             # Security test private key
OWNER_ADDRESS=                  # Contract owner address
FEE_COLLECTOR_ADDRESS=          # Fee recipient address
INITIAL_FEE_PERCENTAGE=         # Fee in basis points (50 = 0.5%)
INFURA_API_KEY=                 # Infura project ID
ETHERSCAN_API_KEY=              # Etherscan API key
```

### Network Configuration

Supported networks configured in `hardhat.config.js`:
- localhost
- sepolia
- mainnet
- bsc
- bsctestnet
- polygon
- amoy

## Development

### Setup
```bash
npm install
```

### Compilation
```bash
npx hardhat compile
```

### Testing
```bash
# Local tests
npx hardhat test

# Network tests
npx hardhat run scripts/test-payment-flow.js --network sepolia
npx hardhat run scripts/security-test.js --network sepolia
npx hardhat run scripts/security-test-phase2.js --network sepolia
```

### Deployment
```bash
# Deploy main gateway
npx hardhat run scripts/deploy+verify.js --network sepolia

# Deploy attacker contract
npx hardhat run scripts/deploy-attacker.js --network sepolia
```

## Future Enhancements

- Multi-signature wallet integration
- Batch payment processing
- Subscription payment support
- Cross-chain payment bridging
- Enhanced analytics and reporting
- SDK for merchant integration
- REST API backend service
- Frontend merchant dashboard

## Audit Status

- Static Analysis: Slither (0 vulnerabilities)
- Security Testing: Phase 1 (100% pass rate)
- Security Testing: Phase 2 (100% pass rate)
- Third-party audit: Pending

## Contact

**Slavcho Ivanov (Slavy)**  
Website: [me.slavy.space](https://me.slavy.space)  
GitHub: [@ivanovslavy](https://github.com/ivanovslavy)

## License

MIT License - See LICENSE file for details

---

**Note:** This is a development version deployed on testnet. Exercise caution and conduct thorough testing before mainnet deployment. The protocol is provided as-is without warranty. Users are responsible for their own due diligence and security audits.
