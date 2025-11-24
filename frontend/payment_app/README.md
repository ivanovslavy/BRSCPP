# BRSCPP Payment Application

Customer-facing cryptocurrency payment checkout interface.

## Technology Stack

- React 18
- Vite 7
- TailwindCSS 3
- React Router DOM 6
- ethers.js 6
- Sonner (toast notifications)

## Project Structure
```
payment-app/
├── src/
│   ├── components/
│   │   ├── WalletConnect.jsx      # MetaMask connection
│   │   ├── TokenSelector.jsx      # Payment token selection
│   │   ├── CountdownTimer.jsx     # Quote expiration timer
│   │   └── TransactionStatus.jsx  # Transaction state display
│   ├── pages/
│   │   ├── Checkout.jsx           # Payment checkout flow
│   │   ├── Success.jsx            # Payment success page
│   │   ├── Failed.jsx             # Payment failure page
│   │   └── Dashboard.jsx          # Merchant dashboard
│   ├── App.jsx                    # Root component with routing
│   ├── main.jsx                   # Application entry point
│   └── index.css                  # Tailwind CSS imports
├── public/                        # Static assets
├── dist/                          # Production build output
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Installation
```bash
cd ~/pp/frontend/payment-app
npm install
```

## Development
```bash
npm run dev
```

Server runs on http://localhost:3051

## Production Build
```bash
npm run build
npm run preview
```

Build output in `dist/` directory.

## Deployment

Site runs as systemd service on port 3051.

### Service Management
```bash
# Start service
sudo systemctl start brscpp-payment-app.service

# Stop service
sudo systemctl stop brscpp-payment-app.service

# Restart service
sudo systemctl restart brscpp-payment-app.service

# View logs
sudo journalctl -u brscpp-payment-app.service -f
```

### Service Configuration

Location: `/etc/systemd/system/brscpp-payment-app.service`
```ini
[Unit]
Description=BRSCPP Payment Application
After=network.target

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/pp/frontend/payment-app
Environment="NODE_ENV=production"
Environment="PORT=3051"
ExecStart=/usr/bin/npm run preview -- --port 3051 --host 0.0.0.0
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Pages

### Checkout (/checkout/:orderId)
Main payment flow:
1. Display payment request details
2. Connect wallet (MetaMask)
3. Select payment token (ETH, USDC, USDT)
4. Create price quote on blockchain
5. Display quote with countdown timer
6. Send payment transaction
7. Confirm and redirect to success

### Success (/success/:orderId)
Payment confirmation page with transaction details and Etherscan link.

### Failed (/failed/:orderId)
Payment failure page with error message and retry option.

### Dashboard (/dashboard)
Merchant dashboard with:
- Payment statistics
- API key management
- Integration code examples
- Recent payment history

## Payment Flow

### Step 1: Load Payment Request
```
GET /api/customer/payment/:orderId
```

Returns merchant info, amount, description.

### Step 2: Connect Wallet
User connects MetaMask wallet. Application checks network and switches to Sepolia if needed.

### Step 3: Create Quote
Customer wallet calls smart contract directly:
```javascript
lockPriceQuote(token, usdAmount)
```

Returns quote ID, token amount, and expiration time. Quote valid for 60 seconds.

### Step 4: Send Payment
Customer wallet calls smart contract:
```javascript
processETHPaymentWithQuote(quoteId, merchant, orderId)
```

Sends ETH to gateway, which splits between merchant and fee collector.

### Step 5: Confirmation
Transaction confirmed on blockchain. Backend event listener processes payment and updates database.

## Smart Contract Integration

### Gateway Address
```
Sepolia: 0x1378329ABE689594355a95bDAbEaBF015ef9CF39
```

### ABI Functions
```javascript
lockPriceQuote(address token, uint256 usdAmount)
processETHPaymentWithQuote(bytes32 quoteId, address merchant, string orderId)
priceQuotes(bytes32) view returns (...)
```

### Events
```javascript
PriceQuoteGenerated(bytes32 quoteId, address token, ...)
PaymentProcessed(uint256 paymentId, bytes32 quoteId, ...)
```

## Features

- Dark theme matching marketing site
- Responsive mobile-first design
- Real-time transaction status updates
- Debug log panel (desktop only)
- Automatic network switching
- Quote expiration countdown
- MetaMask integration
- Transaction error handling

## Configuration

### Vite Config
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3051,
    host: '0.0.0.0'
  },
  preview: {
    port: 3051,
    host: '0.0.0.0',
    allowedHosts: ['app.pp.slavy.space', 'localhost']
  }
})
```

### API Endpoints
```javascript
const API_BASE = 'https://api.pp.slavy.space';
const GATEWAY_ADDRESS = '0x1378329ABE689594355a95bDAbEaBF015ef9CF39';
```

## Debug Mode

Desktop view includes debug log panel showing:
- Wallet connection events
- Quote creation details
- Transaction submission
- Blockchain confirmation
- Error messages

Useful for troubleshooting payment issues.

## Security

- No private keys stored
- Transactions signed by user wallet
- Quote creator validation prevents front-running
- Quote expiration prevents stale prices
- Amount verification on-chain
- One-time quote usage

## Error Handling

### Common Errors

**InvalidQuoteCreator**
Quote must be used by wallet that created it.

**QuoteExpired**
Quote valid for 60 seconds. Create new quote.

**QuoteAlreadyUsed**
Each quote can only be used once.

**AmountMismatch**
Payment amount must match quote amount exactly.

**Network Error**
User must be on Sepolia testnet.

## Browser Support

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

Requires MetaMask extension or mobile wallet browser.

## Mobile Wallet Support

App works with:
- MetaMask Mobile
- Trust Wallet
- Coinbase Wallet
- Rainbow Wallet

Open payment URL in wallet's browser.

## Testing

### Create Test Payment
```bash
curl -X POST https://api.pp.slavy.space/api/merchant/payment-request \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-'$(date +%s)'",
    "amountUsd": "10",
    "description": "Test payment"
  }'
```

Returns payment URL. Open in browser to test checkout flow.

### Get Testnet ETH

https://sepoliafaucet.com

## Troubleshooting

### Transaction Fails
- Check Sepolia network selected
- Verify sufficient ETH balance
- Ensure quote not expired
- Use same wallet that created quote

### CSS Not Loading
```bash
rm -rf dist node_modules/.vite
npm run build
sudo systemctl restart brscpp-payment-app.service
```

### MetaMask Not Detected
```bash
# Check console for errors
# Install MetaMask extension
# Refresh page after installation
```

## Links

- Production: https://app.pp.slavy.space
- API: https://api.pp.slavy.space
- Marketing: https://pp.slavy.space
- Etherscan: https://sepolia.etherscan.io
- GitHub: https://github.com/ivanovslavy/BRSCPP

## License

MIT
