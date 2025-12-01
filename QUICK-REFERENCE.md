# Quick Reference Guide

Quick reference for common operations with the Realtime Messaging API.

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/nelliau/Test_api-proxmox.git
cd Test_api-proxmox
npm install

# Configure
cp .env.example .env
nano .env  # Edit with your settings

# Start server
npm start

# Run tests
npm run test:messaging
```

## 🔐 Authentication

### Register User
```javascript
POST /register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "publicKey": "optional-base64-key"
}

Response: { token, user: { id, email, roles, publicKey } }
```

### Login
```javascript
POST /login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}

Response: { token, user: { id, email, roles, publicKey } }
```

### Use Token
```javascript
fetch('/messages', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
```

## 💬 Messaging

### Send Message (REST)
```javascript
POST /messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "receiverId": 2,
  "content": "Hello!",
  "tempId": "temp-123"  // Optional but recommended
}
```

### Send Message (Socket.IO)
```javascript
socket.emit('send_message', {
  receiverId: 2,
  content: "Hello!",
  tempId: "temp-123"
});

// Listen for confirmation
socket.on('message_sent', (data) => {
  console.log('Sent:', data.messageId);
});
```

### Receive Messages
```javascript
// Socket.IO
socket.on('message', (message) => {
  console.log('New message:', message);
  // { id, senderId, senderEmail, content, timestamp }
});

// REST (polling)
GET /messages/new?since=2024-12-01T10:00:00Z&userId=2
```

### Get Conversation History
```javascript
GET /messages?userId=2&limit=50
Authorization: Bearer {token}

Response: Array of messages with sender/receiver info
```

## ⌨️ Typing Indicators

```javascript
// Start typing
socket.emit('typing_start', { receiverId: 2 });

// Stop typing
socket.emit('typing_stop', { receiverId: 2 });

// Listen for typing
socket.on('typing_start', (data) => {
  console.log(`User ${data.senderId} is typing...`);
});

socket.on('typing_stop', (data) => {
  console.log(`User ${data.senderId} stopped typing`);
});
```

## 👥 Friends System

### Send Friend Request
```javascript
POST /friends/request
Authorization: Bearer {token}
Content-Type: application/json

{
  "receiverId": 2
  // OR
  "receiverEmail": "friend@example.com"
}
```

### Get Pending Requests
```javascript
GET /friends/requests
Authorization: Bearer {token}

Response: { requests: [{ id, sender, status, createdAt }] }
```

### Accept/Decline Request
```javascript
PUT /friends/request/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "accept"  // or "decline"
}
```

### List Friends
```javascript
GET /friends
Authorization: Bearer {token}

Response: { friends: [{ friendshipId, friend, since }] }
```

## 🔍 Search Users

```javascript
GET /users/search?q=john@example.com
Authorization: Bearer {token}

Response: { users: [{ id, email, roles, publicKey }] }
```

## 🔌 Socket.IO Connection

```javascript
import io from 'socket.io-client';

// Connect
const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling']
});

// Authenticate
socket.on('connect', () => {
  socket.emit('authenticate', { token: yourJwtToken });
});

socket.on('authenticated', (data) => {
  console.log('Authenticated!', data.userId);
});

// Error handling
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

## 🔒 HTTPS Configuration

```bash
# .env
SSL_KEY_PATH=/path/to/privkey.pem
SSL_CERT_PATH=/path/to/fullchain.pem
SSL_CA_PATH=/path/to/chain.pem  # Optional

# Let's Encrypt (free)
sudo certbot certonly --standalone -d yourdomain.com

# Self-signed (development)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

## 🛠️ Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=Dashkey_test

# JWT
JWT_SECRET=your-64-char-random-secret
JWT_EXPIRES_IN=7d

# SSL (optional)
SSL_KEY_PATH=/path/to/key.pem
SSL_CERT_PATH=/path/to/cert.pem

# Security
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
TRUST_PROXY=1
```

## 🧪 Testing

```bash
# Test messaging features
npm run test:messaging

# Test basic Socket.IO
npm run test:socket

# Test simple Socket.IO
npm run test:socket:simple

# Manual test
curl http://localhost:3000/health
```

## 📊 Common Commands

```bash
# Start server
npm start

# Check if running
curl http://localhost:3000/

# View logs (systemd)
sudo journalctl -u test-api -f

# Restart service
sudo systemctl restart test-api

# Check status
sudo systemctl status test-api
```

## 🔧 Troubleshooting

### Server won't start
```bash
# Check if port is in use
sudo lsof -i :3000

# Check environment variables
cat .env

# Check logs
npm start
```

### Database connection fails
```bash
# Test MySQL connection
mysql -h DB_HOST -u DB_USER -p

# Check if database exists
mysql> SHOW DATABASES;
```

### Socket.IO won't connect
```javascript
// Enable debug logging
localStorage.debug = 'socket.io-client:*';

// Check CORS
console.log(ALLOWED_ORIGINS);

// Try different transport
const socket = io(url, { transports: ['polling'] });
```

### JWT token invalid
```javascript
// Check token format
console.log(token.split('.').length); // Should be 3

// Check expiration
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(new Date(payload.exp * 1000));

// Check if JWT_SECRET matches
```

## 💡 Tips & Best Practices

### Message Tracking
```javascript
// Always use tempId for better UX
const tempId = `temp-${Date.now()}-${Math.random()}`;
sendMessage(receiverId, content, tempId);
```

### Typing Indicators
```javascript
// Debounce typing events
let typingTimeout;
input.addEventListener('input', () => {
  socket.emit('typing_start', { receiverId });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing_stop', { receiverId });
  }, 3000);
});
```

### Error Handling
```javascript
// Always handle errors
socket.on('error', (error) => {
  showNotification('Error: ' + error.message);
});

try {
  const response = await fetch('/messages', options);
  if (!response.ok) throw new Error(response.statusText);
  const data = await response.json();
} catch (error) {
  console.error('Failed to send message:', error);
}
```

### Security
```javascript
// Never log sensitive data
console.log('Token:', token.substring(0, 10) + '...');

// Always validate on server
// Don't trust client-side validation alone

// Use HTTPS in production
const url = process.env.NODE_ENV === 'production' 
  ? 'https://api.yourdomain.com' 
  : 'http://localhost:3000';
```

### Performance
```javascript
// Batch messages when possible
const messages = await Promise.all([
  fetchConversation(user1),
  fetchConversation(user2),
  fetchConversation(user3)
]);

// Use polling only when Socket.IO unavailable
if (!socket.connected) {
  setInterval(pollForMessages, 5000);
}
```

## 📚 Further Reading

- [Full Documentation](./README.md)
- [Socket.IO Messaging Guide](./SOCKETIO-MESSAGING-GUIDE.md)
- [HTTPS Configuration Guide](./HTTPS-CONFIGURATION-GUIDE.md)
- [What's New](./WHATS-NEW.md)
- [Changelog](./CHANGELOG.md)
- [API Contract](./API-CONTRACT.md)

## 🆘 Support

- GitHub Issues: https://github.com/nelliau/Test_api-proxmox/issues
- Socket.IO Docs: https://socket.io/docs/
- JWT Docs: https://jwt.io/

---

**Last Updated:** December 1, 2025
