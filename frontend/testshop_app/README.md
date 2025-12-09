# BRSCPP Test Shop Frontend

Demo e-commerce storefront demonstrating BRSCPP payment gateway integration.

**Website URL:** https://testshop.pp.slavy.space

**Backend API:** https://backend.testshop.pp.slavy.space

**Status:** Live (Demo)

---

## Navigation

- [Main Project README](../../README.md)
- [Smart Contracts Documentation](../../blockchain/README.md)
- [BRSCPP Backend](../../backend/brscpp_backend/README.md)
- [Test Shop Backend](../../backend/testshop_backend/README.md)
- [Marketing Site](../marketing_app/README.md)
- [Payment App](../payment_app/README.md)

---

## Overview

Test Shop is a fully functional demo e-commerce store showcasing BRSCPP payment gateway integration. Customers can browse products in multiple currencies, select blockchain networks, and complete cryptocurrency payments.

### Purpose

- Demonstrate complete payment flow
- Show multi-currency pricing
- Provide integration reference
- Enable end-to-end testing
- Showcase user experience

### Key Features

- Product catalog with 3 demo products
- Multi-currency pricing (12 fiat currencies)
- Real-time currency conversion
- Network selection (Sepolia, BSC Testnet)
- Automatic BRSCPP integration
- Responsive mobile-friendly design

---

## Architecture

### Technology Stack

**Framework:** React 18 with Vite

**Styling:** TailwindCSS with custom gradient theme

**State Management:** React hooks (useState, useEffect)

**API Communication:** Fetch API

**Build Tool:** Vite

**Deployment:** Systemd service

### Application Flow
```
Customer visits shop
         ↓
┌─────────────────────────┐
│  Load Products          │
│  GET /api/products      │
│  ?currency=USD          │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Select Currency        │
│  Prices auto-convert    │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Click "Pay with Crypto"│
│  Network selection modal│
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Select Network         │
│  Sepolia / BSC Testnet  │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Create Payment Request │
│  POST /api/create-payment│
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Redirect to Payment App│
│  app.pp.slavy.space     │
└─────────────────────────┘
```

### Component Structure
```
testshop_app/
├── src/
│   ├── App.jsx              Main shop component
│   ├── main.jsx             Entry point
│   └── index.css            Global styles
├── public/
│   └── favicon.ico          Shop icon
├── package.json             Dependencies
├── vite.config.js           Vite configuration
├── tailwind.config.js       Tailwind configuration
└── README.md                This file
```

---

## Features

### Product Catalog

**Products Available:**

1. **Programming Books Bundle**
   - ID: BOOKS
   - Base Price: $50.00
   - Description: Essential coding books collection
   - Image: Placeholder

2. **Web Development Course**
   - ID: COURSE
   - Base Price: $99.00
   - Description: Complete full-stack web development course
   - Image: Placeholder

3. **Cloud Infrastructure Setup**
   - ID: CLOUD
   - Base Price: $199.00
   - Description: Professional cloud setup and configuration
   - Image: Placeholder

**Product Data Structure:**
```javascript
{
  id: "BOOKS",
  name: "Programming Books Bundle",
  description: "Essential coding books collection",
  price: 50.00,
  image: "https://..."
}
```

### Multi-Currency Support

**Supported Currencies (12):**
- USD (US Dollar) - $
- EUR (Euro) - €
- GBP (British Pound) - £
- JPY (Japanese Yen) - ¥
- CNY (Chinese Yuan) - ¥
- RUB (Russian Ruble) - ₽
- INR (Indian Rupee) - ₹
- CAD (Canadian Dollar) - C$
- AUD (Australian Dollar) - A$
- BRL (Brazilian Real) - R$
- MXN (Mexican Peso) - $
- KRW (South Korean Won) - ₩

**Currency Selector:**
- Dropdown with country flags
- Stored in localStorage
- Auto-converts all prices
- Real-time updates

**Price Formatting:**
```javascript
// Standard currencies (2 decimals)
$50.00 USD
€47.25 EUR

// Zero-decimal currencies (no decimals)
¥7,500 JPY
₩75,000 KRW
```

### Network Selection

**Modal Popup:**
- Appears on "Pay with Crypto" click
- Shows two network options
- Clean text-based design
- Cancel option available

**Networks:**
- Sepolia (Ethereum)
- BSC Testnet (Binance Smart Chain)

**Network Display:**
```
┌──────────────────────────────┐
│   Select Network             │
│                              │
│  Choose blockchain network   │
│  for payment                 │
│                              │
│  ┌────────────────────────┐ │
│  │  Sepolia               │ │
│  │  Ethereum              │ │
│  └────────────────────────┘ │
│                              │
│  ┌────────────────────────┐ │
│  │  BSC Testnet           │ │
│  │  Binance Smart Chain   │ │
│  └────────────────────────┘ │
│                              │
│  [        Cancel        ]    │
└──────────────────────────────┘
```

### Payment Integration

**Order ID Generation:**
```javascript
const orderId = `TESTSHOP-${Date.now()}-${productId}`;
// Example: TESTSHOP-1733756789123-BOOKS
```

**Payment Request:**
```javascript
POST https://backend.testshop.pp.slavy.space/api/create-payment

Body:
{
  productId: "BOOKS",
  productName: "Programming Books Bundle",
  price: 50.00,
  currency: "USD",
  network: "sepolia"
}

Response:
{
  success: true,
  paymentUrl: "https://app.pp.slavy.space/checkout/TESTSHOP-...",
  orderId: "TESTSHOP-1733756789123-BOOKS",
  network: "sepolia"
}
```

**Redirect:**
```javascript
window.location.href = paymentUrl;
```

---

## User Interface

### Layout

**Header:**
- Shop name: "BRSCPP Test Shop"
- Subtitle: "Multi-currency • Multi-chain"
- Network selector (hidden, only modal)
- Currency selector dropdown

**Product Grid:**
- 3-column layout on desktop
- 1-column on mobile
- Hover effects on cards
- Product images
- Prices in selected currency
- "Pay with Crypto" buttons

**Footer:**
- Powered by BRSCPP link
- Description text
- Clean minimal design

### Color Scheme
```css
/* Dark Theme with Gradient */
Background: linear-gradient(
  to bottom right,
  #111827,    /* Gray-900 */
  #1e3a8a,    /* Blue-900 */
  #111827     /* Gray-900 */
)

Card Background: rgba(31, 41, 55, 0.5)  /* Gray-800 with opacity */
Card Border: #374151                     /* Gray-700 */
Card Hover: #3b82f6                      /* Blue-500 */

Text Primary: #ffffff                    /* White */
Text Secondary: #d1d5db                  /* Gray-300 */
Text Muted: #9ca3af                      /* Gray-400 */

Button Primary: #2563eb                  /* Blue-600 */
Button Hover: #1d4ed8                    /* Blue-700 */
```

### Responsive Design

**Breakpoints:**
```css
Mobile:     < 768px   (1 column)
Tablet:     768px+    (2 columns)
Desktop:    1024px+   (3 columns)
```

**Mobile Optimizations:**
- Stack layout
- Larger touch targets
- Simplified header
- Full-width buttons

---

## Configuration

### Environment Variables
```bash
# Backend API
VITE_BACKEND_API=https://backend.testshop.pp.slavy.space

# Shop Configuration
VITE_SHOP_NAME=BRSCPP Test Shop
VITE_DEFAULT_CURRENCY=USD
```

### Vite Configuration
```javascript
export default {
  server: {
    port: 3001,
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
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#2563eb',
        'secondary': '#1e3a8a'
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
cd ~/testshop/frontend

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
  "vite": "^5.0.0",
  "tailwindcss": "^3.3.0"
}
```

---

## Deployment

### Build Process
```bash
cd ~/testshop/frontend
npm run build
```

### Manual Deployment
```bash
# Kill existing process
pkill -f "vite.*testshop"

# Start new process
cd ~/testshop/frontend
npm run preview -- --host 0.0.0.0 --port 3001 &
```

### Systemd Service (Optional)

**Service File:** `/etc/systemd/system/testshop-frontend.service`
```ini
[Unit]
Description=Test Shop Frontend
After=network.target

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/testshop/frontend
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 3001
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name testshop.pp.slavy.space;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## State Management

### Application State
```javascript
const [products, setProducts] = useState([]);
const [currencies, setCurrencies] = useState({});
const [selectedCurrency, setSelectedCurrency] = useState('USD');
const [selectedProduct, setSelectedProduct] = useState(null);
const [showNetworkModal, setShowNetworkModal] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
```

### Data Flow

**1. Load Currencies**
```javascript
useEffect(() => {
  setSelectedCurrency('USD');
  fetchCurrencies();
  fetchProducts('USD');
}, []);
```

**2. Currency Change**
```javascript
const handleCurrencyChange = (currency) => {
  setSelectedCurrency(currency);
  localStorage.setItem('testshop_currency', currency);
  setCurrencyMenuOpen(false);
  fetchProducts(currency);
};
```

**3. Payment Flow**
```javascript
const handlePaymentClick = (product) => {
  setSelectedProduct(product);
  setShowNetworkModal(true);
};

const handleNetworkSelect = async (network) => {
  const response = await fetch('/api/create-payment', {
    method: 'POST',
    body: JSON.stringify({
      productId: product.id,
      price: product.price,
      currency: selectedCurrency,
      network: network
    })
  });
  
  const data = await response.json();
  window.location.href = data.paymentUrl;
};
```

---

## API Integration

### Fetch Products
```javascript
GET https://backend.testshop.pp.slavy.space/api/products?currency=EUR

Response:
{
  products: [
    {
      id: "BOOKS",
      name: "Programming Books Bundle",
      price: 47.25,
      description: "...",
      image: "..."
    },
    ...
  ]
}
```

### Fetch Currencies
```javascript
GET https://backend.testshop.pp.slavy.space/api/currencies

Response:
{
  currencies: {
    "USD": { name: "US Dollar", symbol: "$", flag: "🇺🇸" },
    "EUR": { name: "Euro", symbol: "€", flag: "🇪🇺" },
    ...
  }
}
```

### Create Payment
```javascript
POST https://backend.testshop.pp.slavy.space/api/create-payment

Request:
{
  productId: "BOOKS",
  productName: "Programming Books Bundle",
  price: 47.25,
  currency: "EUR",
  network: "sepolia"
}

Response:
{
  success: true,
  paymentUrl: "https://app.pp.slavy.space/checkout/...",
  orderId: "TESTSHOP-...",
  network: "sepolia"
}
```

---

## Testing

### Manual Testing

**1. Currency Selection**
```
- Load page (should default to USD)
- Click currency dropdown
- Select EUR
- Verify prices update
- Check localStorage saved
- Refresh page
- Verify USD (ignores localStorage)
```

**2. Product Display**
```
- Verify 3 products shown
- Check images load
- Verify prices formatted correctly
- Test hover effects
```

**3. Network Selection**
```
- Click "Pay with Crypto"
- Verify modal appears
- Check network options display
- Select Sepolia
- Verify redirect to payment app
```

**4. Complete Payment Flow**
```
- Select product
- Choose network
- Complete payment in app
- Verify success page
- Check transaction explorer
```

### Test URLs
```bash
# Development
http://localhost:3001/

# Production
https://testshop.pp.slavy.space/
```

---

## Error Handling

### Error Display
```javascript
{error && (
  <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4">
    <p className="text-red-200 text-sm">{error}</p>
  </div>
)}
```

### Common Errors

**Failed to Load Products**
```
Error: "Failed to load products"
Action: Retry button, check backend status
```

**Failed to Load Currencies**
```
Error: "Failed to fetch currencies"
Action: Use cached currencies, show error
```

**Payment Creation Failed**
```
Error: "Failed: Server error: 500"
Action: Show error message, allow retry
```

---

## Performance

### Optimization

- Minimal dependencies
- Lazy image loading
- Currency caching
- Debounced API calls
- Optimized bundle size

### Bundle Size
```
Total: ~200KB
React: ~130KB
Application: ~70KB
```

### Load Times

- Initial load: <1.5s
- Currency switch: <300ms
- Payment redirect: <500ms

---

## Browser Support

### Tested Browsers

- Firefox (latest) - Recommended
- Chrome (latest)
- Edge (latest)

### Requirements

- JavaScript enabled
- LocalStorage available
- Modern CSS support (Grid, Flexbox)

---

## Troubleshooting

### Products Not Loading
```bash
# Check backend status
curl https://backend.testshop.pp.slavy.space/api/products

# Check browser console
# Open DevTools → Console

# Verify CORS
# Check network tab for CORS errors
```

### Currency Not Changing
```bash
# Check localStorage
localStorage.getItem('testshop_currency')

# Clear cache
localStorage.clear()

# Verify API response
curl "https://backend.testshop.pp.slavy.space/api/products?currency=EUR"
```

### Payment Not Redirecting
```bash
# Check console logs
console.log('Payment URL:', paymentUrl)

# Verify backend response
# Check network tab → create-payment response

# Test backend directly
curl -X POST https://backend.testshop.pp.slavy.space/api/create-payment \
  -H "Content-Type: application/json" \
  -d '{"productId":"BOOKS","price":50,"currency":"USD","network":"sepolia"}'
```

---

## Future Enhancements

### Planned Features

- Shopping cart
- Product search
- Product categories
- Customer reviews
- Order history
- Email notifications
- Discount codes
- Multiple payment methods

### UX Improvements

- Product quick view
- Image gallery
- Product comparison
- Wishlist
- Related products
- Recently viewed

---

## Integration Guide

### For Other Merchants

**Step 1: Register with BRSCPP**
```
https://pp.slavy.space/register
```

**Step 2: Get API Key**
```
Dashboard → API Keys → Create New
```

**Step 3: Add Payment Button**
```javascript
<button onClick={() => createPayment(product)}>
  Pay with Crypto
</button>
```

**Step 4: Create Payment Request**
```javascript
const response = await fetch('YOUR_BACKEND/create-payment', {
  method: 'POST',
  body: JSON.stringify({
    productId: product.id,
    price: product.price,
    currency: 'USD',
    network: 'sepolia'
  })
});

const data = await response.json();
window.location.href = data.paymentUrl;
```

**Step 5: Handle Webhooks**
```javascript
app.post('/webhooks/brscpp', (req, res) => {
  const { event, payment } = req.body;
  
  if (event === 'payment.completed') {
    // Fulfill order
    fulfillOrder(payment.orderId);
  }
  
  res.sendStatus(200);
});
```

---

## Related Documentation

- [Main Project](../../README.md)
- [Test Shop Backend](../../backend/testshop_backend/README.md)
- [BRSCPP Backend](../../backend/brscpp_backend/README.md)
- [Payment App](../payment_app/README.md)
- [Marketing Site](../marketing_app/README.md)

---

## License

MIT License

---

Last Updated: December 2025
