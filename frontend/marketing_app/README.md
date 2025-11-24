# BRSCPP Marketing Site

Informational website for BRSCPP decentralized cryptocurrency payment gateway.

## Technology Stack

- React 18
- Vite 7
- TailwindCSS 3
- React Router DOM 6
- ethers.js 6

## Project Structure
```
marketing/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   └── CodeBlock.jsx        # Code syntax display
│   ├── pages/
│   │   ├── Home.jsx             # Landing page
│   │   ├── Docs.jsx             # API documentation
│   │   ├── Integration.jsx      # Integration examples
│   │   └── Register.jsx         # Merchant registration
│   ├── App.jsx                  # Root component with routing
│   ├── main.jsx                 # Application entry point
│   └── index.css                # Tailwind CSS imports
├── public/                      # Static assets
├── dist/                        # Production build output
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Installation
```bash
cd ~/pp/frontend/marketing
npm install
```

## Development
```bash
npm run dev
```

Server runs on http://localhost:3050

## Production Build
```bash
npm run build
npm run preview
```

Build output in `dist/` directory.

## Deployment

Site runs as systemd service on port 3050.

### Service Management
```bash
# Start service
sudo systemctl start brscpp-marketing.service

# Stop service
sudo systemctl stop brscpp-marketing.service

# Restart service
sudo systemctl restart brscpp-marketing.service

# View logs
sudo journalctl -u brscpp-marketing.service -f
```

### Service Configuration

Location: `/etc/systemd/system/brscpp-marketing.service`
```ini
[Unit]
Description=BRSCPP Marketing Site
After=network.target

[Service]
Type=simple
User=slavy
WorkingDirectory=/home/slavy/pp/frontend/marketing
Environment="NODE_ENV=production"
Environment="PORT=3050"
ExecStart=/usr/bin/npm run preview -- --port 3050 --host 0.0.0.0
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Pages

### Home (/)
Landing page with value proposition, features, and how it works explanation.

### Documentation (/docs)
Complete API documentation including authentication, endpoints, request/response examples, and error codes.

### Integration (/integration)
Code examples for React SDK, WordPress plugin, API integration, and iframe embed.

### Register (/register)
Merchant registration form with wallet connection via MetaMask. Creates merchant account and generates API key.

## Features

- Dark theme with matte colors
- Responsive design (mobile, tablet, desktop)
- Fixed sidebar navigation (desktop) / hamburger menu (mobile)
- Code syntax highlighting with copy button
- Wallet connection for merchant registration
- Single-page application with client-side routing

## Configuration

### Vite Config
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3050,
    host: '0.0.0.0'
  },
  preview: {
    port: 3050,
    host: '0.0.0.0',
    allowedHosts: ['pp.slavy.space', 'localhost']
  }
})
```

### Tailwind Config

Custom color palette with dark theme:
- Primary background: #0A0E1A
- Secondary background: #151B2E
- Accent: #3B5BDB
- Text primary: #E8E9ED
- Text secondary: #9BA1B4

## API Integration

Marketing site connects to backend API for merchant registration:
```
POST https://api.pp.slavy.space/api/merchant/register
```

## Environment

No environment variables required. All configuration in code.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires MetaMask extension for wallet connection.

## Build Process

1. Vite compiles React components
2. TailwindCSS processes utility classes
3. Output minified bundle to dist/
4. Service serves static files via Vite preview

## Troubleshooting

### CSS not loading
```bash
rm -rf dist node_modules/.vite
npm run build
sudo systemctl restart brscpp-marketing.service
```

### Port already in use
```bash
sudo lsof -i :3050
sudo systemctl stop brscpp-marketing.service
```

### Service won't start
```bash
sudo journalctl -u brscpp-marketing.service -n 50
cd ~/pp/frontend/marketing
npm run build
```

## Links

- Production: https://pp.slavy.space
- API: https://api.pp.slavy.space
- Payment App: https://app.pp.slavy.space
- GitHub: https://github.com/ivanovslavy/BRSCPP

## License

MIT
