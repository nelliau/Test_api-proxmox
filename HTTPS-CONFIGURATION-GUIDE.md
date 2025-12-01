# HTTPS Configuration Guide

This guide explains how to configure HTTPS/SSL for the Realtime Messaging API server.

## Overview

The server supports both HTTP and HTTPS connections. When SSL certificates are provided, the server automatically creates an HTTPS server. Otherwise, it falls back to HTTP.

## Prerequisites

You'll need the following SSL certificate files:
- **Private Key**: The private key file (`.key` or `.pem`)
- **Certificate**: The SSL certificate file (`.crt` or `.pem`)
- **CA Bundle** (optional): The certificate authority bundle file (`.ca-bundle` or `.pem`)

## Configuration

### 1. Obtain SSL Certificates

#### Option A: Let's Encrypt (Free, Recommended for Production)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates for your domain
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be created in:
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

#### Option B: Self-Signed Certificate (Development Only)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# You'll be prompted for information:
# Country Name: US
# State: Your State
# Locality: Your City
# Organization: Your Organization
# Common Name: localhost (or your domain)
```

#### Option C: Commercial SSL Certificate

Purchase an SSL certificate from a provider like:
- DigiCert
- Comodo
- GoDaddy
- Namecheap

Follow their instructions to generate CSR and download the certificate files.

### 2. Configure Environment Variables

Edit your `.env` file:

```bash
# SSL/HTTPS Configuration
SSL_KEY_PATH=/path/to/privkey.pem
SSL_CERT_PATH=/path/to/fullchain.pem
SSL_CA_PATH=/path/to/chain.pem  # Optional, for CA bundle
```

#### Example with Let's Encrypt:

```bash
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

#### Example with Self-Signed Certificates:

```bash
SSL_KEY_PATH=/home/user/ssl/key.pem
SSL_CERT_PATH=/home/user/ssl/cert.pem
```

### 3. Set File Permissions

Ensure the Node.js process has read access to the certificate files:

```bash
# For Let's Encrypt certificates
sudo chmod 644 /etc/letsencrypt/live/yourdomain.com/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/yourdomain.com/privkey.pem

# For custom certificates
chmod 644 /path/to/cert.pem
chmod 600 /path/to/key.pem
```

If running as a non-root user, you may need to copy the certificates:

```bash
# Copy Let's Encrypt certificates to your project
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ~/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ~/ssl/
sudo chown $USER:$USER ~/ssl/*
chmod 600 ~/ssl/privkey.pem
```

### 4. Start the Server

```bash
npm start
```

You should see:

```
🔒 HTTPS server configured with SSL certificates
✅ Server running on port 3000
```

If SSL certificates are not found or not configured, you'll see:

```
🌐 HTTP server configured (no SSL certificates found)
✅ Server running on port 3000
```

## Accessing the Server

### HTTPS (with SSL)
```
https://yourdomain.com:3000
https://localhost:3000  (self-signed)
```

### HTTP (without SSL)
```
http://localhost:3000
```

## Client Configuration

### JavaScript/TypeScript

```javascript
// HTTPS
const response = await fetch('https://yourdomain.com:3000/api/endpoint', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your-token'
  }
});

// Socket.IO with HTTPS
import io from 'socket.io-client';
const socket = io('https://yourdomain.com:3000', {
  secure: true,
  rejectUnauthorized: true  // Set to false for self-signed certs in development
});
```

### Android (Kotlin)

```kotlin
// For self-signed certificates in development, you may need to trust all certificates
// DO NOT USE IN PRODUCTION!
val client = OkHttpClient.Builder()
    .sslSocketFactory(trustAllCerts, trustManager)
    .hostnameVerifier { _, _ -> true }
    .build()

// For production with valid certificates, use default client
val client = OkHttpClient()
```

### iOS (Swift)

```swift
// For valid certificates (production)
let session = URLSession.shared

// For self-signed certificates (development only)
// Implement URLSessionDelegate and override certificate validation
```

## Reverse Proxy with Nginx (Recommended for Production)

Instead of handling SSL in Node.js, use Nginx as a reverse proxy:

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### With Nginx, update your .env:

```bash
# Don't configure SSL in Node.js
# SSL_KEY_PATH=
# SSL_CERT_PATH=

# But configure trust proxy
TRUST_PROXY=1

# Server listens on HTTP (Nginx handles HTTPS)
PORT=3000
```

Start Nginx:

```bash
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## Security Best Practices

### 1. Use Strong Ciphers
The server uses Node.js default ciphers, which are secure by default. For custom configuration:

```javascript
const sslOptions = {
  key: fs.readFileSync(SSL_KEY_PATH),
  cert: fs.readFileSync(SSL_CERT_PATH),
  ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256',
  honorCipherOrder: true,
  secureProtocol: 'TLSv1_2_method'
};
```

### 2. Redirect HTTP to HTTPS

Add this Express middleware if not using Nginx:

```javascript
app.use((req, res, next) => {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next();
});
```

### 3. HSTS (HTTP Strict Transport Security)

Already enabled via Helmet middleware in the server.

### 4. Certificate Renewal

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Set up auto-renewal (runs twice daily)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Or use cron
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet
```

### 5. Monitor Certificate Expiration

Use tools like:
- SSL Labs: https://www.ssllabs.com/ssltest/
- Certificate expiration monitoring services
- Prometheus + Alertmanager

## Troubleshooting

### Error: ENOENT: no such file or directory

Check that:
1. File paths are correct
2. Files exist at the specified locations
3. Node.js process has read permissions

```bash
ls -la /path/to/cert.pem
ls -la /path/to/key.pem
```

### Error: EACCES: permission denied

Fix permissions:

```bash
sudo chmod 644 /path/to/cert.pem
sudo chmod 600 /path/to/key.pem
```

Or run Node.js as root (not recommended):

```bash
sudo node server.js
```

### Error: unable to get local issuer certificate

Your CA bundle may be missing or incorrect. Add:

```bash
SSL_CA_PATH=/path/to/ca-bundle.pem
```

### Self-Signed Certificate Warnings

Browsers will show warnings for self-signed certificates. For development:
1. Click "Advanced" and "Proceed anyway"
2. Or add the certificate to your OS trust store

For production, use a valid certificate from a trusted CA.

### Socket.IO won't connect over HTTPS

Check:
1. `secure: true` is set in Socket.IO client
2. CORS is configured correctly for HTTPS origins
3. Certificate is valid and trusted

```javascript
const socket = io('https://yourdomain.com:3000', {
  secure: true,
  rejectUnauthorized: false  // Only for development with self-signed
});
```

## Testing

### Test HTTPS Endpoint

```bash
# With valid certificate
curl https://yourdomain.com:3000/health

# With self-signed certificate (ignore validation)
curl -k https://localhost:3000/health
```

### Test SSL Configuration

```bash
# Check certificate details
openssl s_client -connect yourdomain.com:3000 -showcerts

# Test with specific TLS version
openssl s_client -connect yourdomain.com:3000 -tls1_2
```

### Test with SSL Labs

For publicly accessible servers:
https://www.ssllabs.com/ssltest/

## Production Checklist

- [ ] Use certificates from a trusted CA (not self-signed)
- [ ] Configure automatic certificate renewal
- [ ] Use Nginx or similar reverse proxy
- [ ] Enable HSTS
- [ ] Redirect HTTP to HTTPS
- [ ] Use TLS 1.2 or higher only
- [ ] Monitor certificate expiration
- [ ] Set up proper file permissions
- [ ] Configure firewall to allow 443 (HTTPS)
- [ ] Test SSL configuration with SSL Labs
- [ ] Update ALLOWED_ORIGINS to include HTTPS URLs
- [ ] Set TRUST_PROXY correctly if behind a proxy

## References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Node.js HTTPS Module](https://nodejs.org/api/https.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Best Practices](https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices)
