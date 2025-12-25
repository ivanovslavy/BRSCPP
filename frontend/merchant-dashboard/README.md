# BRSCPP Merchant Dashboard

Merchant portal for payment management, analytics, and configuration.

**Version:** 2.0  
**Author:** Slavcho Ivanov  
**Application URL:** https://merchant-dashboard.brscpp.slavy.space  
**Status:** In Progress (Core Features Complete - December 2025)

---

## Table of Contents

1. [Overview](#overview)
2. [Current Features](#current-features)
3. [Planned Features](#planned-features)
4. [Architecture](#architecture)
5. [Authentication](#authentication)
6. [Dashboard Pages](#dashboard-pages)
7. [API Integration](#api-integration)
8. [Installation](#installation)
9. [Configuration](#configuration)
10. [Deployment](#deployment)
11. [Development Status](#development-status)
12. [Future Enhancements](#future-enhancements)

---

## Overview

The Merchant Dashboard provides a web-based interface for merchants to manage their BRSCPP integration, monitor payments, configure settings, and access analytics.

### Core Purpose

**Payment Management:**
- View payment history and statistics
- Monitor real-time transaction status
- Access transaction details and receipts

**Configuration:**
- Manage API keys
- Configure webhook endpoints
- Set payment method preferences
- Configure accepted networks and tokens

**Analytics:**
- Revenue tracking and reporting
- Payment success rates
- Network and token usage statistics
- Customer analytics

---

## Current Features

### Authentication System ✅

**Registration Methods:**
- Email and password registration
- Web3 wallet registration (MetaMask)
- Password recovery system
- Session management with JWT tokens

**Security:**
- bcrypt password hashing (10 rounds)
- JWT tokens with 30-day expiration
- Secure session storage
- Automatic token refresh

### Dashboard Overview ✅

**Statistics Display:**
- Total revenue (USD)
- Total transactions
- Success rate percentage
- Recent payment activity

**Quick Actions:**
- Create new payment request
- View API documentation
- Access settings
- Generate API key

### Settings Page ✅

**Payment Method Configuration:**
- Enable/disable cryptocurrency payments
- Enable/disable Stripe payments
- Network selection (Sepolia, BSC, Amoy)
- Token selection per network (ETH, BNB, MATIC, USDC, USDT)

**Webhook Configuration:**
- Set webhook URL
- Configure webhook secret
- Test webhook delivery
- View webhook logs

**API Key Management:**
- Generate new API keys
- View existing keys
- Revoke keys
- Set key permissions

### Transaction History (In Progress) 🚧

**Planned Features:**
- Paginated transaction list
- Search and filter capabilities
- Export to CSV
- Transaction details modal

---

## Planned Features

### Analytics Dashboard 📊

**Revenue Analytics:**
- Daily, weekly, monthly revenue charts
- Revenue by payment method
- Revenue by network
- Revenue trends and forecasting

**Transaction Analytics:**
- Payment success/failure rates
- Average transaction value
- Peak transaction times
- Geographic distribution

**Token Analytics:**
- Most used tokens
- Network preferences
- Gas cost analysis

### Advanced Settings ⚙️

**Payment Preferences:**
- Custom fee discounts (for whitelisted merchants)
- Minimum/maximum payment amounts
- Auto-refund configuration
- Payment expiration settings

**Notification Settings:**
- Email notifications
- SMS alerts
- Telegram integration
- Discord webhooks

**Security Settings:**
- Two-factor authentication
- API key rotation schedule
- IP whitelist
- Rate limiting configuration

### Reports 📄

**Financial Reports:**
- Monthly revenue reports
- Tax documentation
- Reconciliation reports
- Settlement reports

**Operational Reports:**
- Transaction logs
- Error reports
- Webhook delivery logs
- System health reports

---

## Architecture

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Styling | TailwindCSS | 3.x |
| Routing | React Router | 6.x |
| State | Context API | - |
| HTTP Client | Axios | 1.x |

### Application Structure
```
merchant-dashboard/
├── src/
│   ├── pages/
│   │   ├── Login.jsx              ✅ Complete
│   │   ├── Register.jsx           ✅ Complete
│   │   ├── Dashboard.jsx          ✅ Complete
│   │   ├── Settings.jsx           ✅ Complete
│   │   ├── Transactions.jsx       🚧 In Progress
│   │   ├── Analytics.jsx          📋 Planned
│   │   └── APIKeys.jsx            📋 Planned
│   ├── components/
│   │   ├── Sidebar.jsx            ✅ Complete
│   │   ├── Header.jsx             ✅ Complete
│   │   ├── StatsCard.jsx          ✅ Complete
│   │   ├── PaymentMethodToggle.jsx ✅ Complete
│   │   └── WebhookConfig.jsx      🚧 In Progress
│   ├── context/
│   │   └── AuthContext.jsx        ✅ Complete
│   ├── utils/
│   │   └── api.js                 ✅ Complete
│   ├── App.jsx                    ✅ Complete
│   └── main.jsx                   ✅ Complete
├── public/
├── package.json
├── vite.config.js
└── README.md
```

---

## Authentication

### Login Flow

**Step 1: User Submits Credentials**
```javascript
const handleLogin = async (email, password) => {
  const response = await axios.post(
    'https://api.brscpp.slavy.space/api/auth/login',
    { email, password }
  );
  
  const { token, merchant } = response.data;
  
  // Store token
  localStorage.setItem('merchant_token', token);
  
  // Update auth context
  setAuth({ isAuthenticated: true, merchant, token });
};
```

**Step 2: Token Stored in localStorage**

Token automatically included in all API requests via Axios interceptor.

**Step 3: Redirect to Dashboard**
```javascript
navigate('/dashboard');
```

### Registration Flow

**Email Registration:**
```javascript
const handleRegister = async (email, password, companyName) => {
  const response = await axios.post(
    'https://api.brscpp.slavy.space/api/auth/register',
    { email, password, companyName }
  );
  
  // Automatically logged in after registration
  const { token, merchant } = response.data;
  localStorage.setItem('merchant_token', token);
  setAuth({ isAuthenticated: true, merchant, token });
  navigate('/dashboard');
};
```

**Web3 Registration:**
```javascript
const handleWeb3Register = async () => {
  // Connect wallet
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  
  // Sign message
  const message = `Register merchant account: ${address}`;
  const signature = await signer.signMessage(message);
  
  // Register with backend
  const response = await axios.post(
    'https://api.brscpp.slavy.space/api/auth/register-web3',
    { walletAddress: address, signature, message }
  );
  
  const { token, merchant } = response.data;
  localStorage.setItem('merchant_token', token);
  setAuth({ isAuthenticated: true, merchant, token });
  navigate('/dashboard');
};
```

### Protected Routes
```javascript
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
}
```

---

## Dashboard Pages

### Login Page ✅

**Route:** `/login`

**Features:**
- Email/password form
- "Connect Wallet" option
- "Forgot Password" link
- "Create Account" link
- Error message display
- Loading states

**Form Fields:**
- Email (required)
- Password (required)
- Remember me (checkbox)

### Register Page ✅

**Route:** `/register`

**Features:**
- Email registration form
- Web3 wallet registration
- Password strength indicator
- Terms of service acceptance
- "Already have account" link

**Form Fields:**
- Email (required)
- Password (required, min 8 characters)
- Confirm Password (required)
- Company Name (optional)
- Terms acceptance (required)

### Dashboard Overview ✅

**Route:** `/dashboard`

**Statistics Cards:**
```javascript
<StatsCard 
  title="Total Revenue"
  value={`$${totalRevenue.toFixed(2)}`}
  icon={<DollarIcon />}
/>

<StatsCard 
  title="Total Transactions"
  value={totalTransactions}
  icon={<ChartIcon />}
/>

<StatsCard 
  title="Success Rate"
  value={`${successRate.toFixed(1)}%`}
  icon={<CheckIcon />}
/>
```

**Recent Transactions Table:**
- Order ID
- Amount
- Payment method
- Status
- Date
- View details link

**Quick Actions:**
- "Create Payment Request" button
- "View All Transactions" button
- "API Documentation" link

### Settings Page ✅

**Route:** `/settings`

**Sections:**

**1. Payment Methods**
```javascript
<ToggleSwitch 
  label="Cryptocurrency Payments"
  checked={cryptoEnabled}
  onChange={handleCryptoToggle}
/>

<ToggleSwitch 
  label="Stripe Payments"
  checked={stripeEnabled}
  onChange={handleStripeToggle}
/>
```

**2. Network Configuration**
```javascript
<NetworkSelector 
  networks={['sepolia', 'bscTestnet', 'amoy']}
  selected={enabledNetworks}
  onChange={handleNetworkChange}
/>
```

**3. Token Configuration (per network)**
```javascript
<TokenSelector 
  network="sepolia"
  tokens={['ETH', 'USDC', 'USDT']}
  selected={sepoliaTokens}
  onChange={handleTokenChange}
/>
```

**4. Webhook Configuration**
```javascript
<WebhookConfig 
  webhookUrl={webhookUrl}
  webhookSecret={webhookSecret}
  onSave={handleWebhookSave}
  onTest={handleWebhookTest}
/>
```

**5. API Keys**
- View existing keys
- Generate new key button
- Revoke key button
- Copy key to clipboard

**Save Button:**
```javascript
<button 
  onClick={handleSaveSettings}
  className="bg-blue-600 text-white px-6 py-2 rounded"
>
  Save Settings
</button>
```

### Transactions Page 🚧

**Route:** `/transactions`

**Status:** In Progress

**Planned Features:**

**Filter Panel:**
- Date range selector
- Payment method filter
- Status filter (pending, completed, failed)
- Network filter
- Search by order ID

**Transaction Table:**
- Order ID
- Date and time
- Amount (original currency + USD)
- Payment method
- Network
- Token
- Status badge
- Actions (view details, receipt)

**Pagination:**
- Results per page selector
- Page navigation
- Total count display

**Export Options:**
- Export to CSV
- Export to PDF
- Date range for export

---

## API Integration

### API Client Setup
```javascript
// src/utils/api.js

import axios from 'axios';

const API_BASE = 'https://api.brscpp.slavy.space';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('merchant_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('merchant_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### API Endpoints Used

**Authentication:**
- POST `/api/auth/login`
- POST `/api/auth/register`
- POST `/api/auth/register-web3`
- GET `/api/auth/me`

**Dashboard:**
- GET `/api/auth/dashboard/stats`
- GET `/api/auth/dashboard/transactions`

**Settings:**
- GET `/api/merchant/settings`
- PUT `/api/merchant/settings`
- PUT `/api/merchant/webhook`
- POST `/api/merchant/webhook/test`

**API Keys:**
- GET `/api/merchant/apikeys`
- POST `/api/merchant/apikeys`
- DELETE `/api/merchant/apikeys/:id`

**Transactions:**
- GET `/api/merchant/payments`
- GET `/api/merchant/payments/:id`

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
cd frontend/merchant-dashboard

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
    "axios": "^1.6.0",
    "ethers": "^6.15.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## Configuration

### Environment Variables
```bash
# API Configuration
VITE_API_BASE=https://api.brscpp.slavy.space

# Feature Flags
VITE_ENABLE_WEB3_AUTH=true
VITE_ENABLE_2FA=false
```

### Vite Configuration
```javascript
export default {
  plugins: [react()],
  build: {
    outDir: 'build'
  },
  server: {
    port: 5174
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
cd ~/brscpp/pp-v2/frontend/merchant-dashboard
npm run build
```

### Systemd Service

**Service File:** `/etc/systemd/system/brscpp-v2-merchant-dashboard.service`
```ini
[Unit]
Description=BRSCPP v2 Merchant Dashboard
After=network.target

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/brscpp/pp-v2/frontend/merchant-dashboard
ExecStart=/usr/bin/npx vite preview --host 0.0.0.0 --port 3066
Restart=always
RestartSec=10

Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Service Management
```bash
# Start service
sudo systemctl start brscpp-v2-merchant-dashboard.service

# Check status
sudo systemctl status brscpp-v2-merchant-dashboard.service

# Restart after rebuild
cd ~/brscpp/pp-v2/frontend/merchant-dashboard
npm run build
sudo systemctl restart brscpp-v2-merchant-dashboard.service

# View logs
sudo journalctl -u brscpp-v2-merchant-dashboard.service -f
```

### Apache Configuration
```apache
<VirtualHost *:443>
    ServerName merchant-dashboard.brscpp.slavy.space
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3066/
    ProxyPassReverse / http://127.0.0.1:3066/
    
    ErrorLog /var/log/apache2/merchant-dashboard-error.log
    CustomLog /var/log/apache2/merchant-dashboard-access.log combined
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/merchant-dashboard.brscpp.slavy.space/fullchain.pem
    SSLCertificateKeyKey /etc/letsencrypt/live/merchant-dashboard.brscpp.slavy.space/privkey.pem
</VirtualHost>
```

---

## Development Status

### Completed Features ✅

- Authentication system (email + Web3)
- Dashboard overview with statistics
- Settings page with payment method configuration
- Network and token selection
- Webhook configuration
- API key management basics
- Responsive design
- Protected routes
- Session management

### In Progress 🚧

- Transaction history page
- Webhook testing interface
- Advanced API key permissions
- Transaction detail modal
- CSV export functionality

### Planned 📋

- Analytics dashboard
- Revenue charts
- Payment success rate graphs
- Email notification settings
- Two-factor authentication
- Team member management
- Role-based access control
- Custom branding options
- Multi-language support

---

## Future Enhancements

### Phase 1 (Q1 2026)

**Transaction Management:**
- Complete transaction history
- Advanced filtering and search
- Transaction details modal
- Receipt generation
- Refund management

**Analytics:**
- Revenue charts (daily, weekly, monthly)
- Payment method breakdown
- Network usage statistics
- Success rate tracking

### Phase 2 (Q2 2026)

**Advanced Features:**
- Two-factor authentication
- Team member invitations
- Role-based permissions
- Custom webhook events
- API usage analytics

**Reporting:**
- Financial reports
- Tax documentation
- Settlement reports
- Custom report builder

### Phase 3 (Q3 2026)

**Integration Tools:**
- WordPress plugin generator
- JavaScript widget customizer
- Shopify app connection
- WooCommerce plugin

**Developer Tools:**
- API playground
- Webhook simulator
- Test payment generator
- SDK documentation

---

## Related Documentation

- [Main Project Documentation](../../README.md)
- [Backend API Documentation](../../backend/README.md)
- [Payment Application](../payment-app/README.md)
- [Developer Integration Guide](../../DEV_SUPPORT.md)

---

## License

MIT License

---

**Last Updated:** December 22, 2025  
**Document Version:** 2.0 (In Progress)  
**Author:** Slavcho Ivanov

---

## Notes

This dashboard is actively under development. Core features are functional and production-ready, while advanced features are being implemented incrementally. For the most up-to-date feature list, check the GitHub repository or contact the development team.

**Production URL:** https://merchant-dashboard.brscpp.slavy.space

**Test Credentials:**
```
Email: demo@brscpp.com
Password: testuser01
```
