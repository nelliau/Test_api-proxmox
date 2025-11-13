# 🧪 Guide de Test - server-secured.js

**Objectif:** Tester tous les endpoints et vérifier les corrections de sécurité.

---

## 🚀 Préparation

### 1. Installer les dépendances

```bash
npm install helmet express-rate-limit compression
```

### 2. Configurer .env

```bash
# Générer JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Créer .env
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=messaging_db
JWT_SECRET=PASTE_YOUR_GENERATED_SECRET_HERE
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000
TRUST_PROXY=0
EOF
```

### 3. Démarrer le serveur

```bash
# Backup de l'ancien
cp server.js server.js.backup

# Copier le nouveau
cp server-secured.js server.js

# Démarrer
npm start
```

**Attendu:**
```
🔧 Configuration:
   - Environment: development
   - Port: 3000
   - Allowed Origins: http://localhost:3000
   - JWT Secret: ******** (128 chars)
✅ Database connected
✅ Database models synced

════════════════════════════════════════════════════════
✅ Server running on port 3000
📡 Socket.IO ready for real-time notifications
💬 Messages via REST API (polling recommended)
🔐 JWT authentication enabled
🛡️  Security: Helmet + Rate Limiting + CORS
⚡ Optimization: Compression + Connection Pool
════════════════════════════════════════════════════════
```

---

## ✅ TESTS DE SÉCURITÉ

### Test 1: JWT_SECRET obligatoire

```bash
# Supprimer JWT_SECRET de .env temporairement
# Redémarrer le serveur

# Attendu:
# ❌ ERREUR CRITIQUE: JWT_SECRET doit être défini et faire au moins 32 caractères
# 💡 Générez-en un avec: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Le serveur doit crasher (exit code 1)
```

✅ **PASS** si le serveur refuse de démarrer

---

### Test 2: Rate Limiting - Auth

```bash
# Tentative 1
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@test.com","password":"wrong"}'

# Répéter 5 fois...

# Tentative 6 (doit être bloquée)
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@test.com","password":"wrong"}'
```

**Attendu (tentative 6):**
```json
{
  "error": "too_many_requests",
  "message": "Trop de tentatives de connexion, réessayez dans 15 minutes",
  "retryAfter": 899
}
```

✅ **PASS** si bloqué après 5 tentatives

---

### Test 3: CORS - Origine non autorisée

```bash
# Tester avec une origine non autorisée
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -H "Origin: http://evil-site.com" \
  -d '{"email":"test@test.com","password":"Test1234"}'
```

**Attendu:**
```json
{
  "error": "cors_error",
  "message": "Origine non autorisée"
}
```

**Dans les logs du serveur:**
```
⚠️  CORS blocked origin: http://evil-site.com
```

✅ **PASS** si bloqué

---

### Test 4: Validation d'email

```bash
# Email invalide
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"Test1234"}'
```

**Attendu:**
```json
{
  "error": "bad_request",
  "message": "Email invalide"
}
```

✅ **PASS** si rejeté

---

### Test 5: Validation de mot de passe

```bash
# Trop court
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1"}'

# Attendu: "Le mot de passe doit contenir au moins 8 caractères"

# Sans majuscule
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'

# Attendu: "Le mot de passe doit contenir au moins une majuscule"

# Sans chiffre
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestTest"}'

# Attendu: "Le mot de passe doit contenir au moins un chiffre"
```

✅ **PASS** si tous rejetés avec le bon message

---

### Test 6: Protection contre injection SQL (LIKE)

```bash
# D'abord créer un token valide (voir Test 7)
TOKEN="your_token_here"

# Essayer d'injecter des wildcards
curl -X GET "http://localhost:3000/users/search?q=%25" \
  -H "Authorization: Bearer $TOKEN"
```

**Attendu:**
- Ne doit PAS retourner tous les utilisateurs
- Doit chercher littéralement "%"

✅ **PASS** si pas d'injection

---

### Test 7: Limite de taille des requêtes

```bash
# Générer un payload > 10KB
python3 -c "print('{\"email\":\"test@test.com\",\"password\":\"' + 'A'*12000 + '\"}')" > large.json

# Envoyer
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d @large.json
```

**Attendu:**
```json
{
  "error": "bad_request",
  "message": "request entity too large"
}
```

✅ **PASS** si rejeté

---

## ✅ TESTS FONCTIONNELS

### Test 1: Register + Login (Flow complet)

```bash
# 1. Register
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@test.com",
    "password": "Alice1234",
    "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjAN..."
  }'
```

**Attendu:**
```json
{
  "message": "Utilisateur créé avec succès",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "alice@test.com",
    "roles": ["ROLE_USER"],
    "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjAN..."
  }
}
```

**Sauvegarder le token:**
```bash
TOKEN_ALICE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

```bash
# 2. Login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@test.com",
    "password": "Alice1234"
  }'
```

**Attendu:** Même structure que register

✅ **PASS** si token reçu

---

### Test 2: Me endpoint

```bash
curl -X GET http://localhost:3000/me \
  -H "Authorization: Bearer $TOKEN_ALICE"
```

**Attendu:**
```json
{
  "id": 1,
  "email": "alice@test.com",
  "roles": ["ROLE_USER"],
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjAN..."
}
```

✅ **PASS** si info correcte

---

### Test 3: Search users

```bash
# Créer un deuxième utilisateur d'abord
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@test.com",
    "password": "Bob12345"
  }'

TOKEN_BOB="<save_token_here>"

# Alice cherche Bob
curl -X GET "http://localhost:3000/users/search?q=bob" \
  -H "Authorization: Bearer $TOKEN_ALICE"
```

**Attendu:**
```json
{
  "users": [
    {
      "id": 2,
      "email": "bob@test.com",
      "roles": ["ROLE_USER"],
      "publicKey": null
    }
  ]
}
```

✅ **PASS** si Bob trouvé

---

### Test 4: Friend Request Flow

```bash
# 1. Alice envoie une demande à Bob
curl -X POST http://localhost:3000/friends/request \
  -H "Authorization: Bearer $TOKEN_ALICE" \
  -H "Content-Type: application/json" \
  -d '{"receiverId": 2}'

# Attendu: {"message": "Demande d'ami envoyée", "request": {...}}

# 2. Bob voit les demandes en attente
curl -X GET http://localhost:3000/friends/requests \
  -H "Authorization: Bearer $TOKEN_BOB"

# Attendu: Liste avec la demande d'Alice

# 3. Bob accepte la demande
curl -X PUT http://localhost:3000/friends/request/1 \
  -H "Authorization: Bearer $TOKEN_BOB" \
  -H "Content-Type: application/json" \
  -d '{"action": "accept"}'

# Attendu: {"message": "Demande acceptée", ...}

# 4. Alice et Bob voient leur liste d'amis
curl -X GET http://localhost:3000/friends \
  -H "Authorization: Bearer $TOKEN_ALICE"

curl -X GET http://localhost:3000/friends \
  -H "Authorization: Bearer $TOKEN_BOB"
```

✅ **PASS** si les deux se voient dans leur liste d'amis

---

### Test 5: Messages Flow

```bash
# 1. Alice envoie un message à Bob
curl -X POST http://localhost:3000/messages \
  -H "Authorization: Bearer $TOKEN_ALICE" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": 2,
    "content": "Hello Bob!"
  }'

# Attendu: Message créé avec ID

# 2. Bob lit la conversation
curl -X GET "http://localhost:3000/messages?userId=1" \
  -H "Authorization: Bearer $TOKEN_BOB"

# Attendu: Liste avec le message d'Alice

# 3. Bob répond
curl -X POST http://localhost:3000/messages \
  -H "Authorization: Bearer $TOKEN_BOB" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": 1,
    "content": "Hi Alice!"
  }'

# 4. Alice lit la conversation
curl -X GET "http://localhost:3000/messages?userId=2" \
  -H "Authorization: Bearer $TOKEN_ALICE"

# Attendu: 2 messages (Hello Bob + Hi Alice)
```

✅ **PASS** si les deux messages visibles

---

### Test 6: Polling - New messages

```bash
# Sauvegarder timestamp actuel
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Attendre 2 secondes
sleep 2

# Bob envoie un nouveau message
curl -X POST http://localhost:3000/messages \
  -H "Authorization: Bearer $TOKEN_BOB" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": 1,
    "content": "New message!"
  }'

# Alice poll les nouveaux messages
curl -X GET "http://localhost:3000/messages/new?since=$TIMESTAMP" \
  -H "Authorization: Bearer $TOKEN_ALICE"
```

**Attendu:** Seulement "New message!" dans la réponse

✅ **PASS** si seulement les nouveaux messages

---

### Test 7: Polling - Unread count

```bash
# Bob envoie 3 messages à Alice
for i in {1..3}; do
  curl -X POST http://localhost:3000/messages \
    -H "Authorization: Bearer $TOKEN_BOB" \
    -H "Content-Type: application/json" \
    -d "{\"receiverId\": 1, \"content\": \"Message $i\"}"
done

# Alice check unread count
curl -X GET http://localhost:3000/messages/unread-count \
  -H "Authorization: Bearer $TOKEN_ALICE"
```

**Attendu:**
```json
{
  "unreadCounts": [
    {
      "senderId": 2,
      "senderEmail": "bob@test.com",
      "unreadCount": 3,
      "lastMessageAt": "2025-11-13T..."
    }
  ],
  "timestamp": "..."
}
```

✅ **PASS** si count = 3

---

## ✅ TESTS SOCKET.IO

### Test 1: Authentification Socket.IO

Créer un fichier `test-socket.js`:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  
  // Authenticate
  socket.emit('authenticate', {
    token: 'PUT_YOUR_TOKEN_HERE'
  });
});

socket.on('authenticated', (data) => {
  console.log('✅ Authenticated:', data);
});

socket.on('error', (data) => {
  console.error('❌ Error:', data);
});

socket.on('disconnect', () => {
  console.log('👋 Disconnected');
});

// Keep alive
setTimeout(() => {
  console.log('Closing...');
  socket.close();
  process.exit(0);
}, 5000);
```

```bash
node test-socket.js
```

**Attendu:**
```
✅ Connected: abc123
✅ Authenticated: { userId: 1, message: 'Authentification réussie' }
👋 Disconnected
```

✅ **PASS** si authentifié

---

## 📊 TESTS DE PERFORMANCE

### Test 1: Compression

```bash
# Sans compression (désactiver dans le code temporairement)
curl -X GET http://localhost:3000/messages?userId=2&limit=50 \
  -H "Authorization: Bearer $TOKEN_ALICE" \
  -w "\nSize: %{size_download} bytes\n"

# Avec compression
curl -X GET http://localhost:3000/messages?userId=2&limit=50 \
  -H "Authorization: Bearer $TOKEN_ALICE" \
  -H "Accept-Encoding: gzip" \
  --compressed \
  -w "\nCompressed size: %{size_download} bytes\n"
```

✅ **PASS** si taille compressée < 50% de l'originale

---

### Test 2: Pool de connexions (stress test)

```bash
# Installer Apache Bench
sudo apt install apache2-utils  # Ubuntu
# ou
brew install ab  # macOS

# Test de charge
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN_ALICE" \
  http://localhost:3000/me

# Vérifier:
# - Requests per second > 500
# - Failed requests = 0
# - No "Too many connections" errors
```

✅ **PASS** si aucune erreur de connexion DB

---

## 📋 CHECKLIST COMPLÈTE

### Sécurité
- [ ] JWT_SECRET obligatoire (serveur crash sans)
- [ ] Rate limiting auth (5 tentatives max)
- [ ] CORS bloque origines non autorisées
- [ ] Validation email stricte
- [ ] Validation mot de passe forte (8+ chars, majuscule, chiffre)
- [ ] Injection SQL LIKE impossible
- [ ] Limite taille requêtes (10KB)
- [ ] Timing attack protégé (login)
- [ ] Emails masqués dans les logs

### Fonctionnel
- [ ] Register fonctionne
- [ ] Login fonctionne
- [ ] JWT expire correctement
- [ ] Search users fonctionne
- [ ] Friend requests (send/accept/list)
- [ ] Messages (send/read/history)
- [ ] Polling (new messages)
- [ ] Polling (unread count)
- [ ] Socket.IO authentification
- [ ] Real-time notifications

### Performance
- [ ] Compression active (-70% taille)
- [ ] Pool connexions fonctionne
- [ ] Pas d'erreurs sous charge (1000 req)
- [ ] Temps de réponse < 100ms (/me)

### Logs
- [ ] Logs colorés et lisibles
- [ ] Emails masqués (GDPR)
- [ ] Rate limit warnings visibles
- [ ] CORS warnings visibles

---

## 🎯 SCORE FINAL

**Total:** __ / 32 tests

- **32/32:** 🟢 Excellent - Production ready !
- **28-31:** 🟡 Bon - Quelques ajustements
- **< 28:** 🔴 Problèmes - Vérifier logs

---

## 🐛 DEBUG

### Voir les logs en temps réel

```bash
npm start 2>&1 | tee server.log
```

### Activer logs SQL (développement)

Dans `.env`:
```bash
NODE_ENV=development
```

Les requêtes SQL s'afficheront dans la console.

### Tester avec Postman

Importer cette collection:

```json
{
  "info": { "name": "Messaging API - Secured", "schema": "..." },
  "item": [
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@test.com\",\"password\":\"Test1234\"}"
        },
        "url": "http://localhost:3000/register"
      }
    }
  ]
}
```

---

**✅ Une fois tous les tests passés, votre serveur est prêt pour la production !**
