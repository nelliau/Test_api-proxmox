#!/usr/bin/env node

/**
 * Test Script for Socket.IO Messaging Features
 * 
 * This script tests:
 * - Socket.IO authentication
 * - Real-time message sending
 * - Typing indicators
 * - Message delivery confirmations
 */

import io from 'socket.io-client';
import fetch from 'node-fetch';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TEST_EMAIL_1 = 'test1@example.com';
const TEST_EMAIL_2 = 'test2@example.com';
const TEST_PASSWORD = 'Password123';

console.log('🧪 Socket.IO Messaging Test Suite');
console.log('===================================\n');

let user1Token, user2Token;
let user1Id, user2Id;

// Helper function to register or login user
async function getAuthToken(email, password) {
  try {
    // Try to register
    const registerResponse = await fetch(`${SERVER_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (registerResponse.ok) {
      const data = await registerResponse.json();
      console.log(`✅ Registered user: ${email}`);
      return { token: data.token, userId: data.user.id };
    }
    
    // If registration fails (user exists), try login
    const loginResponse = await fetch(`${SERVER_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      console.log(`✅ Logged in user: ${email}`);
      return { token: data.token, userId: data.user.id };
    }
    
    throw new Error(`Failed to authenticate user: ${email}`);
  } catch (error) {
    console.error(`❌ Auth error for ${email}:`, error.message);
    throw error;
  }
}

// Test 1: Authentication
async function testAuthentication() {
  console.log('\n📝 Test 1: User Authentication');
  console.log('--------------------------------');
  
  try {
    const user1Auth = await getAuthToken(TEST_EMAIL_1, TEST_PASSWORD);
    user1Token = user1Auth.token;
    user1Id = user1Auth.userId;
    
    const user2Auth = await getAuthToken(TEST_EMAIL_2, TEST_PASSWORD);
    user2Token = user2Auth.token;
    user2Id = user2Auth.userId;
    
    console.log(`✅ User 1: ID=${user1Id}, Token=${user1Token.substring(0, 20)}...`);
    console.log(`✅ User 2: ID=${user2Id}, Token=${user2Token.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    return false;
  }
}

// Test 2: Socket.IO Connection and Authentication
function testSocketConnection() {
  return new Promise((resolve) => {
    console.log('\n🔌 Test 2: Socket.IO Connection');
    console.log('--------------------------------');
    
    const socket1 = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    const socket2 = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    
    let socket1Authenticated = false;
    let socket2Authenticated = false;
    
    socket1.on('connect', () => {
      console.log(`✅ Socket 1 connected: ${socket1.id}`);
      socket1.emit('authenticate', { token: user1Token });
    });
    
    socket2.on('connect', () => {
      console.log(`✅ Socket 2 connected: ${socket2.id}`);
      socket2.emit('authenticate', { token: user2Token });
    });
    
    socket1.on('authenticated', (data) => {
      console.log(`✅ Socket 1 authenticated: User ${data.userId}`);
      socket1Authenticated = true;
      checkBothAuthenticated();
    });
    
    socket2.on('authenticated', (data) => {
      console.log(`✅ Socket 2 authenticated: User ${data.userId}`);
      socket2Authenticated = true;
      checkBothAuthenticated();
    });
    
    socket1.on('error', (error) => {
      console.error('❌ Socket 1 error:', error);
      cleanup();
      resolve({ success: false, socket1, socket2 });
    });
    
    socket2.on('error', (error) => {
      console.error('❌ Socket 2 error:', error);
      cleanup();
      resolve({ success: false, socket1, socket2 });
    });
    
    function checkBothAuthenticated() {
      if (socket1Authenticated && socket2Authenticated) {
        console.log('✅ Both sockets authenticated successfully');
        resolve({ success: true, socket1, socket2 });
      }
    }
    
    function cleanup() {
      socket1.disconnect();
      socket2.disconnect();
    }
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!socket1Authenticated || !socket2Authenticated) {
        console.error('❌ Socket authentication timeout');
        cleanup();
        resolve({ success: false, socket1, socket2 });
      }
    }, 10000);
  });
}

// Test 3: Real-time Message Sending
function testMessageSending(socket1, socket2) {
  return new Promise((resolve) => {
    console.log('\n💬 Test 3: Real-time Message Sending');
    console.log('-------------------------------------');
    
    const tempId = `temp-${Date.now()}`;
    const testMessage = 'Hello from Socket.IO test!';
    
    let messageSent = false;
    let messageReceived = false;
    
    // Socket 2 listens for incoming message
    socket2.on('message', (message) => {
      console.log(`✅ Socket 2 received message:`, {
        id: message.id,
        senderId: message.senderId,
        content: message.content.substring(0, 30) + '...'
      });
      messageReceived = true;
      checkTestComplete();
    });
    
    // Socket 1 listens for send confirmation
    socket1.on('message_sent', (confirmation) => {
      console.log(`✅ Socket 1 received send confirmation:`, {
        tempId: confirmation.tempId,
        messageId: confirmation.messageId,
        receiverId: confirmation.receiverId
      });
      messageSent = true;
      checkTestComplete();
    });
    
    // Socket 1 sends message to Socket 2
    console.log(`📤 Socket 1 sending message to User ${user2Id}...`);
    socket1.emit('send_message', {
      receiverId: user2Id,
      content: testMessage,
      tempId: tempId
    });
    
    function checkTestComplete() {
      if (messageSent && messageReceived) {
        console.log('✅ Message sending test passed!');
        resolve(true);
      }
    }
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (!messageSent || !messageReceived) {
        console.error('❌ Message sending test failed (timeout)');
        console.error(`   - Message sent: ${messageSent}`);
        console.error(`   - Message received: ${messageReceived}`);
        resolve(false);
      }
    }, 5000);
  });
}

// Test 4: Typing Indicators
function testTypingIndicators(socket1, socket2) {
  return new Promise((resolve) => {
    console.log('\n⌨️  Test 4: Typing Indicators');
    console.log('-------------------------------------');
    
    let typingStartReceived = false;
    let typingStopReceived = false;
    
    // Socket 2 listens for typing events
    socket2.on('typing_start', (data) => {
      console.log(`✅ Socket 2 received typing_start from User ${data.senderId}`);
      typingStartReceived = true;
      checkTestComplete();
    });
    
    socket2.on('typing_stop', (data) => {
      console.log(`✅ Socket 2 received typing_stop from User ${data.senderId}`);
      typingStopReceived = true;
      checkTestComplete();
    });
    
    // Socket 1 sends typing events
    console.log(`📤 Socket 1 sending typing_start to User ${user2Id}...`);
    socket1.emit('typing_start', { receiverId: user2Id });
    
    setTimeout(() => {
      console.log(`📤 Socket 1 sending typing_stop to User ${user2Id}...`);
      socket1.emit('typing_stop', { receiverId: user2Id });
    }, 1000);
    
    function checkTestComplete() {
      if (typingStartReceived && typingStopReceived) {
        console.log('✅ Typing indicators test passed!');
        resolve(true);
      }
    }
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (!typingStartReceived || !typingStopReceived) {
        console.error('❌ Typing indicators test failed (timeout)');
        console.error(`   - typing_start received: ${typingStartReceived}`);
        console.error(`   - typing_stop received: ${typingStopReceived}`);
        resolve(false);
      }
    }, 5000);
  });
}

// Main test runner
async function runTests() {
  try {
    // Test 1: Authentication
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      console.error('\n❌ Authentication test failed. Aborting tests.');
      process.exit(1);
    }
    
    // Test 2: Socket Connection
    const socketResult = await testSocketConnection();
    if (!socketResult.success) {
      console.error('\n❌ Socket connection test failed. Aborting tests.');
      process.exit(1);
    }
    
    const { socket1, socket2 } = socketResult;
    
    // Test 3: Message Sending
    const messagingSuccess = await testMessageSending(socket1, socket2);
    
    // Test 4: Typing Indicators
    const typingSuccess = await testTypingIndicators(socket1, socket2);
    
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    socket1.disconnect();
    socket2.disconnect();
    
    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`✅ Authentication: PASSED`);
    console.log(`✅ Socket Connection: PASSED`);
    console.log(`${messagingSuccess ? '✅' : '❌'} Real-time Messaging: ${messagingSuccess ? 'PASSED' : 'FAILED'}`);
    console.log(`${typingSuccess ? '✅' : '❌'} Typing Indicators: ${typingSuccess ? 'PASSED' : 'FAILED'}`);
    
    const allPassed = messagingSuccess && typingSuccess;
    
    if (allPassed) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Check the output above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(SERVER_URL);
    if (response.ok) {
      console.log(`✅ Server is running at ${SERVER_URL}\n`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Server is not running at ${SERVER_URL}`);
    console.error('   Please start the server with: npm start');
    return false;
  }
}

// Start tests
(async () => {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await runTests();
})();
