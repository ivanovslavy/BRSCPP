# BRSCPP Marketing Site

Landing page, documentation, and faucets for BRSCPP payment protocol.

**Website URL:** https://pp.slavy.space

**Status:** Live (Production)

---

## Navigation

- [Main Project README](../../README.md)
- [Smart Contracts Documentation](../../blockchain/README.md)
- [BRSCPP Backend](../../backend/brscpp_backend/README.md)
- [Test Shop Backend](../../backend/testshop_backend/README.md)
- [Payment App](../payment_app/README.md)
- [Test Shop Frontend](../testshop_app/README.md)

---

## Overview

Marketing site provides landing page, API documentation, integration guides, and test token faucets for developers and merchants.

### Purpose

- Introduce BRSCPP protocol
- Provide API documentation
- Offer integration examples
- Distribute test tokens
- Merchant registration

### Key Pages

- **Home:** Protocol overview, features, roadmap
- **Docs:** Complete API documentation
- **Integration:** Code examples and guides
- **Faucets:** Test token distribution (USDC, USDT)
- **Register:** Merchant onboarding

---

## Architecture

### Technology Stack

**Framework:** React 18 with Vite

**Styling:** TailwindCSS

**Routing:** React Router v6

**Blockchain:** ethers.js v6

**State:** React hooks (useState, useEffect)

**Build:** Vite (fast HMR, optimized builds)

### Application Structure
```
marketing/
├── src/
│   ├── pages/
│   │   ├── Home.jsx          Landing page
│   │   ├── Docs.jsx          API documentation
│   │   ├── Integration.jsx   Integration guide
│   │   ├── Faucets.jsx       Token faucets
│   │   └── Register.jsx      Merchant registration
│   ├── components/
│   │   ├── Header.jsx        Navigation bar
│   │   ├── Footer.jsx        Footer links
│   │   └── CodeBlock.jsx     Syntax highlighting
│   ├── App.jsx               Main app component
│   ├── main.jsx              Entry point
│   └── index.css             Global styles
├── public/                   Static assets
├── package.json              Dependencies
├── vite.config.js            Vite configuration
├── tailwind.config.js        Tailwind configuration
└── README.md                 This file
```

---

## Pages

### Home Page

**Route:** `/`

**Features:**
- Protocol introduction
- Supported fiat currencies display (12 currencies)
- Payment flow explanation
- Key features overview
- Testing resources section
- System requirements
- Job openings

**Content Sections:**
1. Hero with call-to-action
2. Supported currencies grid
3. Payment flow (3 steps)
4. Key features (4 cards)
5. Testing resources with faucet links
6. Test shop demo link
7. System requirements notice
8. Job postings (Marketing Specialist, React Developer)

### Documentation Page

**Route:** `/docs`

**Features:**
- Getting started guide
- Supported currencies list
- Authentication examples
- API endpoint reference
- Payment flow details
- Webhook format
- Error codes
- Rate limits

**Endpoints Documented:**
- POST /api/merchant/payment-request
- GET /api/customer/payment/:orderId/status
- GET /api/customer/payment/:orderId
- Webhook notifications

**Code Examples:**
- cURL commands
- Request/response JSON
- Authentication headers

### Integration Page

**Route:** `/integration`

**Features:**
- Direct API integration
- Express.js backend example
- React component example
- Payment status checking
- Iframe embed
- WordPress plugin info (coming soon)
- JavaScript widget info (coming soon)
- Webhook configuration

**Integration Methods:**
1. Direct API (REST)
2. React components
3. Iframe embed
4. WordPress plugin (planned)
5. JavaScript widget (planned)

**Code Examples:**
- Node.js/Express backend
- React frontend
- Webhook handler
- Status polling

### Faucets Page

**Route:** `/faucets`

**Features:**
- Network selection (Sepolia, BSC Testnet)
- Wallet connection (MetaMask)
- Real-time balance display
- Cooldown timers with countdown
- Token claiming (USDC, USDT)
- Transaction links to block explorer

**Supported Networks:**
- Sepolia Testnet (Ethereum)
- BSC Testnet (Binance Smart Chain)

**Available Tokens:**
- USDC: 10,000 per claim
- USDT: 10,000 per claim
- Cooldown: 24 hours per token

**Features:**
- Automatic balance updates
- Network switching
- Claim single token or both
- Transaction confirmation with explorer link
- Real-time cooldown countdown

### Registration Page

**Route:** `/register`

**Features:**
- Merchant account creation
- Wallet address verification
- Email validation
- Company information
- Terms acceptance

**Form Fields:**
- Wallet address (required)
- Email address (required)
- Company name (optional)
- Webhook URL (optional)

---

## Configuration

### Environment Variables
```bash
# API Configuration
VITE_API_URL=https://api.pp.slavy.space

# Contract Addresses
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
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
}
```

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'primary-accent': '#00D4FF',
        'ui-card': '#1A1B23',
        'text-primary': '#FFFFFF'
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
```

### Setup Steps
```bash
# Navigate to directory
cd ~/pp/frontend/marketing

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
# Production build
cd ~/pp/frontend/marketing
npm run build

# Output: dist/ directory
```

### Systemd Service

**Service File:** `/etc/systemd/system/brscpp-marketing.service`
```ini
[Unit]
Description=BRSCPP Marketing Site
After=network.target

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/pp/frontend/marketing
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 3000
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Service Management
```bash
# Rebuild and restart
cd ~/pp/frontend/marketing
npm run build
sudo systemctl restart brscpp-marketing.service

# Check status
sudo systemctl status brscpp-marketing.service

# View logs
sudo journalctl -u brscpp-marketing.service -f
```

### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name pp.slavy.space;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /home/slavy/pp/frontend/marketing/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Faucet Implementation

### Smart Contract Integration
```javascript
const TOKEN_FAUCET_ABI = [
  "function claimUSDC() external",
  "function claimUSDT() external",
  "function claimBoth() external",
  "function timeUntilNextClaim(address user, address token) view returns (uint256)"
];

const faucet = new ethers.Contract(
  FAUCET_ADDRESS,
  TOKEN_FAUCET_ABI,
  signer
);

// Claim USDC
const tx = await faucet.claimUSDC();
await tx.wait();
```

### Balance Checking
```javascript
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)"
];

const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
const balance = await usdc.balanceOf(walletAddress);
const formatted = ethers.formatUnits(balance, 6);
```

### Cooldown Tracking
```javascript
const cooldown = await faucet.timeUntilNextClaim(
  walletAddress,
  USDC_ADDRESS
);

const seconds = Number(cooldown);
const hours = Math.floor(seconds / 3600);
const minutes = Math.floor((seconds % 3600) / 60);
```

---

## Styling

### Color Scheme
```css
Primary Accent:   #00D4FF (Cyan)
Background:       #0A0B0F (Dark)
Card Background:  #1A1B23 (Dark Gray)
Text Primary:     #FFFFFF (White)
Text Secondary:   #B4B4B8 (Light Gray)
Text Muted:       #6B6B6F (Gray)
Border:           #2A2B33 (Dark Border)
Success:          #00D084 (Green)
Error:            #FF4D4F (Red)
```

### Layout Components

**Header:**
- Fixed position
- Transparent with blur
- Navigation links
- Responsive mobile menu

**Footer:**
- Links to documentation
- Social media (planned)
- Copyright notice

**Cards:**
- Dark background with border
- Hover effects
- Rounded corners
- Consistent padding

---

## Responsive Design

### Breakpoints
```css
sm:  640px   (Mobile landscape)
md:  768px   (Tablet)
lg:  1024px  (Desktop)
xl:  1280px  (Large desktop)
```

### Mobile Optimization

- Hamburger menu on mobile
- Stack layout for cards
- Touch-friendly buttons
- Reduced padding on small screens

---

## Testing

### Manual Testing
```bash
# Start dev server
npm run dev

# Test pages
http://localhost:3000/
http://localhost:3000/docs
http://localhost:3000/integration
http://localhost:3000/faucets
http://localhost:3000/register

# Test faucets
1. Connect MetaMask
2. Switch to Sepolia
3. Check balance display
4. Claim tokens
5. Verify transaction link
6. Check cooldown timer
```

### Build Testing
```bash
# Build and preview
npm run build
npm run preview

# Test production build
http://localhost:4173/
```

---

## Performance

### Optimization

- Vite fast refresh (HMR)
- Code splitting
- Tree shaking
- Minification
- Asset optimization

### Bundle Size
```
Total bundle: ~300KB
React: ~130KB
ethers.js: ~120KB
Application code: ~50KB
```

### Load Times

- First load: <2s
- Subsequent loads: <500ms (cached)

---

## Browser Support

### Tested Browsers

- Firefox (latest) - Recommended
- Chrome (latest)
- Edge (latest)

### Requirements

- JavaScript enabled
- MetaMask extension (for faucets)
- Modern browser (ES6+)

---

## Troubleshooting

### Build Issues
```bash
# Clear node_modules and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Faucet Connection Issues
```bash
# Check MetaMask connection
window.ethereum.isConnected()

# Verify network
const chainId = await window.ethereum.request({ 
  method: 'eth_chainId' 
});

# Switch network
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0xaa36a7' }] // Sepolia
});
```

### Styling Issues
```bash
# Rebuild Tailwind
npm run build

# Check Tailwind config
npx tailwindcss -i ./src/index.css -o ./dist/output.css
```

---

## Future Enhancements

### Planned Features

- Dark/light theme toggle
- Multi-language support
- Interactive tutorials
- Video guides
- Community forum links
- Developer blog

### Integration Improvements

- Live API playground
- Code generator
- Integration wizard
- Testing sandbox

---

## Related Documentation

- [Main Project](../../README.md)
- [BRSCPP Backend](../../backend/brscpp_backend/README.md)
- [Payment App](../payment_app/README.md)
- [Test Shop Frontend](../testshop_app/README.md)

---

## License

MIT License

---

Last Updated: December 2025
