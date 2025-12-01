# Socket.IO Messaging Guide

This guide explains how to use the Socket.IO real-time messaging features in the Realtime Messaging API.

## Overview

The server now supports both REST API endpoints and Socket.IO for messaging. Socket.IO provides:
- Real-time message delivery
- Typing indicators
- Message delivery confirmations
- Instant notifications

## Connection and Authentication

### 1. Connect to Socket.IO

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  autoConnect: true
});
```

### 2. Authenticate

After connecting, you must authenticate with your JWT token:

```javascript
socket.emit('authenticate', {
  token: 'your-jwt-token-here'
});

socket.on('authenticated', (data) => {
  console.log('Authenticated!', data);
  // { userId: 1, message: 'Authentification réussie' }
});

socket.on('error', (error) => {
  console.error('Authentication failed:', error);
});
```

## Sending Messages

### Via Socket.IO

```javascript
socket.emit('send_message', {
  receiverId: 2,           // User ID of the recipient
  content: 'Hello!',       // Message content (can be encrypted)
  tempId: 'temp-123'       // Optional: temporary ID for tracking
});
```

### Receiving Message Confirmation

```javascript
socket.on('message_sent', (data) => {
  console.log('Message sent successfully!', data);
  // {
  //   tempId: 'temp-123',
  //   receiverId: 2,
  //   timestamp: 1638360000000,
  //   messageId: 42
  // }
});
```

### Receiving Messages

```javascript
socket.on('message', (data) => {
  console.log('New message received!', data);
  // {
  //   id: 42,
  //   senderId: 2,
  //   senderEmail: 'sender@example.com',
  //   content: 'Hello!',
  //   timestamp: 1638360000000
  // }
});
```

## Typing Indicators

### Start Typing

```javascript
socket.emit('typing_start', {
  receiverId: 2  // User ID who should see the typing indicator
});
```

### Stop Typing

```javascript
socket.emit('typing_stop', {
  receiverId: 2  // User ID who should stop seeing the typing indicator
});
```

### Receiving Typing Events

```javascript
socket.on('typing_start', (data) => {
  console.log(`User ${data.senderId} is typing...`);
});

socket.on('typing_stop', (data) => {
  console.log(`User ${data.senderId} stopped typing`);
});
```

## Message Delivery Status

### Mark Message as Delivered

```javascript
socket.on('message', (message) => {
  // Mark the message as delivered
  socket.emit('mark_delivered', {
    messageId: message.id
  });
});
```

## Complete Example

```javascript
import io from 'socket.io-client';

class MessagingClient {
  constructor(serverUrl, token) {
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });
    
    this.token = token;
    this.setupListeners();
    this.authenticate();
  }
  
  setupListeners() {
    this.socket.on('authenticated', (data) => {
      console.log('✅ Authenticated:', data);
    });
    
    this.socket.on('message', (message) => {
      console.log('📨 New message:', message);
      this.handleNewMessage(message);
    });
    
    this.socket.on('message_sent', (confirmation) => {
      console.log('✓ Message sent:', confirmation);
      this.handleMessageSent(confirmation);
    });
    
    this.socket.on('typing_start', (data) => {
      console.log('✏️ User typing:', data.senderId);
      this.showTypingIndicator(data.senderId);
    });
    
    this.socket.on('typing_stop', (data) => {
      console.log('🛑 User stopped typing:', data.senderId);
      this.hideTypingIndicator(data.senderId);
    });
    
    this.socket.on('error', (error) => {
      console.error('❌ Error:', error);
    });
  }
  
  authenticate() {
    this.socket.emit('authenticate', {
      token: this.token
    });
  }
  
  sendMessage(receiverId, content, tempId = null) {
    this.socket.emit('send_message', {
      receiverId,
      content,
      tempId: tempId || `temp-${Date.now()}`
    });
  }
  
  startTyping(receiverId) {
    this.socket.emit('typing_start', { receiverId });
  }
  
  stopTyping(receiverId) {
    this.socket.emit('typing_stop', { receiverId });
  }
  
  handleNewMessage(message) {
    // Display message in UI
    // Mark as delivered
    this.socket.emit('mark_delivered', {
      messageId: message.id
    });
  }
  
  handleMessageSent(confirmation) {
    // Update UI to show message was sent
    // Match tempId to local message and update with real messageId
  }
  
  showTypingIndicator(userId) {
    // Show "User is typing..." in UI
  }
  
  hideTypingIndicator(userId) {
    // Hide "User is typing..." from UI
  }
}

// Usage
const client = new MessagingClient('http://localhost:3000', 'your-jwt-token');

// Send a message
client.sendMessage(2, 'Hello from Socket.IO!', 'temp-123');

// Start typing
client.startTyping(2);

// Stop typing after 3 seconds
setTimeout(() => {
  client.stopTyping(2);
}, 3000);
```

## REST API Alternative

If you prefer using REST API for messages (recommended for mobile apps with limited connection):

### Send Message via POST

```javascript
fetch('http://localhost:3000/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    receiverId: 2,
    content: 'Hello!',
    tempId: 'temp-123'
  })
});
```

The server will still emit Socket.IO events to online users, but you can send via REST and poll for new messages if needed.

## Best Practices

1. **Authentication**: Always authenticate immediately after connecting
2. **Temporary IDs**: Use `tempId` to track messages before they get a real ID from the server
3. **Error Handling**: Always listen for the `error` event
4. **Typing Indicators**: Debounce typing events (don't send on every keystroke)
5. **Reconnection**: Handle Socket.IO reconnection events in production
6. **Offline Messages**: Use the REST API `/messages/new` endpoint to fetch messages missed while offline

## Troubleshooting

### Socket won't connect
- Check the server URL and port
- Verify CORS settings match your client origin
- Check if the server is running

### Authentication fails
- Verify the JWT token is valid and not expired
- Check if the token includes the 'Bearer ' prefix in REST calls but not in Socket.IO auth

### Messages not received in real-time
- Ensure you've authenticated the socket
- Check if the receiver is online (`connectedUsers` map on server)
- Verify the socket connection is stable

### Typing indicators not working
- Make sure both users are authenticated on Socket.IO
- Verify `receiverId` is a number, not a string
- Check if the receiver is online

## Security Notes

- JWT tokens are verified on both REST and Socket.IO
- Messages are stored in the database regardless of online status
- Content can be encrypted end-to-end (server just stores it)
- Rate limiting applies to REST endpoints, not Socket.IO events (consider adding custom rate limiting for Socket.IO in production)
