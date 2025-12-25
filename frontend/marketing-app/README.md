# BRSCPP Marketing Site

Landing page, documentation, and developer resources for the BRSCPP payment protocol.

**Version:** 2.0  
**Author:** Slavcho Ivanov  
**Website URL:** https://brscpp.slavy.space  
**Status:** Production (December 2025)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Pages](#pages)
4. [Faucet System](#faucet-system)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Deployment](#deployment)
8. [Styling](#styling)
9. [Performance](#performance)
10. [Future Enhancements](#future-enhancements)

---

## Overview

The marketing site serves as the primary entry point for merchants and developers interested in integrating BRSCPP v2. It provides comprehensive documentation, integration guides, test resources, and merchant onboarding.

### Key Features

**Information:**
- Protocol overview and features
- Multi-currency support showcase (12 currencies)
- Payment method comparison (crypto vs fiat)
- Network and token support details
- Roadmap and development timeline

**Documentation:**
- Complete API reference
- Integration examples
- Webhook configuration
- Error handling guides
- Best practices

**Developer Resources:**
- Test token faucets (USDC, USDT)
- Live demo shop
- Code examples (Node.js, React, PHP)
- API playground (planned)

**Merchant Onboarding:**
- Registration page
- Feature comparison
- Pricing information
- Contact information

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

### Application Structure
```
marketing-app/
├── src/
│   ├── pages/
│   │   ├── Home.jsx              # Landing page
│   │   ├── Docs.jsx              # API documentation
│   │   ├── Integration.jsx       # Integration guides
│   │   ├── Faucets.jsx           # Token faucets
│   │   ├── Register.jsx          # Merchant registration
│   │   └── About.jsx             # About the project
│   ├── components/
│   │   ├── Header.jsx            # Navigation bar
│   │   ├── Footer.jsx            # Footer with links
│   │   ├── CodeBlock.jsx         # Syntax-highlighted code
│   │   ├── FeatureCard.jsx       # Feature display cards
│   │   └── CurrencyGrid.jsx      # Supported currencies
│   ├── utils/
│   │   └── faucet.js             # Faucet contract interaction
│   ├── App.jsx                   # Main application
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── public/
│   └── assets/                   # Static assets
├── package.json
├── vite.config.js
└── README.md
```

---

## Pages

### Home Page

**Route:** `/`

**Content Sections:**

**1. Hero Section**
```
BRSCPP v2
Cryptocurrency & Fiat Payments for Merchants

[Get Started] [View Documentation]
```

**2. Supported Currencies**

Display grid showing 12 supported fiat currencies:
- USD, EUR, GBP, JPY, CNY, RUB
- INR, CAD, AUD, BRL, MXN, KRW

Each with:
- Currency code
- Currency name
- Symbol display
- Real-time exchange rates (planned)

**3. Payment Methods**

**Cryptocurrency:**
- Multi-chain support (Sepolia, BSC, Amoy)
- Multi-token support (ETH, BNB, MATIC, USDC, USDT)
- Non-custodial settlement
- 0.5% platform fee

**Fiat (Stripe):**
- Credit and debit cards
- Apple Pay / Google Pay
- Bank transfers
- Standard Stripe fees

**4. Key Features**

Four feature cards:
- **Non-Custodial:** Direct P2P settlement, no intermediaries
- **Multi-Chain:** Support for 3 networks (expanding)
- **Multi-Currency:** 12 fiat currencies with auto-conversion
- **NFT Rewards:** Commemorative NFTs for all payments

**5. How It Works**

Three-step process:
1. Merchant creates payment request via API
2. Customer chooses payment method (crypto or card)
3. Funds settle directly to merchant wallet

**6. Testing Resources**

Links to:
- Test token faucets
- Demo shop
- API playground (planned)
- Integration examples

**7. Roadmap**

Timeline display:
- Q1 2026: Feature development
- Q2 2026: Marketing and growth
- Q3 2026: Security audit and mainnet prep
- Q4 2026: Mainnet launch
- Q1 2027: Expansion and scaling

**8. Career Opportunities**

Job openings:
- Marketing Specialist (Full-time)
- React Developer (Part-time)
- UI/UX Designer (Contract)

### Documentation Page

**Route:** `/docs`

**Sections:**

**1. Getting Started**
- API key generation
- Authentication methods
- First payment request

**2. API Reference**

**Authentication:**
```bash
Authorization: Bearer brscpp_live_YOUR_API_KEY
```

**Create Payment Request:**
```bash
POST /api/merchant/payment-request
Content-Type: application/json

{
  "orderId": "ORDER-123",
  "amount": 100.00,
  "currency": "EUR",
  "description": "Product purchase"
}
```

**Response:**
```json
{
  "success": true,
  "paymentUrl": "https://payment.brscpp.slavy.space/checkout/ORDER-123",
  "amountUsd": "108.70",
  "amountOriginal": 100.00,
  "currencyOriginal": "EUR",
  "exchangeRate": 1.087
}
```

**3. Webhooks**

Webhook payload format:
```json
{
  "event": "payment.completed",
  "payment": {
    "orderId": "ORDER-123",
    "paymentMethod": "crypto",
    "txHash": "0x...",
    "usdAmount": 108.70
  }
}
```

**4. Supported Networks**

Table showing:
- Network name
- Chain ID
- Native token
- Block time
- Explorer URL
- Status

**5. Error Codes**

Complete error reference:
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 409: Duplicate Order ID
- 422: Validation Failed
- 500: Internal Error

**6. Rate Limits**

- 100 requests per minute per IP
- 1000 requests per hour per API key
- Webhook delivery: 3 attempts with backoff

### Integration Page

**Route:** `/integration`

**Integration Methods:**

**1. Direct API Integration**

Node.js Express example:
```javascript
const axios = require('axios');

app.post('/checkout', async (req, res) => {
  const response = await axios.post(
    'https://api.brscpp.slavy.space/api/merchant/payment-request',
    {
      orderId: `ORDER-${Date.now()}`,
      amount: 100.00,
      currency: 'USD',
      description: 'Product purchase'
    },
    {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    }
  );
  
  res.json({ paymentUrl: response.data.paymentUrl });
});
```

**2. React Component Example**
```javascript
function CheckoutButton({ product }) {
  const handleCheckout = async () => {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ productId: product.id })
    });
    
    const { paymentUrl } = await response.json();
    window.location.href = paymentUrl;
  };
  
  return (
    <button onClick={handleCheckout}>
      Pay with BRSCPP
    </button>
  );
}
```

**3. Webhook Handler**
```javascript
const crypto = require('crypto');

app.post('/webhook/brscpp', (req, res) => {
  const signature = req.headers['x-brscpp-signature'];
  const payload = JSON.stringify(req.body);
  
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).send('Invalid signature');
  }
  
  const { event, payment } = req.body;
  
  if (event === 'payment.completed') {
    // Fulfill order
    fulfillOrder(payment.orderId);
  }
  
  res.status(200).send('OK');
});
```

**4. WordPress Plugin** (Coming Soon)

Installation instructions and configuration guide.

**5. Shopify App** (Planned)

Integration guide for Shopify stores.

### Faucets Page

**Route:** `/faucets`

**Features:**

**Network Selector:**
```javascript
<NetworkSelector 
  networks={['sepolia', 'bscTestnet']}
  selected={selectedNetwork}
  onChange={handleNetworkChange}
/>
```

**Wallet Connection:**
```javascript
<button onClick={connectWallet}>
  {connected ? address : 'Connect Wallet'}
</button>
```

**Token Balance Display:**
```javascript
<BalanceCard 
  token="USDC"
  balance={usdcBalance}
  decimals={6}
/>

<BalanceCard 
  token="USDT"
  balance={usdtBalance}
  decimals={6}
/>
```

**Claim Buttons:**
```javascript
<ClaimButton 
  token="USDC"
  disabled={cooldownRemaining > 0}
  cooldown={cooldownRemaining}
  onClaim={handleClaimUSDC}
/>

<ClaimButton 
  token="USDT"
  disabled={cooldownRemaining > 0}
  cooldown={cooldownRemaining}
  onClaim={handleClaimUSDT}
/>

<button onClick={handleClaimBoth}>
  Claim Both (USDC + USDT)
</button>
```

**Cooldown Timer:**
```javascript
{cooldownRemaining > 0 && (
  <div className="cooldown-timer">
    Next claim in: {formatTime(cooldownRemaining)}
  </div>
)}
```

**Transaction Status:**
```javascript
{txHash && (
  <a 
    href={`${explorerUrl}/tx/${txHash}`}
    target="_blank"
  >
    View Transaction
  </a>
)}
```

### Register Page

**Route:** `/register`

**Registration Form:**
```javascript
<form onSubmit={handleRegister}>
  <input 
    type="email"
    placeholder="Email Address"
    required
  />
  
  <input 
    type="password"
    placeholder="Password"
    minLength={8}
    required
  />
  
  <input 
    type="text"
    placeholder="Company Name (optional)"
  />
  
  <button type="button" onClick={connectWallet}>
    Connect Wallet (Optional)
  </button>
  
  <input 
    type="text"
    placeholder="Wallet Address"
    value={walletAddress}
    readOnly
  />
  
  <label>
    <input type="checkbox" required />
    I accept the Terms of Service
  </label>
  
  <button type="submit">
    Create Account
  </button>
</form>
```

**Post-Registration:**
- Redirect to merchant dashboard
- Display API key (one-time)
- Quick start guide
- Integration instructions

---

## Faucet System

### Smart Contract Integration

**Faucet Contract ABI:**
```javascript
const FAUCET_ABI = [
  "function claimUSDC() external",
  "function claimUSDT() external",
  "function claimBoth() external",
  "function timeUntilNextClaim(address user, address token) external view returns (uint256)",
  "function getClaimAmount(address token) external view returns (uint256)"
];
```

### Claiming Tokens

**Claim USDC:**
```javascript
const faucet = new ethers.Contract(
  FAUCET_ADDRESS,
  FAUCET_ABI,
  signer
);

const tx = await faucet.claimUSDC();
await tx.wait();
```

**Claim Both:**
```javascript
const tx = await faucet.claimBoth();
await tx.wait();
```

### Cooldown Checking
```javascript
const cooldown = await faucet.timeUntilNextClaim(
  walletAddress,
  USDC_ADDRESS
);

const secondsRemaining = Number(cooldown);

if (secondsRemaining > 0) {
  // Show cooldown timer
  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  console.log(`${hours}h ${minutes}m remaining`);
}
```

### Balance Display
```javascript
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const token = new ethers.Contract(
  TOKEN_ADDRESS,
  ERC20_ABI,
  provider
);

const balance = await token.balanceOf(walletAddress);
const decimals = await token.decimals();
const formatted = ethers.formatUnits(balance, decimals);
```

### Faucet Contract Addresses

**Sepolia:**
- Faucet: `0xFB370f6c9Bd1dbc7dB6c202D5B9e6B8F30273c00`
- USDC: `0xC4De068C028127bdB44670Edb82e6E3Ff4113E49`
- USDT: `0x00D75E583DF2998C7582842e69208ad90820Eaa1`

**BSC Testnet:**
- Faucet: `0x9959AD0fC939013aEca6121295272756E352d902`
- USDC: `0x45787D76D24F3b47663eC3DEcc76f46C20Fa0c4C`
- USDT: `0xb6dFe9F6810955A3bcbdf7F99418C95Cb073F23D`

**Claim Limits:**
- Amount: 10,000 tokens per claim
- Cooldown: 24 hours
- Max claims: Unlimited (with cooldown)

---

## Installation

### Prerequisites
```
Node.js >= 20.x
npm >= 9.x
```

### Setup
```bash
# Navigate to directory
cd frontend/marketing-app

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Start development server
npm run dev

# Build for production
npm run build
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

# Faucet Contracts
VITE_SEPOLIA_FAUCET=0xFB370f6c9Bd1dbc7dB6c202D5B9e6B8F30273c00
VITE_BSC_FAUCET=0x9959AD0fC939013aEca6121295272756E352d902

# Network Configuration
VITE_SEPOLIA_CHAIN_ID=11155111
VITE_BSC_CHAIN_ID=97
```

### Vite Configuration
```javascript
// vite.config.js
export default {
  plugins: [react()],
  build: {
    outDir: 'build',
    sourcemap: false
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  preview: {
    port: 3065,
    host: '0.0.0.0'
  }
}
```

---

## Deployment

### Build Process
```bash
cd ~/brscpp/pp-v2/frontend/marketing-app
npm run build
```

### Systemd Service

**Service File:** `/etc/systemd/system/brscpp-v2-marketing.service`
```ini
[Unit]
Description=BRSCPP v2 Marketing Site
After=network.target

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/brscpp/pp-v2/frontend/marketing-app
ExecStart=/usr/bin/npx vite preview --host 0.0.0.0 --port 3065
Restart=always
RestartSec=10

Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Service Management
```bash
# Start service
sudo systemctl start brscpp-v2-marketing.service

# Rebuild and restart
cd ~/brscpp/pp-v2/frontend/marketing-app
npm run build
sudo systemctl restart brscpp-v2-marketing.service

# View logs
sudo journalctl -u brscpp-v2-marketing.service -f
```

### Apache Configuration
```apache
<VirtualHost *:443>
    ServerName brscpp.slavy.space
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3065/
    ProxyPassReverse / http://127.0.0.1:3065/
    
    ErrorLog /var/log/apache2/marketing-brscpp-error.log
    CustomLog /var/log/apache2/marketing-brscpp-access.log combined
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/brscpp.slavy.space/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/brscpp.slavy.space/privkey.pem
</VirtualHost>
```

---

## Styling

### Design System

**Color Palette:**
```css
Primary:          #00D4FF  /* Cyan */
Background:       #0A0B0F  /* Dark */
Card:             #1A1B23  /* Dark Gray */
Border:           #2A2B33  /* Border */
Text Primary:     #FFFFFF  /* White */
Text Secondary:   #B4B4B8  /* Light Gray */
Text Muted:       #6B6B6F  /* Gray */
Success:          #00D084  /* Green */
Warning:          #FFB020  /* Yellow */
Error:            #FF4D4F  /* Red */
```

**Typography:**
```css
Font Family: Inter, system-ui, sans-serif
Headings: 600-700 weight
Body: 400 weight
Code: 'Fira Code', monospace
```

**Spacing:**
```css
xs:  0.25rem (4px)
sm:  0.5rem  (8px)
md:  1rem    (16px)
lg:  1.5rem  (24px)
xl:  2rem    (32px)
2xl: 3rem    (48px)
```

### Responsive Design

**Breakpoints:**
```css
sm:  640px   /* Mobile landscape */
md:  768px   /* Tablet */
lg:  1024px  /* Desktop */
xl:  1280px  /* Large desktop */
2xl: 1536px  /* Extra large */
```

**Mobile Optimizations:**
- Hamburger menu navigation
- Stacked card layouts
- Touch-friendly buttons (min 44px)
- Reduced font sizes
- Simplified tables

---

## Performance

### Bundle Size
```
Total: ~350KB (gzipped: ~120KB)
React: ~135KB
ethers.js: ~120KB
Application: ~95KB
```

### Load Times

- First load: <2 seconds
- Cached load: <500ms
- Faucet interaction: <5 seconds

### Optimizations

**Build Optimizations:**
- Code splitting by route
- Tree shaking
- Minification
- Asset compression

**Runtime Optimizations:**
- Lazy loading images
- Debounced balance updates
- Memoized components
- Cached network data

---

## Future Enhancements

### Phase 1 (Q1 2026)

**Content:**
- Developer blog
- Video tutorials
- Case studies
- Success stories

**Features:**
- Live API playground
- Interactive documentation
- Code generator
- Integration wizard

### Phase 2 (Q2 2026)

**Community:**
- Developer forum
- Discord integration
- Bug bounty program
- Ambassador program

**Tools:**
- WordPress plugin marketplace
- Shopify app store
- npm package
- SDK documentation

### Phase 3 (Q3 2026)

**Advanced Features:**
- Multi-language support (i18n)
- Dark/light theme toggle
- Personalized dashboard
- Analytics integration

---

## Related Documentation

- [Main Project Documentation](../../README.md)
- [Backend API Documentation](../../backend/README.md)
- [Smart Contracts Documentation](../../blockchain/README.md)
- [Payment Application](../payment-app/README.md)
- [Developer Integration Guide](../../DEV_SUPPORT.md)

---

## License

MIT License

---

**Last Updated:** December 22, 2025  
**Document Version:** 2.0  
**Author:** Slavcho Ivanov
