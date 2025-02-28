# Nostr Profile API

A simple API service that connects to Nostr relays and provides Lightning address lookups for npubs. This service is designed to be used with WordPress plugins and other applications that need to retrieve Lightning addresses for Nostr users.

## Features

- Connects to multiple configurable Nostr relays using WebSockets
- REST API endpoint for looking up Lightning addresses by npub
- Extracts Lightning addresses from kind:0 metadata events (lud06/lud16 fields)
- Implements robust caching to minimize relay connections
- Handles connection failures gracefully
- Supports configurable relay list
- API key authentication for authorized access
- Rate limiting and request throttling
- Detailed request logging with privacy protection

## API Endpoints

### GET /api/v1/profile/:npub

Fetches Lightning address for the specified npub.

**Request:**

```
GET /api/v1/profile/npub1... HTTP/1.1
Host: your-api-domain.com
X-API-Key: your-api-key
```

You can provide the API key in any of these ways:
- Header: `X-API-Key: your-api-key`
- Header: `Authorization: your-api-key`
- Query parameter: `?api_key=your-api-key`

**Response:**

```json
{
  "npub": "npub1...",
  "lightning_address": "user@domain.com",
  "relay_source": "wss://relay.example.com",
  "cached": true,
  "cache_age": 3600
}
```

### GET /api/v1/relays

Returns status information about connected relays.

**Request:**
```
GET /api/v1/relays HTTP/1.1
Host: your-api-domain.com
X-API-Key: your-api-key
```

**Response:**
```json
[
  {
    "url": "wss://relay.damus.io",
    "status": "connected",
    "lastConnected": 1677123456789
  },
  {
    "url": "wss://relay.nostr.info",
    "status": "disconnected",
    "lastConnected": 1677123456789,
    "lastError": 1677123459999
  }
]
```

### GET /api/v1/health

Returns the health status of the API. This endpoint does not require authentication.

**Response:**
```json
{
  "status": "ok"
}
```

## Security Features

- API key authentication for all endpoints except health check
- Time-constant comparison for API key validation to prevent timing attacks
- Request rate limiting to prevent abuse
- Progressive request throttling for fair access
- CORS configuration for controlled access
- Advanced security headers via Helmet
- Request logging with PII protection
- Payload size limiting
- Secure error handling that doesn't expose internals

## Technologies

- Node.js with Express
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) for Nostr protocol implementation
- node-cache for in-memory caching
- WebSockets for relay connections

## Installation and Setup

### Prerequisites

- Node.js 14+ (18+ recommended)
- npm or yarn
- A server with port 3000 available (or configurable)

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Nostr-Profile-API.git
   cd Nostr-Profile-API
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Generate an API key:
   ```bash
   npm run generate-key
   ```

5. Edit the `.env` file to add your API key and configure other settings:
   ```bash
   nano .env
   ```
   
   Add the generated API key to the `API_KEYS` variable.

6. Add global WebSocket support for Node.js:
   ```bash
   # Edit the relay manager file
   nano src/services/relayManager.js
   
   # Add this line at the very top of the file:
   global.WebSocket = require('ws');
   ```

7. Start the service:
   ```bash
   npm start
   ```

8. Test the API:
   ```bash
   curl http://localhost:3000/api/v1/health
   curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v1/relays
   ```

### Production Deployment with Caddy

1. Install Node.js 18+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

2. Install Caddy:
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy
   ```

3. Clone and set up the application:
   ```bash
   git clone https://github.com/yourusername/Nostr-Profile-API.git
   cd Nostr-Profile-API
   npm install
   cp .env.example .env
   npm run generate-key
   nano .env  # Add your API key and other settings
   
   # Add WebSocket support
   nano src/services/relayManager.js
   # Add "global.WebSocket = require('ws');" at the top
   ```

4. Create a systemd service file:
   ```bash
   sudo nano /etc/systemd/system/nostr-profile-api.service
   ```

   Add the following content (replace with your actual username and paths):
   ```
   [Unit]
   Description=Nostr Profile API
   After=network.target

   [Service]
   Type=simple
   User=your-username
   WorkingDirectory=/path/to/Nostr-Profile-API
   ExecStart=/usr/bin/node /path/to/Nostr-Profile-API/src/index.js
   Restart=on-failure
   RestartSec=10
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

5. Enable and start the service:
   ```bash
   sudo systemctl enable nostr-profile-api
   sudo systemctl start nostr-profile-api
   ```

6. Configure Caddy as a reverse proxy:
   ```bash
   sudo nano /etc/caddy/Caddyfile
   ```

   Add your configuration:
   ```
   api.yourdomain.com {
       reverse_proxy localhost:3000
       tls your@email.com
   }
   ```

7. Reload Caddy:
   ```bash
   sudo systemctl reload caddy
   ```

8. Test the API through your domain:
   ```bash
   curl https://api.yourdomain.com/api/v1/health
   ```

### Docker Deployment

1. Build and start the Docker container:
   ```bash
   docker-compose up -d
   ```

2. The service will be available on port 3000.

## Configuration Options

Key environment variables:
- `API_KEYS`: Comma-separated list of API keys for authentication
- `DEFAULT_RELAYS`: Comma-separated list of Nostr relay WebSocket URLs
- `CACHE_TTL`: TTL for cached profile data in seconds (default: 3600)
- `RATE_LIMIT_MAX`: Maximum requests per IP in 15-minute window (default: 100)
- `ALLOWED_ORIGINS`: Domains allowed to access the API (CORS)

See `.env.example` for all available options.

## Troubleshooting

If you encounter issues with the service, check these common problems:

1. **WebSocket not defined error**: Make sure you've added `global.WebSocket = require('ws');` to the top of src/services/relayManager.js

2. **User-related systemd errors**: Ensure the username in your service file exists on the system

3. **Node.js version issues**: Verify you're using Node.js 14+ (18+ recommended)

4. **Connection refused**: Make sure the port isn't blocked by firewall

5. **API Key authentication errors**: Verify your API key is correctly configured in the .env file

For detailed logging, check systemd logs:
```bash
sudo journalctl -u nostr-profile-api -f
```

## Integrating with WordPress

To integrate this API with a WordPress plugin:

1. Configure the WordPress plugin with:
   - The API endpoint URL (e.g., https://api.yourdomain.com)
   - Your API key

2. The plugin should make requests to `/api/v1/profile/:npub` with the API key in the header.

3. Parse the JSON response to extract the Lightning address.

## Architecture

- REST API layer for handling HTTP requests
- Relay connection manager for maintaining WebSocket connections
- Cache layer for storing profile data
- Authentication and security middleware