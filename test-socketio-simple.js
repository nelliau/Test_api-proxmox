/**
 * Test Socket.IO Simple - Sans stockage BDD
 * Ce test vérifie uniquement la livraison directe des messages
 */

import { io } from 'socket.io-client';
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3000';

console.log('🧪 Test Socket.IO Simple - Direct Delivery Only\n');
console.log(`📡 API URL: ${API_URL}\n`);

// Test users
const USER1 = {
  email: `user1_${Date.now()}@test.com`,
  password: 'password123'
};

const USER2 = {
  email: `user2_${Date.now()}@test.com`,
  password: 'password123'
};

let token1, userId1, token2, userId2;

// Register and login
async function registerUser(user) {
  console.log(`📝 Registering: ${user.email}`);
  
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Registration failed: ${error}`);
  }

  const data = await res.json();
  console.log(`✅ Registered: User ID ${data.user.id}\n`);
  return data;
}

// Connect to Socket.IO
function connectSocket(token, userName) {
  return new Promise((resolve, reject) => {
    console.log(`🔌 [${userName}] Connecting...`);
    
    const socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: false
    });

    socket.on('connect', () => {
      console.log(`✅ [${userName}] Connected: ${socket.id}`);
      socket.emit('authenticate', { token });
    });

    socket.on('authenticated', (data) => {
      console.log(`✅ [${userName}] Authenticated (User ${data.userId})\n`);
      resolve(socket);
    });

    socket.on('error', (error) => {
      console.error(`❌ [${userName}] Error:`, error);
      reject(error);
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ [${userName}] Connection error:`, error.message);
      reject(error);
    });

    setTimeout(() => reject(new Error('Timeout')), 10000);
  });
}

// Main test
async function runTest() {
  try {
    console.log('═'.repeat(70));
    console.log('🧪 TEST: Direct Message Delivery (Both Users Online)');
    console.log('═'.repeat(70) + '\n');

    // 1. Register users
    const data1 = await registerUser(USER1);
    token1 = data1.token;
    userId1 = data1.user.id;

    const data2 = await registerUser(USER2);
    token2 = data2.token;
    userId2 = data2.user.id;

    // 2. Connect both
    const socket1 = await connectSocket(token1, 'User1');
    const socket2 = await connectSocket(token2, 'User2');

    console.log('✅ Both users online\n');

    // 3. Setup listeners
    let messageReceived = false;
    let deliveryConfirmed = false;

    socket2.on('message', (data) => {
      console.log(`\n📨 [User2] MESSAGE RECEIVED!`);
      console.log(`   From: User ${data.senderId} (${data.senderEmail})`);
      console.log(`   Content: "${data.content}"`);
      console.log(`   Timestamp: ${new Date(data.timestamp).toISOString()}`);
      messageReceived = true;
    });

    socket1.on('message_delivered', (data) => {
      console.log(`\n✅ [User1] DELIVERY CONFIRMED`);
      console.log(`   To User: ${data.receiverId}`);
      console.log(`   Direct: ${data.direct}`);
      console.log(`   Timestamp: ${new Date(data.timestamp).toISOString()}`);
      deliveryConfirmed = true;
    });

    socket1.on('message_not_delivered', (data) => {
      console.log(`\n❌ [User1] MESSAGE NOT DELIVERED`);
      console.log(`   Reason: ${data.reason}`);
    });

    // 4. Send message
    console.log('📤 [User1] Sending message to User2...\n');
    socket1.emit('send_message', {
      receiverId: userId2,
      content: 'Hello! This is a test message via Socket.IO 🚀',
      tempId: `test-${Date.now()}`
    });

    // 5. Wait for delivery
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Results
    console.log('\n' + '═'.repeat(70));
    console.log('📊 TEST RESULTS');
    console.log('═'.repeat(70));
    console.log(`✅ Message received by User2: ${messageReceived ? '✓ YES' : '✗ NO'}`);
    console.log(`✅ Delivery confirmed to User1: ${deliveryConfirmed ? '✓ YES' : '✗ NO'}`);
    console.log('═'.repeat(70) + '\n');

    if (messageReceived && deliveryConfirmed) {
      console.log('🎉 TEST PASSED: Socket.IO direct delivery works perfectly!\n');
      socket1.disconnect();
      socket2.disconnect();
      process.exit(0);
    } else {
      console.log('❌ TEST FAILED: Something went wrong\n');
      socket1.disconnect();
      socket2.disconnect();
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Test offline scenario
async function testOffline() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST 2: Message to Offline User');
    console.log('═'.repeat(70) + '\n');

    console.log('📝 Using existing users\n');

    // Only User1 connects
    const socket1 = await connectSocket(token1, 'User1');
    
    console.log('⚠️  User2 is OFFLINE\n');

    let notDelivered = false;

    socket1.on('message_not_delivered', (data) => {
      console.log(`\n⚠️  [User1] MESSAGE NOT DELIVERED (Expected)`);
      console.log(`   Reason: ${data.reason}`);
      console.log(`   Note: Server does NOT store messages in DB\n`);
      notDelivered = true;
    });

    socket1.on('message_delivered', () => {
      console.log(`\n❌ ERROR: Message should NOT be delivered!\n`);
    });

    // Send to offline user
    console.log('📤 [User1] Sending to OFFLINE User2...\n');
    socket1.emit('send_message', {
      receiverId: userId2,
      content: 'This message goes to offline user',
      tempId: `test-offline-${Date.now()}`
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('═'.repeat(70));
    console.log(`Result: ${notDelivered ? '✅ CORRECT - Message not delivered' : '❌ ERROR'}`);
    console.log('═'.repeat(70) + '\n');

    socket1.disconnect();
    
    if (notDelivered) {
      console.log('✅ TEST 2 PASSED: Offline handling works correctly\n');
    }

  } catch (error) {
    console.error('\n❌ TEST 2 ERROR:', error.message);
  }
}

// Run both tests
(async () => {
  await runTest();
  // Uncomment to test offline scenario
  // await testOffline();
})();
