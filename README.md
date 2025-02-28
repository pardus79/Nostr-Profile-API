# Nostr Profile API

A simple API service that connects to Nostr relays and provides Lightning address lookups for npubs.

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

## Setup and Configuration

1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and configure as needed
4. Generate API keys using `npm run generate-key`
5. Run `npm start` (or use Docker)

### Configuration Options

Key environment variables:
- `API_KEYS`: Comma-separated list of API keys for authentication
- `DEFAULT_RELAYS`: Comma-separated list of Nostr relay WebSocket URLs
- `CACHE_TTL`: TTL for cached profile data in seconds (default: 3600)
- `RATE_LIMIT_MAX`: Maximum requests per IP in 15-minute window (default: 100)

See `.env.example` for all available options.

## Docker Deployment

```bash
docker-compose up -d
```

## Architecture

- REST API layer for handling HTTP requests
- Relay connection manager for maintaining WebSocket connections
- Cache layer for storing profile data
- Authentication and security middleware