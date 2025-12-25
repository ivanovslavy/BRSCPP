# BRSCPP TestShop Frontend

Demo e-commerce storefront showcasing BRSCPP v2 payment gateway integration.

**Version:** 2.0  
**Author:** Slavcho Ivanov  
**Website URL:** https://testshop-frontend.brscpp.slavy.space  
**Backend API:** https://testshop-backend.brscpp.slavy.space  
**Status:** Production Demo (December 2025)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [User Interface](#user-interface)
5. [Payment Flow](#payment-flow)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [Installation](#installation)
9. [Configuration](#configuration)
10. [Deployment](#deployment)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Overview

TestShop Frontend is a fully functional demonstration e-commerce store that showcases complete BRSCPP v2 payment gateway integration. Customers can browse products, select from 12 fiat currencies, choose between cryptocurrency and credit card payments, and complete transactions on multiple blockchain networks.

### Purpose

**Educational:**
- Demonstrate complete payment integration
- Show best practices for UX design
- Provide working code reference
- Enable end-to-end testing

**Functional:**
- Real product catalog
- Multi-currency pricing with live conversion
- Crypto and fiat payment options
- Network selection for crypto payments
- Responsive mobile-first design

### Key Features

**Product Catalog:**
- 3 demo products with real pricing
- High-quality product descriptions
- Placeholder images
- USD base pricing

**Multi-Currency:**
- 12 supported fiat currencies
- Real-time price conversion
- Currency persistence in localStorage
- Flag icons and symbols

**Payment Methods:**
- Cryptocurrency (multi-chain)
- Credit cards via Stripe
- Unified payment flow
- Network selection modal

**User Experience:**
- Responsive design (mobile, tablet, desktop)
- Dark theme with gradient background
- Smooth animations and transitions
- Loading states and error handling

---

## Architecture

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Styling | TailwindCSS | 3.x |
| HTTP Client | Fetch API | Native |
| State | React Hooks | Native |

### Application Structure
```
testshop-frontend/
├── src/
│   ├── App.jsx                # Main application component
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles + Tailwind
├── public/
│   ├── favicon.ico            # Shop icon
│   └── images/                # Product images (planned)
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

### Component Flow
```
┌─────────────────────────────────────────────────────┐
│                Customer Journey                     │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  1. Landing Page                                    │
│     - Load products (default USD)                   │
│     - Load supported currencies                     │
│     - Display product grid                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  2. Select Currency (Optional)                      │
│     - Dropdown with 12 currencies                   │
│     - Real-time price conversion                    │
│     - Persist selection in localStorage             │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  3. Choose Product                                  │
│     - Browse catalog                                │
│     - View prices in selected currency              │
│     - Click "Pay with Crypto" button                │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  4. Network Selection Modal                         │
│     - Choose Sepolia, BSC, or Amoy                  │
│     - Or cancel and return                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  5. Create Payment Request                          │
│     POST /api/create-payment                        │
│     { productId, price, currency, network }         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  6. Redirect to Payment Page                        │
│     payment.brscpp.slavy.space/checkout/ORDER-123   │
│     - Choose crypto or Stripe                       │
│     - Complete payment                              │
└─────────────────────────────────────────────────────┘
```

---

## Features

### Product Catalog

**Available Products:**

**1. Programming Books Bundle**
```javascript
{
  id: "BOOKS",
  name: "Programming Books Bundle",
  description: "Essential coding books: Clean Code, Design Patterns, Refactoring",
  priceUSD: 50.00,
  image: "/images/books.jpg"
}
```

**2. Web Development Course**
```javascript
{
  id: "COURSE",
  name: "Web Development Course",
  description: "Complete full-stack bootcamp with React, Node.js, and MongoDB",
  priceUSD: 99.00,
  image: "/images/course.jpg"
}
```

**3. Cloud Infrastructure Setup**
```javascript
{
  id: "CLOUD",
  name: "Cloud Infrastructure Setup",
  description: "Professional cloud deployment on AWS, Azure, or Google Cloud",
  priceUSD: 199.00,
  image: "/images/cloud.jpg"
}
```

### Multi-Currency Support

**Supported Currencies (12):**

| Code | Currency | Symbol | Flag |
|------|----------|--------|------|
| USD | US Dollar | $ | 🇺🇸 |
| EUR | Euro | € | 🇪🇺 |
| GBP | British Pound | £ | 🇬🇧 |
| JPY | Japanese Yen | ¥ | 🇯🇵 |
| CNY | Chinese Yuan | ¥ | 🇨🇳 |
| RUB | Russian Ruble | ₽ | 🇷🇺 |
| INR | Indian Rupee | ₹ | 🇮🇳 |
| CAD | Canadian Dollar | C$ | 🇨🇦 |
| AUD | Australian Dollar | A$ | 🇦🇺 |
| BRL | Brazilian Real | R$ | 🇧🇷 |
| MXN | Mexican Peso | $ | 🇲🇽 |
| KRW | South Korean Won | ₩ | 🇰🇷 |

**Currency Selector Component:**
```javascript
<div className="currency-selector">
  <button onClick={() => setMenuOpen(!menuOpen)}>
    {currencies[selectedCurrency]?.flag} {selectedCurrency}
  </button>
  
  {menuOpen && (
    <div className="dropdown-menu">
      {Object.entries(currencies).map(([code, info]) => (
        <button key={code} onClick={() => selectCurrency(code)}>
          {info.flag} {code} - {info.name}
        </button>
      ))}
    </div>
  )}
</div>
```

**Price Formatting:**
```javascript
function formatPrice(price, currency) {
  const zeroDecimalCurrencies = ['JPY', 'KRW'];
  
  if (zeroDecimalCurrencies.includes(currency)) {
    return Math.round(price).toLocaleString();
  }
  
  return price.toFixed(2);
}
```

### Network Selection Modal

**Modal Design:**
```
╔══════════════════════════════════════╗
║  Choose Blockchain Network           ║
║                                      ║
║  Select a network for your payment   ║
║                                      ║
║  ┌────────────────────────────────┐ ║
║  │  🟢 Sepolia                    │ ║
║  │  Ethereum Testnet              │ ║
║  └────────────────────────────────┘ ║
║                                      ║
║  ┌────────────────────────────────┐ ║
║  │  🟡 BSC Testnet                │ ║
║  │  Binance Smart Chain           │ ║
║  └────────────────────────────────┘ ║
║                                      ║
║  ┌────────────────────────────────┐ ║
║  │  🟣 Polygon Amoy               │ ║
║  │  Polygon Testnet               │ ║
║  └────────────────────────────────┘ ║
║                                      ║
║  [           Cancel           ]      ║
╚══════════════════════════════════════╝
```

**Implementation:**
```javascript
const NetworkModal = ({ product, onSelect, onClose }) => {
  const networks = [
    { id: 'sepolia', name: 'Sepolia', chain: 'Ethereum' },
    { id: 'bscTestnet', name: 'BSC Testnet', chain: 'Binance Smart Chain' },
    { id: 'amoy', name: 'Polygon Amoy', chain: 'Polygon' }
  ];
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Choose Blockchain Network</h2>
        <p>Select a network for your payment</p>
        
        {networks.map(network => (
          <button 
            key={network.id}
            onClick={() => onSelect(network.id)}
            className="network-option"
          >
            <span className="network-name">{network.name}</span>
            <span className="network-chain">{network.chain}</span>
          </button>
        ))}
        
        <button onClick={onClose} className="cancel-button">
          Cancel
        </button>
      </div>
    </div>
  );
};
```

---

## User Interface

### Design System

**Color Palette:**
```css
/* Background Gradient */
background: linear-gradient(
  135deg,
  #0f172a 0%,    /* Slate-900 */
  #1e293b 50%,   /* Slate-800 */
  #0f172a 100%   /* Slate-900 */
);

/* Component Colors */
--card-bg: rgba(30, 41, 59, 0.6);
--card-border: rgba(100, 116, 139, 0.3);
--card-hover: rgba(59, 130, 246, 0.1);

--primary: #3b82f6;     /* Blue-500 */
--primary-hover: #2563eb; /* Blue-600 */

--text-primary: #f8fafc;   /* Slate-50 */
--text-secondary: #cbd5e1; /* Slate-300 */
--text-muted: #94a3b8;     /* Slate-400 */

--success: #10b981;  /* Green-500 */
--error: #ef4444;    /* Red-500 */
```

**Typography:**
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Headings */
h1: 2.5rem (40px), 700 weight
h2: 2rem (32px), 600 weight
h3: 1.5rem (24px), 600 weight

/* Body */
body: 1rem (16px), 400 weight
small: 0.875rem (14px), 400 weight
```

**Spacing:**
```css
--space-xs: 0.25rem;  /* 4px */
--space-sm: 0.5rem;   /* 8px */
--space-md: 1rem;     /* 16px */
--space-lg: 1.5rem;   /* 24px */
--space-xl: 2rem;     /* 32px */
--space-2xl: 3rem;    /* 48px */
```

### Layout Components

**Header:**
```javascript
<header className="header">
  <div className="container">
    <div className="header-content">
      <h1>BRSCPP TestShop</h1>
      <p>Multi-Currency • Multi-Chain Payments</p>
    </div>
    
    <CurrencySelector 
      currencies={currencies}
      selected={selectedCurrency}
      onChange={handleCurrencyChange}
    />
  </div>
</header>
```

**Product Grid:**
```javascript
<div className="product-grid">
  {products.map(product => (
    <div key={product.id} className="product-card">
      <img src={product.image} alt={product.name} />
      
      <h3>{product.name}</h3>
      <p className="description">{product.description}</p>
      
      <div className="price-section">
        <span className="price">
          {currencies[selectedCurrency]?.symbol}
          {formatPrice(product.price, selectedCurrency)}
        </span>
        <span className="currency">{selectedCurrency}</span>
      </div>
      
      <button 
        onClick={() => handlePayment(product)}
        className="pay-button"
      >
        Pay with Crypto
      </button>
    </div>
  ))}
</div>
```

**Footer:**
```javascript
<footer className="footer">
  <div className="container">
    <p>
      Powered by <a href="https://brscpp.slavy.space">BRSCPP</a>
    </p>
    <p className="description">
      Demo shop showcasing cryptocurrency and fiat payment integration
    </p>
  </div>
</footer>
```

### Responsive Design

**Breakpoints:**
```css
/* Mobile First */
.product-grid {
  grid-template-columns: 1fr;
}

/* Tablet */
@media (min-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**Mobile Optimizations:**
- Touch-friendly buttons (min 48px height)
- Larger font sizes
- Simplified navigation
- Full-width product cards
- Bottom-sheet modals

---

## Payment Flow

### Complete Flow Implementation

**Step 1: Product Selection**
```javascript
const handlePaymentClick = (product) => {
  setSelectedProduct(product);
  setShowNetworkModal(true);
};
```

**Step 2: Network Selection**
```javascript
const handleNetworkSelect = async (network) => {
  setShowNetworkModal(false);
  setLoading(true);
  
  try {
    await createPayment(selectedProduct, network);
  } catch (error) {
    setError('Payment creation failed');
    setLoading(false);
  }
};
```

**Step 3: Payment Request Creation**
```javascript
const createPayment = async (product, network) => {
  const response = await fetch(
    `${BACKEND_URL}/api/create-payment`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        productName: product.name,
        price: product.price,
        currency: selectedCurrency,
        network: network
      })
    }
  );
  
  if (!response.ok) {
    throw new Error('Payment creation failed');
  }
  
  const data = await response.json();
  
  // Redirect to payment page
  window.location.href = data.paymentUrl;
};
```

**Step 4: Redirect to Payment Page**
```
Payment URL format:
https://payment.brscpp.slavy.space/checkout/TESTSHOP-1734876543210-BOOKS

Customer completes payment on BRSCPP payment page
```

### Order ID Format
```javascript
const orderId = `TESTSHOP-${Date.now()}-${productId}`;

// Examples:
// TESTSHOP-1734876543210-BOOKS
// TESTSHOP-1734876543210-COURSE
// TESTSHOP-1734876543210-CLOUD
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
const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
```

### Data Loading
```javascript
useEffect(() => {
  // Load on mount
  const savedCurrency = localStorage.getItem('testshop_currency') || 'USD';
  setSelectedCurrency(savedCurrency);
  
  fetchCurrencies();
  fetchProducts(savedCurrency);
}, []);
```

### Currency Management
```javascript
const handleCurrencyChange = (currency) => {
  setSelectedCurrency(currency);
  localStorage.setItem('testshop_currency', currency);
  setCurrencyMenuOpen(false);
  fetchProducts(currency);
};
```

---

## API Integration

### Fetch Products
```javascript
const fetchProducts = async (currency) => {
  setLoading(true);
  setError('');
  
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/products?currency=${currency}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to load products');
    }
    
    const data = await response.json();
    setProducts(data.products);
  } catch (err) {
    setError('Failed to load products. Please try again.');
    console.error('Product fetch error:', err);
  } finally {
    setLoading(false);
  }
};
```

### Fetch Currencies
```javascript
const fetchCurrencies = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/currencies`);
    
    if (!response.ok) {
      throw new Error('Failed to load currencies');
    }
    
    const data = await response.json();
    setCurrencies(data.currencies);
  } catch (err) {
    console.error('Currency fetch error:', err);
    // Use default currencies if fetch fails
    setCurrencies(DEFAULT_CURRENCIES);
  }
};
```

### Create Payment
```javascript
const createPayment = async (product, network) => {
  const response = await fetch(
    `${BACKEND_URL}/api/create-payment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: product.id,
        productName: product.name,
        price: product.price,
        currency: selectedCurrency,
        network: network
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Payment creation failed');
  }
  
  return await response.json();
};
```

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
cd testshop/frontend

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
    "react-dom": "^18.2.0"
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
# Backend API
VITE_BACKEND_URL=https://testshop-backend.brscpp.slavy.space

# Shop Configuration
VITE_SHOP_NAME=BRSCPP TestShop
VITE_DEFAULT_CURRENCY=USD

# Feature Flags
VITE_ENABLE_STRIPE=true
VITE_ENABLE_AMOY=true
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
    port: 5173,
    host: '0.0.0.0'
  },
  preview: {
    port: 3067,
    host: '0.0.0.0'
  }
}
```

---

## Deployment

### Build Process
```bash
cd ~/brscpp/pp-v2/testshop/frontend
npm run build
```

### Systemd Service

**Service File:** `/etc/systemd/system/brscpp-v2-testshop-frontend.service`
```ini
[Unit]
Description=BRSCPP v2 TestShop Frontend
After=network.target

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/brscpp/pp-v2/testshop/frontend
ExecStart=/usr/bin/npx vite preview --host 0.0.0.0 --port 3067
Restart=always
RestartSec=10

Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Service Management
```bash
# Start service
sudo systemctl start brscpp-v2-testshop-frontend.service

# Rebuild and restart
cd ~/brscpp/pp-v2/testshop/frontend
npm run build
sudo systemctl restart brscpp-v2-testshop-frontend.service

# View logs
sudo journalctl -u brscpp-v2-testshop-frontend.service -f
```

### Apache Configuration
```apache
<VirtualHost *:443>
    ServerName testshop-frontend.brscpp.slavy.space
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3067/
    ProxyPassReverse / http://127.0.0.1:3067/
    
    ErrorLog /var/log/apache2/testshop-frontend-error.log
    CustomLog /var/log/apache2/testshop-frontend-access.log combined
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/testshop-frontend.brscpp.slavy.space/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/testshop-frontend.brscpp.slavy.space/privkey.pem
</VirtualHost>
```

---

## Testing

### Manual Testing Checklist

**Product Display:**
- [ ] Load page successfully
- [ ] 3 products displayed
- [ ] Prices shown in USD (default)
- [ ] Product descriptions visible
- [ ] Images load correctly

**Currency Selection:**
- [ ] Open currency dropdown
- [ ] Select EUR
- [ ] Prices update immediately
- [ ] Currency persists in localStorage
- [ ] Refresh page (resets to USD)

**Network Selection:**
- [ ] Click "Pay with Crypto"
- [ ] Modal appears
- [ ] 3 networks shown (Sepolia, BSC, Amoy)
- [ ] Select network
- [ ] Modal closes

**Payment Flow:**
- [ ] Payment request created
- [ ] Redirect to payment page
- [ ] Order ID in correct format
- [ ] Complete payment
- [ ] Verify transaction

### Test URLs

**Development:**
```
http://localhost:5173/
```

**Production:**
```
https://testshop-frontend.brscpp.slavy.space/
```

---

## Troubleshooting

### Common Issues

**Products Not Loading:**
```bash
# Check backend status
curl https://testshop-backend.brscpp.slavy.space/health

# Check browser console for errors
# Open DevTools → Console tab

# Verify CORS configuration
# Check Network tab for CORS errors
```

**Currency Not Changing:**
```bash
# Check localStorage
localStorage.getItem('testshop_currency')

# Clear cache
localStorage.clear()
location.reload()

# Verify backend response
curl "https://testshop-backend.brscpp.slavy.space/api/products?currency=EUR"
```

**Modal Not Appearing:**
```bash
# Check console for JavaScript errors
# Verify React state updates
# Check z-index CSS conflicts
```

**Payment Redirect Failing:**
```bash
# Check console logs
console.log('Payment response:', data)

# Verify payment URL format
# Check for popup blockers
# Ensure no JavaScript errors
```

---

## Future Enhancements

### Phase 1 (Q1 2026)

**Features:**
- Shopping cart
- Product search
- Product categories
- Image gallery
- Product reviews

**UX:**
- Product quick view
- Wishlist
- Recently viewed
- Product comparison
- Related products

### Phase 2 (Q2 2026)

**E-commerce:**
- Customer accounts
- Order history
- Email notifications
- Discount codes
- Loyalty program

**Analytics:**
- Google Analytics
- Conversion tracking
- User behavior analysis

---

## Related Documentation

- [Main Project Documentation](../../README.md)
- [TestShop Backend](../backend/README.md)
- [BRSCPP Backend API](../../backend/README.md)
- [Payment Application](../../frontend/payment-app/README.md)
- [Developer Integration Guide](../../DEV_SUPPORT.md)

---

## License

MIT License

---

**Last Updated:** December 22, 2025  
**Document Version:** 2.0  
**Author:** Slavcho Ivanov
