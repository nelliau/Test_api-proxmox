# 🚀 Test Socket.IO - Guide Rapide

## 🎯 **OPTION 1 : Test sur votre machine VPN** ⭐ (Recommandé)

Depuis votre machine 10.6.0.6 connectée au VPN :

```bash
# 1. Pull la branche
git pull origin cursor/backend-chat-server-setup-with-authentication-1ef0

# 2. Créer .env (si pas déjà fait)
cat > .env << 'EOF'
PORT=3000
DB_HOST=10.6.0.5
DB_PORT=8080
DB_USER=root
DB_PASSWORD=test
DB_NAME=test
JWT_SECRET=test123
JWT_EXPIRES_IN=7d
EOF

# 3. Démarrer le serveur
npm start
# Laissez ce terminal ouvert

# 4. Dans un NOUVEAU terminal, lancer les tests
npm run test:socket
```

### Résultat attendu ✅

```
🧪 Test Socket.IO - Starting...
📡 API URL: http://localhost:3000

============================================================
🧪 TEST 1: Message Sending (Both Users Online)
============================================================

📝 Registering user: test_user_1_1731340000000@test.com
✅ User registered: ID 1

📝 Registering user: test_user_2_1731340000000@test.com
✅ User registered: ID 2

🔌 [User1] Connecting to Socket.IO...
✅ [User1] Socket connected: abc123
🔐 [User1] Authenticating...
✅ [User1] Authenticated: User ID 1

🔌 [User2] Connecting to Socket.IO...
✅ [User2] Socket connected: def456
🔐 [User2] Authenticating...
✅ [User2] Authenticated: User ID 2

✅ Both users connected and authenticated

📤 [User1] Sending message to User2...

📨 [User2] Message received!
   From: User 1 (test_user_1_1731340000000@test.com)
   Content: "Hello from User1! This is a test message."
   Timestamp: 1731340000123

✅ [User1] Message delivery confirmed
   Delivered to: User 2
   Direct: true

✅ TEST 1 PASSED: Direct message delivery works!

============================================================
🧪 TEST 2: Offline Message Storage
============================================================

⚠️ User2 is OFFLINE (not connected)

📤 [User1] Sending message to OFFLINE User2...

⚠️  Message not delivered - receiver offline

✅ TEST 2 PASSED: Messages are NOT stored (relay-only mode)

============================================================
✅ ALL TESTS COMPLETED
============================================================
```

---

## 🐳 **OPTION 2 : Test local avec Docker MySQL**

Si vous n'avez pas accès au VPN mais avez Docker :

```bash
# 1. Installer Docker (si nécessaire)
sudo apt-get update
sudo apt-get install docker.io docker-compose -y

# 2. Démarrer MySQL en local
docker run -d \
  --name mysql-test \
  -e MYSQL_ROOT_PASSWORD=test \
  -e MYSQL_DATABASE=test \
  -p 3306:3306 \
  mysql:8.0

# 3. Attendre que MySQL démarre (10-20 secondes)
sleep 15

# 4. Utiliser le fichier .env.test
cp .env.test .env

# 5. Démarrer le serveur
npm start

# 6. Dans un autre terminal
npm run test:socket
```

### Nettoyage après test

```bash
docker stop mysql-test
docker rm mysql-test
```

---

## 🧪 **OPTION 3 : Test simplifié (Direct delivery only)**

Test ultra-rapide qui vérifie juste la livraison directe Socket.IO :

```bash
# 1. Démarrer MySQL local (Docker ou VPN)

# 2. Démarrer le serveur
npm start

# 3. Test simplifié
node test-socketio-simple.js
```

Ce test vérifie :
- ✅ Connexion Socket.IO
- ✅ Authentification JWT
- ✅ Envoi de message
- ✅ Réception en temps réel
- ✅ Confirmation de livraison

---

## 🌐 **OPTION 4 : Test depuis le navigateur**

Créez un fichier `test.html` :

```html
<!DOCTYPE html>
<html>
<head>
    <title>Socket.IO Test</title>
    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
    <style>
        body { font-family: Arial; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        input, button { padding: 10px; margin: 5px 0; width: 100%; box-sizing: border-box; }
        button { background: #007bff; color: white; border: none; cursor: pointer; border-radius: 4px; }
        button:hover { background: #0056b3; }
        #log { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 20px; height: 300px; overflow-y: auto; font-family: monospace; font-size: 12px; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Socket.IO Test</h1>
        
        <h3>1. Register/Login</h3>
        <input type="email" id="email" placeholder="Email" value="test@example.com">
        <input type="password" id="password" placeholder="Password" value="password123">
        <button onclick="register()">Register</button>
        <button onclick="login()">Login</button>
        
        <h3>2. Connect Socket.IO</h3>
        <button onclick="connectSocket()">Connect</button>
        <button onclick="disconnect()">Disconnect</button>
        
        <h3>3. Send Message</h3>
        <input type="number" id="receiverId" placeholder="Receiver User ID">
        <input type="text" id="messageContent" placeholder="Message" value="Hello!">
        <button onclick="sendMessage()">Send Message</button>
        
        <h3>📋 Log</h3>
        <div id="log"></div>
    </div>

    <script>
        const API_URL = 'http://localhost:3000';
        let token = null;
        let userId = null;
        let socket = null;

        function log(message, type = 'info') {
            const logDiv = document.getElementById('log');
            const time = new Date().toLocaleTimeString();
            logDiv.innerHTML += `<div class="${type}">[${time}] ${message}</div>`;
            logDiv.scrollTop = logDiv.scrollHeight;
        }

        async function register() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            log(`📝 Registering: ${email}...`);
            
            try {
                const res = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    token = data.token;
                    userId = data.user.id;
                    log(`✅ Registered! User ID: ${userId}`, 'success');
                    log(`Token: ${token.substring(0, 20)}...`, 'info');
                } else {
                    log(`❌ Registration failed: ${data.message}`, 'error');
                }
            } catch (error) {
                log(`❌ Error: ${error.message}`, 'error');
            }
        }

        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            log(`🔐 Logging in: ${email}...`);
            
            try {
                const res = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    token = data.token;
                    userId = data.user.id;
                    log(`✅ Logged in! User ID: ${userId}`, 'success');
                } else {
                    log(`❌ Login failed: ${data.message}`, 'error');
                }
            } catch (error) {
                log(`❌ Error: ${error.message}`, 'error');
            }
        }

        function connectSocket() {
            if (!token) {
                log('❌ Please register or login first!', 'error');
                return;
            }
            
            log('🔌 Connecting to Socket.IO...');
            
            socket = io(API_URL);
            
            socket.on('connect', () => {
                log(`✅ Connected: ${socket.id}`, 'success');
                log('🔐 Authenticating...');
                socket.emit('authenticate', { token });
            });
            
            socket.on('authenticated', (data) => {
                log(`✅ Authenticated! User ID: ${data.userId}`, 'success');
            });
            
            socket.on('message', (data) => {
                log(`📨 MESSAGE RECEIVED!`, 'success');
                log(`   From: User ${data.senderId} (${data.senderEmail})`);
                log(`   Content: "${data.content}"`);
            });
            
            socket.on('message_delivered', (data) => {
                log(`✅ Message delivered to User ${data.receiverId}`, 'success');
                log(`   Direct: ${data.direct}`);
            });
            
            socket.on('message_not_delivered', (data) => {
                log(`⚠️ Message NOT delivered: ${data.reason}`, 'error');
            });
            
            socket.on('error', (error) => {
                log(`❌ Socket error: ${error.message}`, 'error');
            });
            
            socket.on('disconnect', (reason) => {
                log(`👋 Disconnected: ${reason}`, 'info');
            });
        }

        function disconnect() {
            if (socket) {
                socket.disconnect();
                log('👋 Disconnected', 'info');
            }
        }

        function sendMessage() {
            if (!socket || !socket.connected) {
                log('❌ Not connected! Click "Connect" first.', 'error');
                return;
            }
            
            const receiverId = parseInt(document.getElementById('receiverId').value);
            const content = document.getElementById('messageContent').value;
            
            if (!receiverId || !content) {
                log('❌ Please enter receiver ID and message', 'error');
                return;
            }
            
            log(`📤 Sending message to User ${receiverId}...`);
            
            socket.emit('send_message', {
                receiverId,
                content,
                tempId: `test-${Date.now()}`
            });
        }
    </script>
</body>
</html>
```

Ouvrez `test.html` dans votre navigateur et testez !

---

## 📊 Ce que vous devriez voir côté serveur

Pendant les tests, les logs du serveur montrent :

```
🔌 New socket connection: abc123

🔐 [authenticate] Socket abc123 attempting authentication...
   ✅ User 1 authenticated on socket abc123
   📊 User 1 now has 1 active connection(s)

📨 [send_message] Received from user 1
   → receiverId: 2, content: "Hello from User1!..."

🔍 Checking if user 2 is online...
   Current online users map: User 1: 1 socket(s), User 2: 1 socket(s)
   → User 2 has 1 socket(s) connected

📨 ✅ DIRECT DELIVERY from 1 to 2
   → Delivering to 1 device(s): [def456]
   ✓ Sent to socket def456
   ✅ Message delivered directly to 1 device(s) - NOT STORED IN DB

👋 [disconnect] Socket abc123 disconnected
   → User 1: 1 → 0 connection(s)
   ❌ User 1 is now OFFLINE
```

---

## 🐛 Dépannage

### Serveur ne démarre pas
```bash
# Vérifier que MySQL est accessible
telnet 10.6.0.5 8080
# ou pour Docker local:
docker ps | grep mysql
```

### Test échoue avec "Connection refused"
- ✅ Vérifiez que le serveur est démarré
- ✅ Vérifiez l'URL (localhost vs 10.6.0.6)
- ✅ Vérifiez que le port est correct

### Messages non reçus
- ✅ Les 2 utilisateurs doivent être authentifiés
- ✅ Regardez les logs du serveur
- ✅ Vérifiez que le receiverId est correct

---

## ✨ Résultat attendu final

Si tout fonctionne :

✅ **Connexion Socket.IO** établie  
✅ **Authentification JWT** réussie  
✅ **Messages en temps réel** livrés instantanément  
✅ **Confirmation de livraison** reçue  
✅ **Mode relay-only** : pas de stockage BDD  

🎉 **Votre système de messagerie Socket.IO fonctionne parfaitement !**
