# 🧪 Instructions : Tester Socket.IO sur API-EFRIE

## ⚠️ Important
Cet environnement Cursor cloud **ne peut pas** accéder à votre réseau privé `192.168.x.x`.  
**Les tests doivent être lancés depuis votre machine `root@API-EFRIE`.**

---

## 🚀 Étape 1 : Récupérer le code sur API-EFRIE

Depuis votre terminal SSH sur `root@API-EFRIE` :

```bash
# Aller dans le répertoire du projet
cd ~/Test_api-proxmox

# Pull la dernière version
git pull origin cursor/backend-chat-server-setup-with-authentication-1ef0

# Vérifier que le fichier .env existe
ls -la .env
```

✅ Le fichier `.env` devrait déjà exister avec vos vraies données.  
✅ Il ne sera **jamais** poussé sur GitHub (protégé par `.gitignore`).

---

## 🧪 Étape 2 : Lancer le script de test automatique

### Option A : Script interactif (Recommandé) ⭐

```bash
./LANCER-TESTS-SOCKETIO.sh
```

Ce script vous propose :
1. **Test complet** - Inscription, messages online/offline
2. **Test simple** - Livraison directe uniquement
3. **Test manuel** - Ouvre le HTML dans le navigateur
4. **Voir les logs** - Surveillance en temps réel
5. **Arrêter le serveur**

### Option B : Tests manuels

```bash
# Terminal 1 : Démarrer le serveur
npm start

# Terminal 2 : Lancer les tests
API_URL="http://localhost:30443" npm run test:socket

# Ou le test simplifié
API_URL="http://localhost:30443" npm run test:socket:simple
```

---

## 🌐 Étape 3 : Test dans le navigateur

### Sur la même machine (API-EFRIE)

1. Ouvrez le fichier `test-socketio.html`
2. Modifiez l'URL dans le fichier :

```javascript
const API_URL = 'http://localhost:30443';
```

3. Ouvrez le fichier dans Firefox/Chrome

### Depuis un autre appareil (téléphone, PC)

1. Trouvez l'IP de API-EFRIE :
```bash
hostname -I
# Exemple : 192.168.105.10
```

2. Modifiez `test-socketio.html` :
```javascript
const API_URL = 'http://192.168.105.10:30443';
```

3. Copiez le fichier HTML sur l'autre appareil et ouvrez-le

---

## 📊 Résultats attendus

### ✅ Test réussi

```
🧪 Test Socket.IO - Starting...
📡 API URL: http://localhost:30443

============================================================
🧪 TEST 1: Message Sending (Both Users Online)
============================================================

📝 Registering user: test_user_1_1731340000000@test.com
✅ User registered: ID 123

📝 Registering user: test_user_2_1731340000000@test.com
✅ User registered: ID 124

🔌 [User1] Connecting to Socket.IO...
✅ [User1] Socket connected: abc123def456
🔐 [User1] Authenticating...
✅ [User1] Authenticated: User ID 123

🔌 [User2] Connecting to Socket.IO...
✅ [User2] Socket connected: ghi789jkl012
🔐 [User2] Authenticating...
✅ [User2] Authenticated: User ID 124

✅ Both users connected and authenticated

📤 [User1] Sending message to User2...

📨 [User2] Message received!
   From: User 123 (test_user_1_1731340000000@test.com)
   Content: "Hello from User1! This is a test message."
   Timestamp: 1731340000123

✅ [User1] Message delivery confirmed
   Delivered to: User 124
   Direct: true

✅ TEST 1 PASSED: Direct message delivery works!

============================================================
✅ ALL TESTS COMPLETED
============================================================
```

### Logs côté serveur

Vous devriez voir dans les logs :

```
✅ Database connected

🚀 Server listening on port 30443
📡 Socket.IO ready for RELAY-ONLY message delivery
⚠️  Messages are NEVER stored in DB - Socket.IO relay only
🔐 JWT authentication enabled

🔌 New socket connection: abc123def456

🔐 [authenticate] Socket abc123def456 attempting authentication...
   ✅ User 123 authenticated on socket abc123def456
   📊 User 123 now has 1 active connection(s)

📨 [send_message] Received from user 123
   → receiverId: 124, content: "Hello from User1!..."

🔍 Checking if user 124 is online...
   → User 124 has 1 socket(s) connected

📨 ✅ DIRECT DELIVERY from 123 to 124
   → Delivering to 1 device(s): [ghi789jkl012]
   ✓ Sent to socket ghi789jkl012
   ✅ Message delivered directly to 1 device(s) - NOT STORED IN DB
```

---

## 🔍 Vérifications

### 1. Serveur démarre correctement ?

```bash
# Voir les logs en temps réel
tail -f server.log

# Vérifier que le port est en écoute
lsof -i :30443

# Tester l'endpoint
curl http://localhost:30443/
# Attendu : {"status":"ok","message":"Realtime Messaging API with Direct Delivery"}
```

### 2. Base de données accessible ?

```bash
# Test de connexion
mysql -h 192.168.105.3 -P 3306 -u API -p'G7!k9#vR2qX$u8LmZ4tPf3Y' Dashkey_test

# Lister les tables
mysql> SHOW TABLES;
# Doit afficher : user, message, friends
```

### 3. Socket.IO fonctionne ?

```bash
# Test avec wscat (installer si nécessaire : npm install -g wscat)
wscat -c ws://localhost:30443
```

---

## 🐛 Dépannage

### Erreur : Port 30443 déjà utilisé

```bash
# Trouver le processus
lsof -i :30443

# Arrêter le serveur existant
pkill -f "node server.js"

# Ou tuer le PID spécifique
kill -9 <PID>
```

### Erreur : Cannot connect to MySQL

```bash
# Vérifier que MySQL est accessible
telnet 192.168.105.3 3306

# Vérifier les credentials dans .env
cat .env
```

### Erreur : Module not found

```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### Tests échouent : "Connection refused"

- Vérifiez que le serveur est bien démarré
- Vérifiez l'URL : `http://localhost:30443`
- Vérifiez les logs : `tail -f server.log`

---

## 📱 Test avec l'application Android

Une fois que Socket.IO fonctionne sur le serveur, vous pouvez configurer votre app Android :

```kotlin
// Constants.kt
object ApiConfig {
    const val BASE_URL = "http://192.168.105.10:30443/"  // IP de API-EFRIE
    const val SOCKET_URL = "http://192.168.105.10:30443"
}
```

⚠️ **Important :** Votre téléphone Android doit être sur le même réseau que API-EFRIE !

---

## 📋 Checklist complète

Avant de tester, vérifiez :

- [ ] Je suis connecté SSH sur `root@API-EFRIE`
- [ ] Le fichier `.env` existe avec les bonnes données
- [ ] MySQL est accessible : `telnet 192.168.105.3 3306`
- [ ] Les dépendances npm sont installées : `npm install`
- [ ] Le port 30443 est libre : `lsof -i :30443`
- [ ] Git a bien pull les derniers changements

Pour lancer les tests :

- [ ] Terminal 1 : `npm start` (serveur)
- [ ] Terminal 2 : `./LANCER-TESTS-SOCKETIO.sh` (tests)

---

## 🎯 Ce que les tests vérifient

### ✅ Test 1 : Livraison directe (les 2 en ligne)
- Création de 2 utilisateurs
- Connexion Socket.IO
- Authentification JWT
- Envoi de message
- Réception instantanée
- Confirmation de livraison

### ✅ Test 2 : Utilisateur hors ligne
- Message envoyé à un utilisateur offline
- **AUCUN stockage en BDD** (mode relay-only)
- Notification `message_not_delivered` reçue

---

## 🎉 Résultat final attendu

Si tout fonctionne correctement :

✅ Le serveur démarre sur le port **30443**  
✅ La connexion MySQL réussit vers **192.168.105.3:3306**  
✅ Socket.IO accepte les connexions  
✅ L'authentification JWT fonctionne  
✅ Les messages sont livrés en temps réel (sans stockage BDD)  
✅ Les confirmations de livraison sont reçues  

**Votre système de messagerie Socket.IO est opérationnel ! 🚀**

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs : `tail -f server.log`
2. Vérifiez git status : `git status`
3. Vérifiez le .env : `cat .env`
4. Testez la BDD : `mysql -h 192.168.105.3 ...`

Le fichier `.env` ne sera **JAMAIS** poussé sur GitHub grâce au `.gitignore`.
