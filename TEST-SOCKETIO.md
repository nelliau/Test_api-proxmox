# 🧪 Guide de Test Socket.IO

Ce document explique comment tester le bon fonctionnement de Socket.IO sur votre serveur.

## 📋 Prérequis

1. Le serveur doit être démarré (`node server.js`)
2. La base de données doit être accessible
3. Les dépendances de test doivent être installées

## 🚀 Installation des Dépendances de Test

```bash
npm install socket.io-client node-fetch
```

## ✅ Lancer les Tests Automatiques

### Test Complet (Recommandé)

```bash
npm run test:socket
```

ou

```bash
node test-socketio.js
```

### Avec URL personnalisée

```bash
API_URL=http://192.168.1.100:3000 npm run test:socket
```

## 🧪 Ce que les Tests Vérifient

### TEST 1: Envoi de Message Direct (Les 2 Utilisateurs en Ligne)
- ✅ Création de 2 utilisateurs
- ✅ Connexion Socket.IO des 2 utilisateurs
- ✅ Authentification via token JWT
- ✅ Envoi de message en temps réel
- ✅ Réception immédiate (pas de stockage BDD)
- ✅ Confirmation de livraison directe

**Résultat attendu:** Le message est livré instantanément via Socket.IO, **SANS** passer par la base de données.

### TEST 2: Stockage Offline (Destinataire Hors Ligne)
- ✅ Un utilisateur envoie un message à un utilisateur offline
- ✅ Le message est stocké en BDD temporairement
- ✅ Quand le destinataire se connecte, il reçoit les messages en attente
- ✅ Les messages sont marqués comme "delivered"

**Résultat attendu:** Le message est stocké en BDD et livré dès que le destinataire se connecte.

### TEST 3: API REST + Socket.IO (Mode Hybride)
- ✅ Envoi de message via endpoint REST `/messages`
- ✅ Si destinataire en ligne → livraison via Socket.IO
- ✅ Si destinataire offline → stockage en BDD

**Résultat attendu:** L'API REST détecte si le destinataire est en ligne et livre directement via Socket.IO.

## 📊 Exemple de Sortie (Tests Réussis)

```
🧪 Test Socket.IO - Starting...

📡 API URL: http://localhost:3000

============================================================
🧪 TEST 1: Message Sending (Both Users Online)
============================================================

📝 Registering user: test_user_1_1234567890@test.com
✅ User registered: ID 1

📝 Registering user: test_user_2_1234567890@test.com
✅ User registered: ID 2

✅ Both users registered
   User 1: ID 1
   User 2: ID 2

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
   From: User 1 (test_user_1_1234567890@test.com)
   Content: "Hello from User1! This is a test message."
   Timestamp: 1234567890123

✅ [User1] Message delivery confirmed
   Delivered to: User 2
   Direct: true

✅ TEST 1 PASSED: Direct message delivery works!

============================================================
🧪 TEST 2: Offline Message Storage
============================================================

⚠️ User2 is OFFLINE (not connected)

📤 [User1] Sending message to OFFLINE User2...

💾 [User1] Message stored for offline delivery
   Message ID: 1
   To: User 2
   Offline: true

📬 [User2] Now connecting to receive pending messages...

🔌 [User2] Connecting to Socket.IO...
✅ [User2] Socket connected: ghi789
🔐 [User2] Authenticating...
✅ [User2] Authenticated: User ID 2

📨 [User2] Pending message received!
   From: User 1 (test_user_1_1234567890@test.com)
   Content: "This message should be stored offline!"
   From server: true

✅ TEST 2 PASSED: Offline storage and delivery works!

============================================================
🧪 TEST 3: REST API Message Sending
============================================================

📤 [User1] Sending message via REST API...

✅ API Response: {
  id: 0,
  senderId: 1,
  receiverId: 2,
  content: 'Message sent via REST API',
  createdAt: '2024-01-01T00:00:00.000Z',
  delivered: true
}

📨 [User2] Message received via REST API!
   From: User 1 (test_user_1_1234567890@test.com)
   Content: "Message sent via REST API"

✅ TEST 3 PASSED: REST API message sending works!

============================================================
✅ ALL TESTS COMPLETED
============================================================
```

## 🔍 Vérifications Côté Serveur

Pendant les tests, surveillez les logs du serveur (`node server.js`). Vous devriez voir:

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
```

## 🛠️ Test Manuel avec Navigateur

Vous pouvez aussi tester depuis le navigateur. Créez un fichier `test.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Socket.IO Test</title>
    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
</head>
<body>
    <h1>Socket.IO Test</h1>
    <div id="status">Disconnected</div>
    <input type="text" id="token" placeholder="JWT Token">
    <button onclick="connect()">Connect</button>
    <button onclick="sendMessage()">Send Test Message</button>
    
    <script>
        let socket;
        
        function connect() {
            const token = document.getElementById('token').value;
            socket = io('http://localhost:3000');
            
            socket.on('connect', () => {
                document.getElementById('status').textContent = 'Connected: ' + socket.id;
                socket.emit('authenticate', { token });
            });
            
            socket.on('authenticated', (data) => {
                console.log('Authenticated:', data);
                document.getElementById('status').textContent = 'Authenticated as User ' + data.userId;
            });
            
            socket.on('message', (data) => {
                console.log('Message received:', data);
                alert('Message: ' + data.content);
            });
            
            socket.on('error', (error) => {
                console.error('Error:', error);
            });
        }
        
        function sendMessage() {
            const receiverId = parseInt(prompt('Receiver ID:'));
            const content = prompt('Message:');
            
            socket.emit('send_message', {
                receiverId,
                content,
                tempId: 'manual-test-' + Date.now()
            });
        }
    </script>
</body>
</html>
```

## 🐛 Dépannage

### Erreur: "Connection refused"
- ✅ Vérifiez que le serveur est démarré
- ✅ Vérifiez l'URL (localhost vs IP)
- ✅ Vérifiez le port (3000 par défaut)

### Erreur: "Token invalide"
- ✅ Le token JWT doit être valide
- ✅ Vérifiez JWT_SECRET dans .env

### Messages non reçus
- ✅ Vérifiez que les 2 utilisateurs sont authentifiés
- ✅ Regardez les logs du serveur pour voir si le message est envoyé
- ✅ Vérifiez que le receiverId est correct

### Messages stockés alors qu'ils ne devraient pas
- ✅ Vérifiez que le destinataire est bien connecté ET authentifié
- ✅ Regardez la map `userSockets` dans les logs serveur

## 📝 Notes Importantes

1. **Les tests créent de vrais utilisateurs en BDD** - Ils ne sont pas supprimés automatiquement
2. **Chaque exécution crée de nouveaux utilisateurs** avec des emails horodatés
3. **Les messages de test sont stockés selon les règles normales** (24h si offline)
4. **Les tests utilisent le transport WebSocket** pour garantir une connexion temps réel

## ✨ Résultat Attendu

Si tous les tests passent, votre API Socket.IO fonctionne **PARFAITEMENT** et :

✅ Les messages sont livrés en temps réel quand les utilisateurs sont en ligne
✅ Les messages sont stockés en BDD uniquement si le destinataire est offline
✅ Les messages pending sont livrés à la reconnexion
✅ L'API REST peut aussi livrer via Socket.IO
✅ Le cleanup automatique fonctionne (24h)

🎉 **Votre système de messagerie fonctionne exactement comme vous le souhaitez !**
