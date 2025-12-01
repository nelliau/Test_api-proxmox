# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-12-01

### Added

#### HTTPS/SSL Support
- Added automatic HTTPS server creation when SSL certificates are provided
- Support for Let's Encrypt certificates
- Support for self-signed certificates (development)
- Support for commercial SSL certificates
- Optional CA bundle configuration
- Automatic fallback to HTTP when certificates not found
- Environment variables: `SSL_KEY_PATH`, `SSL_CERT_PATH`, `SSL_CA_PATH`

#### Socket.IO Real-Time Messaging
- Added `send_message` Socket.IO event for real-time message sending
- Added `message` Socket.IO event for receiving messages
- Added `message_sent` Socket.IO event for send confirmations
- Added `mark_delivered` Socket.IO event for delivery tracking
- Messages sent via REST API now also emit Socket.IO events to online users
- Offline message storage (messages saved even if recipient offline)

#### Typing Indicators
- Added `typing_start` Socket.IO event
- Added `typing_stop` Socket.IO event
- Real-time typing notifications between users

#### Message Tracking
- Added `tempId` parameter support for message tracking
- Clients can now track messages before database ID assignment
- `message_sent` event returns both `tempId` and `messageId`

#### Security Enhancements
- Added `NODE_ENV` environment variable for environment awareness
- Added `ALLOWED_ORIGINS` configuration for CORS control
- Added `TRUST_PROXY` configuration for reverse proxy support
- Enhanced rate limiting (5 attempts per 15 min on auth endpoints)
- Added timing attack prevention on password comparison
- Added input validation helpers (email, password)
- Added LIKE query escape function for SQL injection prevention
- Added GDPR-compliant email masking in logs

#### Documentation
- Added `SOCKETIO-MESSAGING-GUIDE.md` - Complete Socket.IO implementation guide
- Added `HTTPS-CONFIGURATION-GUIDE.md` - SSL/TLS setup guide
- Added `WHATS-NEW.md` - Summary of recent updates
- Added `CHANGELOG.md` - This file
- Updated `README.md` with new features and documentation links
- Updated `.env.example` with all new configuration variables

#### Testing
- Added `test-socketio-messaging.js` - Comprehensive test suite for new features
- Added npm script `test:messaging` for easy testing
- Tests cover authentication, Socket.IO connection, messaging, and typing indicators

#### Code Quality
- Added `asyncHandler` wrapper for better async/await error handling
- Added comprehensive JSDoc comments
- Added helper functions for validation and security
- Better structured logging throughout the codebase

### Changed

#### Server Configuration
- Enhanced HTTP server creation with HTTPS support
- Improved database connection pool configuration
- Better error handling and retry logic
- Connection timeout configuration added

#### REST API Enhancements
- POST `/messages` now accepts optional `tempId` parameter
- POST `/messages` now emits Socket.IO events to online users
- Enhanced input validation on all endpoints
- Better error messages and status codes

#### Socket.IO Improvements
- Better connection handling
- Enhanced error reporting
- Room-based notifications for user-specific events
- More efficient user tracking with Map

#### Error Handling
- Added global error handler middleware
- Better Sequelize error handling
- CORS errors handled gracefully
- Development vs production error messages

#### Security
- Password validation now requires:
  - Minimum 8 characters (was 6)
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- Email validation improved with regex
- All user inputs sanitized

#### Logging
- Structured logging with emojis for better readability
- Sensitive information (emails, passwords) masked in logs
- Connection status logging
- SSL configuration logging
- Better error messages

### Fixed
- JWT token expiration now properly handled with specific error message
- Socket.IO disconnection properly cleans up user tracking
- Database connection issues now properly logged
- CORS configuration now properly handles credentials

### Security
- All passwords hashed with bcrypt (13 rounds)
- JWT tokens expire after configurable time (default 7 days)
- Rate limiting prevents brute force attacks
- Helmet middleware sets security headers
- CORS restricts origins to configured list
- Input validation prevents injection attacks
- Timing attack prevention on authentication

## [1.0.0] - 2025-11-XX

### Initial Release

#### Features
- User registration and login with JWT authentication
- RESTful API for messaging
- Basic Socket.IO support for real-time notifications
- Friend system (send requests, accept/decline, list friends)
- MySQL database integration with Sequelize
- Symfony bcrypt password compatibility
- Message history retrieval
- User search functionality
- Public key storage for E2EE
- Polling endpoints for messages

#### API Endpoints
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user info
- `GET /messages` - Get conversation history
- `POST /messages` - Send a message
- `GET /users/search` - Search users by email
- `GET /users/:id` - Get user by ID
- `PUT /users/public-key` - Update public key
- `GET /users/:id/public-key` - Get user's public key
- `POST /friends/request` - Send friend request
- `GET /friends/requests` - Get pending friend requests
- `PUT /friends/request/:id` - Accept/decline friend request
- `GET /friends` - List all friends
- `DELETE /friends/:id` - Remove friend
- `GET /messages/new` - Get new messages (polling)
- `GET /messages/unread-count` - Get unread message counts

#### Socket.IO Events
- `authenticate` - Authenticate socket connection
- `friend_request` - Receive friend request notification
- `friend_request_response` - Receive friend request response

#### Security
- JWT-based authentication
- bcrypt password hashing
- Protected routes with middleware
- MySQL with prepared statements (Sequelize)

---

## Upgrade Guide

### From 1.x to 2.0

#### Environment Variables
Update your `.env` file with new variables:

```env
# New in 2.0
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
TRUST_PROXY=1  # If behind reverse proxy

# Optional: Enable HTTPS
SSL_KEY_PATH=/path/to/privkey.pem
SSL_CERT_PATH=/path/to/fullchain.pem
SSL_CA_PATH=/path/to/chain.pem
```

#### Client Code Updates

**Add tempId tracking:**
```javascript
// Old
fetch('/messages', {
  method: 'POST',
  body: JSON.stringify({
    receiverId: 2,
    content: 'Hello'
  })
});

// New (recommended)
fetch('/messages', {
  method: 'POST',
  body: JSON.stringify({
    receiverId: 2,
    content: 'Hello',
    tempId: `temp-${Date.now()}`  // Add this
  })
});
```

**Implement Socket.IO messaging:**
```javascript
// Add these event listeners
socket.on('message_sent', (confirmation) => {
  // Update local message with real ID
  updateMessageId(confirmation.tempId, confirmation.messageId);
});

socket.on('message', (message) => {
  // Display incoming message
  displayMessage(message);
});
```

**Add typing indicators:**
```javascript
// Start typing
socket.emit('typing_start', { receiverId: friendId });

// Stop typing
socket.emit('typing_stop', { receiverId: friendId });

// Listen for typing
socket.on('typing_start', (data) => {
  showTypingIndicator(data.senderId);
});

socket.on('typing_stop', (data) => {
  hideTypingIndicator(data.senderId);
});
```

#### Database
No database migrations required - all changes are backward compatible.

#### Testing
Run the new test suite to verify functionality:
```bash
npm run test:messaging
```

---

## Links
- [Documentation](./README.md)
- [Socket.IO Guide](./SOCKETIO-MESSAGING-GUIDE.md)
- [HTTPS Guide](./HTTPS-CONFIGURATION-GUIDE.md)
- [What's New](./WHATS-NEW.md)
- [GitHub Repository](https://github.com/nelliau/Test_api-proxmox)

---

**Note:** This project follows semantic versioning. Breaking changes will always increment the major version number.
