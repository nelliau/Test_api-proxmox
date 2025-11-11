import { io } from 'socket.io-client';
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3000';

console.log('🧪 Test Socket.IO - Starting...\n');
console.log(`📡 API URL: ${API_URL}\n`);

// Test configuration
const TEST_USER_1 = {
  email: `test_user_1_${Date.now()}@test.com`,
  password: 'password123'
};

const TEST_USER_2 = {
  email: `test_user_2_${Date.now()}@test.com`,
  password: 'password123'
};

let user1Token = null;
let user1Id = null;
let user2Token = null;
let user2Id = null;

// Register and login users
async function registerAndLogin(user) {
  console.log(`📝 Registering user: ${user.email}`);
  
  const registerRes = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });

  const data = await registerRes.json();
  
  if (registerRes.ok) {
    console.log(`✅ User registered: ID ${data.user.id}`);
    return { token: data.token, userId: data.user.id };
  } else {
    throw new Error(`Registration failed: ${data.message}`);
  }
}

// Test Socket.IO connection
function testSocketConnection(token, userId, userName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔌 [${userName}] Connecting to Socket.IO...`);
    
    const socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: false
    });

    socket.on('connect', () => {
      console.log(`✅ [${userName}] Socket connected: ${socket.id}`);
      
      // Authenticate
      console.log(`🔐 [${userName}] Authenticating...`);
      socket.emit('authenticate', { token });
    });

    socket.on('authenticated', (data) => {
      console.log(`✅ [${userName}] Authenticated: User ID ${data.userId}`);
      resolve(socket);
    });

    socket.on('error', (error) => {
      console.error(`❌ [${userName}] Socket error:`, error);
      reject(error);
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ [${userName}] Connection error:`, error.message);
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      console.log(`👋 [${userName}] Disconnected: ${reason}`);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 10000);
  });
}

// Test message sending
async function testMessageSending() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 1: Message Sending (Both Users Online)');
  console.log('='.repeat(60) + '\n');

  // Register users
  const user1Data = await registerAndLogin(TEST_USER_1);
  user1Token = user1Data.token;
  user1Id = user1Data.userId;

  const user2Data = await registerAndLogin(TEST_USER_2);
  user2Token = user2Data.token;
  user2Id = user2Data.userId;

  console.log(`\n✅ Both users registered`);
  console.log(`   User 1: ID ${user1Id}`);
  console.log(`   User 2: ID ${user2Id}`);

  // Connect both users
  const socket1 = await testSocketConnection(user1Token, user1Id, 'User1');
  const socket2 = await testSocketConnection(user2Token, user2Id, 'User2');

  console.log('\n✅ Both users connected and authenticated\n');

  // Set up message listeners
  let messagesReceived = 0;

  socket2.on('message', (data) => {
    console.log(`\n📨 [User2] Message received!`);
    console.log(`   From: User ${data.senderId} (${data.senderEmail})`);
    console.log(`   Content: "${data.content}"`);
    console.log(`   Timestamp: ${data.timestamp}`);
    messagesReceived++;
  });

  socket1.on('message_delivered', (data) => {
    console.log(`\n✅ [User1] Message delivery confirmed`);
    console.log(`   Delivered to: User ${data.receiverId}`);
    console.log(`   Direct: ${data.direct}`);
  });

  // Send message from User1 to User2
  console.log(`\n📤 [User1] Sending message to User2...`);
  socket1.emit('send_message', {
    receiverId: user2Id,
    content: 'Hello from User1! This is a test message.',
    tempId: 'test-msg-1'
  });

  // Wait for message to be delivered
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (messagesReceived > 0) {
    console.log('\n✅ TEST 1 PASSED: Direct message delivery works!\n');
  } else {
    console.log('\n❌ TEST 1 FAILED: Message was not received\n');
  }

  // Cleanup
  socket1.disconnect();
  socket2.disconnect();
}

// Test offline message storage
async function testOfflineStorage() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 2: Offline Message Storage');
  console.log('='.repeat(60) + '\n');

  console.log('📝 Using existing users from TEST 1\n');

  // Only connect User1 (User2 is offline)
  const socket1 = await testSocketConnection(user1Token, user1Id, 'User1');

  console.log(`\n⚠️ User2 is OFFLINE (not connected)\n`);

  socket1.on('message_stored', (data) => {
    console.log(`\n💾 [User1] Message stored for offline delivery`);
    console.log(`   Message ID: ${data.messageId}`);
    console.log(`   To: User ${data.receiverId}`);
    console.log(`   Offline: ${data.offline}`);
  });

  // Send message from User1 to offline User2
  console.log(`📤 [User1] Sending message to OFFLINE User2...`);
  socket1.emit('send_message', {
    receiverId: user2Id,
    content: 'This message should be stored offline!',
    tempId: 'test-msg-2'
  });

  // Wait for storage confirmation
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n📬 [User2] Now connecting to receive pending messages...\n');

  // Connect User2 to receive pending messages
  const socket2 = await testSocketConnection(user2Token, user2Id, 'User2');

  let pendingMessagesReceived = 0;

  socket2.on('message', (data) => {
    console.log(`\n📨 [User2] Pending message received!`);
    console.log(`   From: User ${data.senderId} (${data.senderEmail})`);
    console.log(`   Content: "${data.content}"`);
    console.log(`   From server: ${data.fromServer}`);
    pendingMessagesReceived++;
  });

  // Wait for pending messages
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (pendingMessagesReceived > 0) {
    console.log('\n✅ TEST 2 PASSED: Offline storage and delivery works!\n');
  } else {
    console.log('\n❌ TEST 2 FAILED: Pending messages were not delivered\n');
  }

  // Cleanup
  socket1.disconnect();
  socket2.disconnect();
}

// Test REST API message endpoint
async function testRestAPIMessage() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 3: REST API Message Sending');
  console.log('='.repeat(60) + '\n');

  // Connect User2 to receive
  const socket2 = await testSocketConnection(user2Token, user2Id, 'User2');

  let messageReceived = false;

  socket2.on('message', (data) => {
    console.log(`\n📨 [User2] Message received via REST API!`);
    console.log(`   From: User ${data.senderId} (${data.senderEmail})`);
    console.log(`   Content: "${data.content}"`);
    messageReceived = true;
  });

  // Send message via REST API
  console.log(`📤 [User1] Sending message via REST API...`);
  
  const response = await fetch(`${API_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user1Token}`
    },
    body: JSON.stringify({
      receiverId: user2Id,
      content: 'Message sent via REST API'
    })
  });

  const result = await response.json();
  console.log(`\n✅ API Response:`, result);

  // Wait for message delivery
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (messageReceived) {
    console.log('\n✅ TEST 3 PASSED: REST API message sending works!\n');
  } else {
    console.log('\n❌ TEST 3 FAILED: Message was not received via Socket.IO\n');
  }

  // Cleanup
  socket2.disconnect();
}

// Run all tests
async function runTests() {
  try {
    await testMessageSending();
    await testOfflineStorage();
    await testRestAPIMessage();

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runTests();
