# BRSCPP Payment Application

Customer-facing checkout application for cryptocurrency and fiat payments.

**Version:** 2.0  
**Author:** Slavcho Ivanov  
**Application URL:** https://payment.brscpp.slavy.space  
**Status:** Production (December 2025)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Payment Flow](#payment-flow)
4. [Pages and Components](#pages-and-components)
5. [Network Configuration](#network-configuration)
6. [Smart Contract Integration](#smart-contract-integration)
7. [NFT Gift System](#nft-gift-system)
8. [Installation](#installation)
9. [Configuration](#configuration)
10. [Deployment](#deployment)
11. [User Experience](#user-experience)
12. [Error Handling](#error-handling)
13. [Testing](#testing)
14. [Performance](#performance)
15. [Troubleshooting](#troubleshooting)
16. [Future Enhancements](#future-enhancements)

---

## Overview

The payment application provides a complete checkout experience for customers, supporting both cryptocurrency and fiat payment methods through a unified interface.

### Key Features

**Payment Methods:**
- Cryptocurrency payments (ETH, BNB, MATIC, USDC, USDT)
- Credit card payments via Stripe
- Unified payment flow for both methods

**Blockchain Integration:**
- Multi-chain support (Sepolia, BSC, Polygon Amoy)
- MetaMask and Coinbase Wallet compatibility
- Direct stablecoin transfers (v2 optimization)
- Quote-based pricing for native tokens

**User Experience:**
- Mobile-responsive design
- Real-time payment status updates
- Multi-currency support (12 fiat currencies)
- NFT gift claiming system
- Block explorer integration

**Technical Features:**
- React 18 with Vite
- ethers.js v6 integration
- TailwindCSS styling
- React Router v6
- Context-based state management

---

## Architecture

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Styling | TailwindCSS | 3.x |
| Routing | React Router | 6.x |
| Web3 | ethers.js | 6.x |
| State | Context API | - |

### Application Structure
```
payment-app/
├── src/
│   ├── pages/
│   │   ├── Checkout.jsx         # Main payment flow
│   │   └── Success.jsx          # Payment confirmation + NFT claim
│   ├── components/
│   │   ├── WalletConnect.jsx    # Wallet connection UI
│   │   ├── NetworkSelector.jsx  # Network switching
│   │   ├── TokenSelector.jsx    # Token selection
│   │   ├── CountdownTimer.jsx   # Quote expiration timer
│   │   └── NFTClaim.jsx         # NFT gift claiming
│   ├── utils/
│   │   ├── contracts.js         # Contract ABIs
│   │   ├── networks.js          # Network configurations
│   │   └── api.js               # API client
│   ├── App.jsx                  # Main component
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles
├── public/
│   └── assets/                  # Static assets
├── package.json
├── vite.config.js
└── README.md
```

### Data Flow
```
┌──────────────────────────────────────────────────────┐
│             Customer Payment Flow                    │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  1. Load Payment Request (GET /api/customer/payment) │
│     - Order details                                  │
│     - Amount in USD and original currency            │
│     - Allowed payment methods                        │
│     - Merchant information                           │
└────────────────────┬─────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  Crypto Payment  │   │  Fiat Payment    │
│  (Multi-chain)   │   │  (Stripe)        │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│  Connect Wallet  │   │  Redirect to     │
│  Select Network  │   │  Stripe Checkout │
│  Select Token    │   └────────┬─────────┘
│  Prepare Payment │            │
│  Confirm TX      │            ▼
└────────┬─────────┘   ┌──────────────────┐
         │             │  Complete on     │
         │             │  Stripe          │
         │             └────────┬─────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │  Payment Confirmed   │
         │  NFT Gift Available  │
         └──────────────────────┘
```

---

## Payment Flow

### Cryptocurrency Payment

**Step 1: Initialize**

Customer arrives at payment URL:
```
https://payment.brscpp.slavy.space/checkout/ORDER-123
```

Application loads payment request from API:
```javascript
const response = await fetch(`${API_BASE}/api/customer/payment/${orderId}`);
const paymentRequest = await response.json();
```

**Step 2: Select Payment Method**

Customer chooses between:
- Pay with Crypto
- Pay with Card (Stripe)

**Step 3: Connect Wallet (Crypto Path)**
```javascript
// Request wallet connection
await window.ethereum.request({ method: 'eth_requestAccounts' });

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const address = await signer.getAddress();
```

**Step 4: Select Network**

Customer chooses:
- Ethereum Sepolia
- BSC Testnet
- Polygon Amoy

Application switches network:
```javascript
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: networkConfig.hexChainId }]
});
```

**Step 5: Select Token**

Available tokens based on network:
- Native: ETH / BNB / MATIC
- USDC (6 decimals)
- USDT (6 decimals)

**Step 6: Prepare Payment**

**For Native Tokens (Quote Required):**
```javascript
const contract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, signer);

const tx = await contract.lockPriceQuote(
  ETH_ADDRESS, // 0x0 for native
  Math.floor(paymentRequest.amountUsd * 100) // USD cents
);

const receipt = await tx.wait();
// Extract quoteId, tokenAmount, validUntil from event
```

**For Stablecoins (Direct Transfer):**
```javascript
// No quote needed - direct payment
const amount = ethers.parseUnits(
  paymentRequest.amountUsd.toString(),
  token.decimals
);
```

**Step 7: Approve (Stablecoins Only)**
```javascript
const tokenContract = new ethers.Contract(
  tokenAddress,
  ERC20_ABI,
  signer
);

const approveTx = await tokenContract.approve(
  gatewayAddress,
  tokenAmount
);

await approveTx.wait();
```

**Step 8: Confirm Payment**

**Native Token:**
```javascript
const tx = await contract.processETHPaymentWithQuote(
  quoteId,
  merchantAddress,
  orderId,
  { value: tokenAmount }
);
```

**Stablecoin:**
```javascript
const tx = await contract.processDirectPayment(
  tokenAddress,
  tokenAmount,
  merchantAddress,
  orderId
);
```

**Step 9: Success**

Redirect to success page with:
- Transaction hash
- Block explorer link
- NFT claim option

### Fiat Payment (Stripe)

**Step 1-2:** Same as crypto path

**Step 3: Create Stripe Session**
```javascript
const response = await fetch(
  `${API_BASE}/api/customer/payment/${orderId}/stripe`,
  { method: 'POST' }
);

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe
```

**Step 4: Complete on Stripe**

Customer enters card details on Stripe Checkout.

**Step 5: Return to Success**

After payment, Stripe redirects to:
```
https://payment.brscpp.slavy.space/success/ORDER-123?session_id=...
```

---

## Pages and Components

### Checkout Page

**Route:** `/checkout/:orderId`

**State Management:**
```javascript
const [paymentRequest, setPaymentRequest] = useState(null);
const [selectedMethod, setSelectedMethod] = useState(null);
const [wallet, setWallet] = useState(null);
const [selectedNetwork, setSelectedNetwork] = useState(null);
const [networkConfig, setNetworkConfig] = useState(null);
const [selectedToken, setSelectedToken] = useState(null);
const [quote, setQuote] = useState(null);
const [paymentStatus, setPaymentStatus] = useState(null);
```

**Component Sections:**

1. **Payment Details Card**
   - Order ID
   - Amount (original currency + USD conversion)
   - Exchange rate (if converted)
   - Description
   - Merchant address

2. **Payment Method Selection**
   - Pay with Crypto button
   - Pay with Card button (if Stripe enabled)

3. **Wallet Connection**
   - Connect button
   - Connected address display
   - Network indicator

4. **Network Selector** (Crypto path)
   - Sepolia
   - BSC Testnet
   - Amoy

5. **Token Selector** (Crypto path)
   - Native token
   - USDC
   - USDT

6. **Payment Preparation**
   - "Prepare Payment" button
   - Quote display (native tokens)
   - Amount confirmation

7. **Payment Confirmation**
   - Countdown timer (if quote)
   - "Pay Now" button
   - Status messages
   - Loading indicators

### Success Page

**Route:** `/success/:orderId`

**Features:**

1. **Success Message**
   - Check icon
   - "Payment Confirmed" message
   - Order ID display

2. **Payment Details**
   - Amount paid
   - Token/payment method
   - Transaction hash
   - Block explorer link
   - Network name

3. **NFT Gift Section**
   - "Claim Your Gift NFT" button
   - Wallet connection (if not connected)
   - Network selection
   - Signature request
   - Minting transaction
   - Success confirmation

4. **Actions**
   - Return to merchant button
   - View receipt link

---

## Network Configuration

### Supported Networks

**Ethereum Sepolia:**
```javascript
{
  chainId: 11155111,
  hexChainId: '0xaa36a7',
  name: 'Sepolia',
  nativeToken: 'ETH',
  blockTime: 12,
  explorer: 'https://sepolia.etherscan.io',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  }
}
```

**BSC Testnet:**
```javascript
{
  chainId: 97,
  hexChainId: '0x61',
  name: 'BSC Testnet',
  nativeToken: 'BNB',
  blockTime: 3,
  explorer: 'https://testnet.bscscan.com',
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  }
}
```

**Polygon Amoy:**
```javascript
{
  chainId: 80002,
  hexChainId: '0x13882',
  name: 'Polygon Amoy Testnet',
  nativeToken: 'MATIC',
  blockTime: 2,
  explorer: 'https://amoy.polygonscan.com',
  rpcUrl: 'https://rpc-amoy.polygon.technology',
  rpcFallbacks: [
    'https://polygon-amoy-bor-rpc.publicnode.com',
    'https://rpc.ankr.com/polygon_amoy'
  ],
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18
  }
}
```

### Network Switching

**Add Network if Not Present:**
```javascript
try {
  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: networkConfig.hexChainId,
      chainName: networkConfig.name,
      nativeCurrency: networkConfig.nativeCurrency,
      rpcUrls: [networkConfig.rpcUrl],
      blockExplorerUrls: [networkConfig.explorer]
    }]
  });
} catch (error) {
  console.error('Failed to add network:', error);
}
```

---

## Smart Contract Integration

### Contract ABIs

**Gateway Contract:**
```javascript
const GATEWAY_ABI = [
  "function lockPriceQuote(address token, uint256 usdAmount) external returns (bytes32, uint256, uint256)",
  "function processETHPaymentWithQuote(bytes32 quoteId, address merchant, string memory orderId) external payable",
  "function processDirectPayment(address token, uint256 amount, address merchant, string calldata orderId) external returns (uint256)",
  "event PriceQuoteGenerated(bytes32 indexed quoteId, address indexed token, uint256 usdAmount, uint256 tokenAmount, uint256 tokenPriceUSD, uint256 validUntilBlock)"
];
```

**ERC20 Token:**
```javascript
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];
```

### Contract Addresses

**Sepolia:**
- Gateway: `0xCfC49C966E1D579FDC98c5a1D14D8c41CD5E63F5`
- USDC: `0xC4De068C028127bdB44670Edb82e6E3Ff4113E49`
- USDT: `0x00D75E583DF2998C7582842e69208ad90820Eaa1`

**BSC Testnet:**
- Gateway: `0x140bA7112a5eED6Be6a38fbF046578F6FF2bF7dc`
- USDC: `0x45787D76D24F3b47663eC3DEcc76f46C20Fa0c4C`
- USDT: `0xb6dFe9F6810955A3bcbdf7F99418C95Cb073F23D`

**Polygon Amoy:**
- Gateway: `0xFb72aa49336A7DDc60221e31d8A612188799b7F5`
- USDC: `0x3F6357a74Bec93F6281aA1FC705133eC71a1BaE2`
- USDT: `0x9f9eF1DA8A630917383B0b78104887Da1D48dA01`

---

## NFT Gift System

### Gift Claiming Flow

**Step 1: Display Claim Option**

After successful payment, show NFT claim button on success page.

**Step 2: Connect Wallet**

If not already connected, request wallet connection.

**Step 3: Request Signature**
```javascript
const response = await fetch(`${API_BASE}/api/nft-gift/signature`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: orderId,
    customerAddress: walletAddress,
    network: selectedNetwork
  })
});

const { signature, contractAddress } = await response.json();
```

**Step 4: Mint NFT**
```javascript
const nftContract = new ethers.Contract(
  contractAddress,
  NFT_ABI,
  signer
);

const tx = await nftContract.claimGift(orderId, signature);
await tx.wait();
```

**Step 5: Confirmation**

Display success message with:
- NFT token ID
- OpenSea link (if available)
- Transaction hash

### NFT Contract Addresses

- Sepolia: `0x3699fcA271bE686f8501aDba0f24dDa4358ebbAA`
- BSC: `0xF166733eD46F7A7185A31eC6E0D6b74C06c57ff8`
- Amoy: `0xD24a89dc1686C2F88d33A70250473495459C564a`

---

## Installation

### Prerequisites
```
Node.js >= 20.x
npm or yarn >= 9.x
MetaMask or Coinbase Wallet browser extension
```

### Setup
```bash
# Navigate to directory
cd frontend/payment-app

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "ethers": "^6.15.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

---

## Configuration

### Environment Variables
```bash
# API Configuration
VITE_API_BASE=https://api.brscpp.slavy.space

# Network RPCs (optional overrides)
VITE_SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
VITE_BSC_RPC=https://bsc-testnet-rpc.publicnode.com
VITE_AMOY_RPC_PRIMARY=https://rpc-amoy.polygon.technology
VITE_AMOY_RPC_FALLBACK_1=https://polygon-amoy-bor-rpc.publicnode.com

# Feature Flags
VITE_ENABLE_DEBUG=false
VITE_ENABLE_AMOY=true
```

### Vite Configuration
```javascript
// vite.config.js
export default {
  plugins: [react()],
  build: {
    outDir: 'build',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ethers': ['ethers']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  preview: {
    port: 3066,
    host: '0.0.0.0'
  }
}
```

---

## Deployment

### Build Process
```bash
cd ~/brscpp/pp-v2/frontend/payment-app
npm run build
```

Output directory: `build/`

### Systemd Service

**Service File:** `/etc/systemd/system/brscpp-v2-payment-app.service`
```ini
[Unit]
Description=BRSCPP v2 Payment Application
After=network.target

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/brscpp/pp-v2/frontend/payment-app
ExecStart=/usr/bin/npx vite preview --host 0.0.0.0 --port 3066
Restart=always
RestartSec=10

Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Service Management
```bash
# Enable service
sudo systemctl enable brscpp-v2-payment-app.service

# Start service
sudo systemctl start brscpp-v2-payment-app.service

# Check status
sudo systemctl status brscpp-v2-payment-app.service

# Restart after rebuild
cd ~/brscpp/pp-v2/frontend/payment-app
npm run build
sudo systemctl restart brscpp-v2-payment-app.service

# View logs
sudo journalctl -u brscpp-v2-payment-app.service -f
```

### Apache Configuration
```apache
<VirtualHost *:443>
    ServerName payment.brscpp.slavy.space
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3066/
    ProxyPassReverse / http://127.0.0.1:3066/
    
    ErrorLog /var/log/apache2/payment-brscpp-error.log
    CustomLog /var/log/apache2/payment-brscpp-access.log combined
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/payment.brscpp.slavy.space/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/payment.brscpp.slavy.space/privkey.pem
</VirtualHost>
```

---

## User Experience

### Mobile Responsiveness

Application fully responsive on:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

**Key Mobile Features:**
- Touch-friendly buttons
- Collapsible sections
- Optimized font sizes
- Simplified navigation

### Loading States

**Payment Request Loading:**
```
Loading payment request...
```

**Wallet Connection:**
```
Connecting to wallet...
```

**Network Switching:**
```
Switching to [Network Name]...
```

**Quote Creation:**
```
Creating price quote...
```

**Payment Processing:**
```
Confirming in wallet...
Waiting for confirmation...
Payment confirmed!
```

### Status Messages

**Info:**
- "Please connect your wallet to continue"
- "Switch to [Network] to proceed"
- "Quote valid for 45 seconds"

**Success:**
- "Wallet connected successfully"
- "Quote created successfully"
- "Payment confirmed!"

**Error:**
- "Failed to connect wallet"
- "Quote expired. Please create a new quote"
- "Transaction rejected by user"

---

## Error Handling

### Error Types

**Connection Errors:**
```javascript
// Wallet not found
if (!window.ethereum) {
  setError('Please install MetaMask or Coinbase Wallet');
}

// Connection rejected
catch (error) {
  if (error.code === 4001) {
    setError('Connection request rejected');
  }
}
```

**Network Errors:**
```javascript
// Wrong network
if (currentChainId !== networkConfig.chainId) {
  setError(`Please switch to ${networkConfig.name}`);
}

// Network unavailable
catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    setError('Network temporarily unavailable');
  }
}
```

**Transaction Errors:**
```javascript
// Insufficient balance
catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    setError('Insufficient balance for transaction');
  }
}

// User rejected
catch (error) {
  if (error.code === 4001) {
    setError('Transaction cancelled');
  }
}

// Quote expired
catch (error) {
  if (error.message.includes('QuoteExpired')) {
    setError('Quote expired. Please create a new quote');
    setQuote(null);
  }
}
```

### Error Display Component
```javascript
{error && (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{error}</span>
  </div>
)}
```

---

## Testing

### Manual Testing Checklist

**Crypto Payment Flow:**
- [ ] Load payment request
- [ ] Connect MetaMask
- [ ] Connect Coinbase Wallet
- [ ] Switch to Sepolia
- [ ] Switch to BSC
- [ ] Switch to Amoy
- [ ] Select ETH payment
- [ ] Select USDC payment
- [ ] Select USDT payment
- [ ] Create quote (native)
- [ ] Approve token (stablecoin)
- [ ] Confirm payment
- [ ] Verify transaction
- [ ] Claim NFT gift

**Fiat Payment Flow:**
- [ ] Select "Pay with Card"
- [ ] Redirect to Stripe
- [ ] Complete payment
- [ ] Return to success page
- [ ] Connect wallet for NFT
- [ ] Claim NFT gift

**Error Scenarios:**
- [ ] No wallet installed
- [ ] Wrong network selected
- [ ] Insufficient balance
- [ ] Rejected transaction
- [ ] Expired quote
- [ ] Network timeout

### Test Orders
```bash
# Create test payment
curl -X POST https://api.brscpp.slavy.space/api/merchant/payment-request \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-'$(date +%s)'",
    "amount": 10.00,
    "currency": "USD",
    "description": "Test payment"
  }'

# Get payment URL from response
# Visit in browser to test
```

---

## Performance

### Bundle Analysis

**Production Build:**
```
Total: ~520KB (gzipped: ~180KB)
React: ~135KB
ethers.js: ~180KB
Router: ~35KB
TailwindCSS: ~50KB
Application: ~120KB
```

### Load Times

- Initial page load: <2 seconds
- Wallet connection: <1 second
- Network switching: <3 seconds
- Quote creation: <10 seconds (blockchain dependent)
- Payment confirmation: 12-15 seconds (blockchain dependent)

### Optimization Techniques

**Code Splitting:**
```javascript
const Success = lazy(() => import('./pages/Success'));
```

**Memoization:**
```javascript
const tokenOptions = useMemo(() => 
  availableTokens.map(token => ({...})),
  [availableTokens]
);
```

**Debouncing:**
```javascript
const debouncedRefresh = debounce(refreshBalance, 1000);
```

---

## Troubleshooting

### Common Issues

**"MetaMask Not Detected"**

Solution: Install MetaMask browser extension from https://metamask.io

**"Wrong Network"**

Solution: Click network selector and choose correct network, or allow automatic network switching.

**"Transaction Failed"**

Possible causes:
- Insufficient gas
- Quote expired
- Network congestion

Solution: Check balance, create new quote, or try again later.

**"Approval Failed" (Stablecoins)**

Solution: Ensure sufficient token balance and try again.

**Amoy Network Issues**

Known issue: Amoy RPC endpoints sometimes unstable.

Solution: Application automatically tries fallback RPCs. If still failing, use Sepolia or BSC instead.

### Debug Mode

Enable debug logging:
```javascript
// Add to browser console
localStorage.setItem('debug', 'true');
```

View debug output in browser console for detailed transaction information.

---

## Future Enhancements

**Wallet Support:**
- WalletConnect integration
- Coinbase Wallet improvements
- Ledger hardware wallet support
- Trust Wallet mobile support

**Payment Features:**
- QR code payments
- Payment links
- Subscription payments
- Batch payments

**User Experience:**
- Multi-language support (i18n)
- Dark mode toggle
- Payment history
- Saved payment preferences
- Email receipts

**Technical:**
- Progressive Web App (PWA)
- Offline mode
- Transaction retry logic
- Gas price optimization

---

## Related Documentation

- [Main Project Documentation](../../README.md)
- [Backend API Documentation](../../backend/README.md)
- [Smart Contracts Documentation](../../blockchain/README.md)
- [Merchant Dashboard](../merchant-dashboard/README.md)
- [Developer Integration Guide](../../DEV_SUPPORT.md)

---

## License

MIT License

---

**Last Updated:** December 22, 2025  
**Document Version:** 2.0  
**Author:** Slavcho Ivanov
