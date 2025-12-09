# BRSCPP Payment Application

Customer-facing checkout application for completing cryptocurrency payments.

**Application URL:** https://app.pp.slavy.space

**Status:** Live (Production)

---

## Navigation

- [Main Project README](../../README.md)
- [Smart Contracts Documentation](../../blockchain/README.md)
- [BRSCPP Backend](../../backend/brscpp_backend/README.md)
- [Test Shop Backend](../../backend/testshop_backend/README.md)
- [Marketing Site](../marketing_app/README.md)
- [Test Shop Frontend](../testshop_app/README.md)

---

## Overview

Payment application handles the complete customer checkout flow from quote creation to payment confirmation. Customers connect their wallet, select network and token, create price-locked quotes, and complete payments.

### Purpose

- Multi-chain payment processing
- Price-locked quotes with countdown timers
- Native and stablecoin support
- Real-time payment status tracking
- Transaction verification and confirmation

### Key Features

- MetaMask wallet integration
- Multi-network support (Sepolia, BSC Testnet)
- Multi-token support (Native, USDC, USDT)
- Quote creation with 60-120 second timers
- Token approval flow for stablecoins
- Payment confirmation with explorer links
- Responsive mobile-friendly design

---

## Architecture

### Technology Stack

**Framework:** React 18 with Vite

**Styling:** TailwindCSS

**Routing:** React Router v6

**Blockchain:** ethers.js v6

**State Management:** React Context API

**Build Tool:** Vite

### Application Flow
```
Customer arrives at payment URL
         ↓
┌─────────────────────────┐
│  Load Payment Request   │
│  GET /api/customer/     │
│      payment/:orderId   │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Connect Wallet         │
│  MetaMask Integration   │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Select Network         │
│  Sepolia / BSC Testnet  │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Select Token           │
│  ETH/BNB/USDC/USDT      │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Create Quote           │
│  lockPriceQuote()       │
│  Timer: 60-120s         │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Approve (Stablecoins)  │
│  approve() if needed    │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Confirm Payment        │
│  Send transaction       │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Payment Success        │
│  Transaction confirmed  │
└─────────────────────────┘
```

### Component Structure
```
payment-app/
├── src/
│   ├── pages/
│   │   ├── Checkout.jsx      Main payment flow
│   │   ├── Success.jsx       Payment confirmed
│   │   └── Error.jsx         Payment failed
│   ├── components/
│   │   ├── WalletConnect.jsx Wallet connection
│   │   ├── NetworkSelector.jsx Network switching
│   │   ├── TokenSelector.jsx Token selection
│   │   ├── QuoteTimer.jsx    Countdown timer
│   │   └── PaymentStatus.jsx Status display
│   ├── contexts/
│   │   └── WalletContext.jsx Wallet state
│   ├── utils/
│   │   ├── contracts.js      Contract ABIs
│   │   └── networks.js       Network configs
│   ├── App.jsx               Main component
│   ├── main.jsx              Entry point
│   └── index.css             Global styles
├── public/                   Static assets
├── package.json              Dependencies
├── vite.config.js            Vite config
└── README.md                 This file
```

---

## Pages

### Checkout Page

**Route:** `/checkout/:orderId`

**Purpose:** Complete payment flow

**Sections:**

1. **Payment Header**
   - Order ID display
   - Amount in USD
   - Merchant name

2. **Wallet Connection**
   - Connect MetaMask button
   - Connected address display
   - Network status indicator

3. **Network Selection**
   - Sepolia Testnet
   - BSC Testnet
   - Auto-switch functionality

4. **Token Selection**
   - Native tokens (ETH, BNB)
   - Stablecoins (USDC, USDT)
   - Balance display

5. **Quote Creation**
   - Lock price button
   - Timer countdown (60-120s)
   - Token amount display
   - Exchange rate display

6. **Payment Flow**
   - Approve button (stablecoins only)
   - Confirm payment button
   - Transaction status
   - Progress indicators

7. **Debug Panel** (development)
   - Event logs
   - State inspection
   - Error messages

**State Management:**
```javascript
const [paymentRequest, setPaymentRequest] = useState(null);
const [wallet, setWallet] = useState({ address: '', signer: null });
const [selectedNetwork, setSelectedNetwork] = useState('sepolia');
const [selectedToken, setSelectedToken] = useState(null);
const [quote, setQuote] = useState(null);
const [paymentStatus, setPaymentStatus] = useState(null);
```

### Success Page

**Route:** `/success/:orderId`

**Purpose:** Payment confirmation

**Features:**
- Success icon and message
- Order details display
- Amount and network info
- Transaction hash
- Block explorer link
- Return to merchant button

**Data Display:**
```javascript
{
  orderId: "ORDER-123",
  amountUsd: "100.00",
  network: "Sepolia Testnet",
  transactionHash: "0x...",
  explorerUrl: "https://sepolia.etherscan.io/tx/0x..."
}
```

### Error Page

**Route:** `/error/:orderId`

**Purpose:** Error handling

**Features:**
- Error icon and message
- Error details
- Troubleshooting tips
- Retry button
- Support contact link

---

## Network Configuration

### Supported Networks

**Sepolia Testnet**
```javascript
{
  chainId: 11155111,
  name: 'Sepolia Testnet',
  nativeToken: 'ETH',
  gateway: '0x1378329ABE689594355a95bDAbEaBF015ef9CF39',
  usdc: '0xC4De068C028127bdB44670Edb82e6E3Ff4113E49',
  usdt: '0x00D75E583DF2998C7582842e69208ad90820Eaa1',
  explorerUrl: 'https://sepolia.etherscan.io',
  quoteTimer: 120, // seconds
  fee: 1.0 // percent
}
```

**BSC Testnet**
```javascript
{
  chainId: 97,
  name: 'BSC Testnet',
  nativeToken: 'BNB',
  gateway: '0x0E2878bC634Ac0c1C4d3dA22CFb171Fb67a2d6e7',
  usdc: '0x45787D76D24F3b47663eC3DEcc76f46C20Fa0c4C',
  usdt: '0xb6dFe9F6810955A3bcbdf7F99418C95Cb073F23D',
  explorerUrl: 'https://testnet.bscscan.com',
  quoteTimer: 60, // seconds
  fee: 0.5 // percent
}
```

### Network Switching
```javascript
async function switchNetwork(chainId) {
  await window.ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: `0x${chainId.toString(16)}` }]
  });
}
```

---

## Smart Contract Integration

### Gateway Contract ABI
```javascript
const GATEWAY_ABI = [
  "function lockPriceQuote(address token, uint256 amountUsdCents) external returns (bytes32)",
  "function getQuote(bytes32 quoteId) external view returns (tuple(address creator, address token, uint256 tokenAmount, uint256 amountUsdCents, uint256 validUntil, bool used))",
  "function processPayment(bytes32 quoteId, address merchant, string memory orderId) external payable"
];
```

### Token Contract ABI
```javascript
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];
```

### Quote Creation Flow
```javascript
// Create quote
const gateway = new ethers.Contract(
  GATEWAY_ADDRESS,
  GATEWAY_ABI,
  signer
);

const tx = await gateway.lockPriceQuote(
  tokenAddress,
  amountUsdCents,
  { gasLimit: 350000 }
);

const receipt = await tx.wait();
const event = receipt.logs.find(
  log => log.topics[0] === QUOTE_EVENT_TOPIC
);

const quoteId = event.topics[1];
```

### Payment Execution

**Native Token (ETH/BNB):**
```javascript
const tx = await gateway.processPayment(
  quoteId,
  merchantAddress,
  orderId,
  {
    value: tokenAmount,
    gasLimit: 250000
  }
);

await tx.wait();
```

**Stablecoins (USDC/USDT):**
```javascript
// Step 1: Approve
const token = new ethers.Contract(
  tokenAddress,
  ERC20_ABI,
  signer
);

const approveTx = await token.approve(
  gatewayAddress,
  tokenAmount,
  { gasLimit: 100000 }
);

await approveTx.wait();

// Step 2: Payment
const paymentTx = await gateway.processPayment(
  quoteId,
  merchantAddress,
  orderId,
  { gasLimit: 250000 }
);

await paymentTx.wait();
```

---

## Configuration

### Environment Variables
```bash
# API Configuration
VITE_API_URL=https://api.pp.slavy.space

# Network Configuration
VITE_SEPOLIA_GATEWAY=0x1378329ABE689594355a95bDAbEaBF015ef9CF39
VITE_BSC_GATEWAY=0x0E2878bC634Ac0c1C4d3dA22CFb171Fb67a2d6e7

# Feature Flags
VITE_DEBUG_MODE=false
VITE_ENABLE_POLYGON=false
```

### Vite Configuration
```javascript
export default {
  server: {
    port: 3051,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ethers': ['ethers']
        }
      }
    }
  }
}
```

---

## Installation

### Prerequisites
```bash
Node.js >= 18.x
npm or yarn
MetaMask browser extension
```

### Setup Steps
```bash
# Navigate to directory
cd ~/pp/frontend/payment-app

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
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "ethers": "^6.9.0",
  "vite": "^5.0.0",
  "tailwindcss": "^3.3.0"
}
```

---

## Deployment

### Build Process
```bash
cd ~/pp/frontend/payment-app
npm run build
```

### Systemd Service

**Service File:** `/etc/systemd/system/brscpp-payment-app.service`
```ini
[Unit]
Description=BRSCPP Payment Application
After=network.target

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/pp/frontend/payment-app
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 3051
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Service Management
```bash
# Rebuild and restart
cd ~/pp/frontend/payment-app
npm run build
sudo systemctl restart brscpp-payment-app.service

# Check status
sudo systemctl status brscpp-payment-app.service

# View logs
sudo journalctl -u brscpp-payment-app.service -f
```

### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name app.pp.slavy.space;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /home/slavy/pp/frontend/payment-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass https://api.pp.slavy.space;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## User Experience

### Payment Flow Steps

**1. Customer Arrives**
- URL: https://app.pp.slavy.space/checkout/ORDER-123
- Order details loaded from API
- Amount displayed in USD

**2. Connect Wallet**
- Click "Connect Wallet" button
- MetaMask popup appears
- Approve connection
- Wallet address displayed

**3. Select Network**
- Choose Sepolia or BSC Testnet
- MetaMask switches network
- Contract addresses updated

**4. Select Token**
- View available tokens
- See current balance
- Select ETH/BNB/USDC/USDT

**5. Create Quote**
- Click "Get Quote" button
- Transaction sent to blockchain
- Quote locked for 60-120 seconds
- Timer countdown starts

**6. Approve (if stablecoin)**
- Click "Approve USDC/USDT"
- MetaMask approval popup
- Confirm approval
- Wait for confirmation

**7. Confirm Payment**
- Click "Confirm Payment"
- MetaMask payment popup
- Confirm transaction
- Wait for blockchain confirmation

**8. Success**
- Redirect to success page
- Show transaction hash
- Link to block explorer
- Option to return to merchant

---

## Error Handling

### Common Errors

**Wallet Not Connected**
```
Error: "Please connect your wallet"
Action: Show connect button
```

**Wrong Network**
```
Error: "Please switch to Sepolia"
Action: Show network selector
```

**Insufficient Balance**
```
Error: "Insufficient ETH balance"
Action: Display required amount
```

**Quote Expired**
```
Error: "Quote expired. Please create a new quote"
Action: Reset quote state
```

**Transaction Rejected**
```
Error: "Transaction cancelled by user"
Action: Allow retry
```

**Gas Estimation Failed**
```
Error: "Transaction may fail"
Action: Show warning, allow override
```

### Error Display
```javascript
{
  error && (
    <div className="bg-status-error bg-opacity-10 border border-status-error rounded-lg p-4">
      <p className="text-status-error">{error}</p>
    </div>
  )
}
```

---

## Testing

### Manual Testing Checklist

**Wallet Connection:**
- [ ] Connect MetaMask
- [ ] Display wallet address
- [ ] Show current network
- [ ] Disconnect and reconnect

**Network Switching:**
- [ ] Switch to Sepolia
- [ ] Switch to BSC Testnet
- [ ] Verify contract addresses update
- [ ] Check token list updates

**Quote Creation:**
- [ ] Create quote with ETH
- [ ] Create quote with USDC
- [ ] Verify timer starts
- [ ] Test quote expiration

**Payment Flow:**
- [ ] Native token payment (no approval)
- [ ] Stablecoin approval
- [ ] Stablecoin payment
- [ ] Verify transaction hash

**Error Scenarios:**
- [ ] Insufficient balance
- [ ] Rejected transaction
- [ ] Expired quote
- [ ] Network timeout

### Test URLs
```bash
# Development
http://localhost:3051/checkout/TEST-ORDER-123

# Production
https://app.pp.slavy.space/checkout/TEST-ORDER-123
```

---

## Performance

### Optimization

- Code splitting by route
- Lazy loading components
- Memoized calculations
- Debounced API calls
- Cached network configs

### Bundle Size
```
Total: ~450KB
React: ~130KB
ethers.js: ~120KB
Router: ~30KB
Application: ~170KB
```

### Load Times

- Initial load: <2s
- Quote creation: <5s
- Payment confirmation: <15s (blockchain dependent)

---

## Browser Support

### Tested Configurations

**Recommended:**
- Firefox (latest) + MetaMask
- Ubuntu Desktop

**Also Tested:**
- Chrome (latest) + MetaMask
- Edge (latest) + MetaMask

### Requirements

- JavaScript enabled
- MetaMask extension installed
- Web3 provider available
- Popup windows allowed

---

## Troubleshooting

### MetaMask Issues

**Not Connecting:**
```javascript
// Check MetaMask availability
if (typeof window.ethereum === 'undefined') {
  alert('Please install MetaMask');
}

// Request accounts
const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts'
});
```

**Network Switch Failing:**
```javascript
// Try switching
try {
  await window.ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: '0xaa36a7' }]
  });
} catch (error) {
  if (error.code === 4902) {
    // Network not added
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [NETWORK_PARAMS]
    });
  }
}
```

### Transaction Failures

**Check Gas:**
```javascript
const gasEstimate = await tx.estimateGas();
console.log('Gas estimate:', gasEstimate.toString());
```

**Check Balance:**
```javascript
const balance = await provider.getBalance(address);
console.log('Balance:', ethers.formatEther(balance));
```

**Check Allowance:**
```javascript
const allowance = await token.allowance(owner, spender);
console.log('Allowance:', ethers.formatUnits(allowance, 6));
```

---

## Future Enhancements

### Planned Features

- WalletConnect support
- Ledger hardware wallet support
- Multi-language support
- QR code payments (mobile)
- Payment history
- Saved payment methods
- Email receipts

### UX Improvements

- Estimated gas display
- Transaction preview
- Better error messages
- Loading state animations
- Mobile optimization

---

## Related Documentation

- [Main Project](../../README.md)
- [BRSCPP Backend](../../backend/brscpp_backend/README.md)
- [Smart Contracts](../../blockchain/README.md)
- [Marketing Site](../marketing_app/README.md)
- [Test Shop Frontend](../testshop_app/README.md)

---

## License

MIT License

---

Last Updated: December 2025
