# 🧪 Guide de Tests de l'API

## 🚀 Démarrage rapide

### 1. Configurer l'environnement

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer avec vos paramètres MySQL
nano .env
```

### 2. Installer et démarrer

```bash
# Installer les dépendances
npm install

# Démarrer le serveur
npm start
```

Le serveur devrait afficher :
```
✅ Server listening on port 3000
📡 Socket.IO ready for real-time messaging
🔐 JWT authentication enabled
```

---

## 📝 Tests avec curl

### Test 1 : Health Check

```bash
curl http://localhost:3000/
```

**Résultat attendu :**
```json
{
  "status": "ok",
  "message": "Realtime Messaging API"
}
```

---

### Test 2 : Créer un compte

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@test.com",
    "password": "password123"
  }'
```

**Résultat attendu :**
```json
{
  "message": "Utilisateur créé avec succès",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "email": "alice@test.com",
    "roles": ["ROLE_USER"]
  }
}
```

💾 **Sauvegardez le token pour les prochains tests !**

---

### Test 3 : Se connecter

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@test.com",
    "password": "password123"
  }'
```

---

### Test 4 : Script complet avec variables

```bash
#!/bin/bash

# Couleurs pour le terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Test API Messagerie ===${NC}\n"

# 1. Health check
echo -e "${GREEN}1. Health check...${NC}"
curl -s http://localhost:3000/ | jq
echo -e "\n"

# 2. Créer utilisateur Alice
echo -e "${GREEN}2. Créer Alice...${NC}"
ALICE_RESPONSE=$(curl -s -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}')
ALICE_TOKEN=$(echo $ALICE_RESPONSE | jq -r '.token')
ALICE_ID=$(echo $ALICE_RESPONSE | jq -r '.user.id')
echo "Alice ID: $ALICE_ID"
echo "Token: ${ALICE_TOKEN:0:20}..."
echo -e "\n"

# 3. Créer utilisateur Bob
echo -e "${GREEN}3. Créer Bob...${NC}"
BOB_RESPONSE=$(curl -s -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@test.com","password":"password123"}')
BOB_TOKEN=$(echo $BOB_RESPONSE | jq -r '.token')
BOB_ID=$(echo $BOB_RESPONSE | jq -r '.user.id')
echo "Bob ID: $BOB_ID"
echo "Token: ${BOB_TOKEN:0:20}..."
echo -e "\n"

# 4. Alice récupère son profil
echo -e "${GREEN}4. Profil Alice...${NC}"
curl -s http://localhost:3000/me \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq
echo -e "\n"

# 5. Alice envoie un message à Bob
echo -e "${GREEN}5. Alice envoie un message à Bob...${NC}"
curl -s -X POST http://localhost:3000/messages \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"receiverId\":$BOB_ID,\"content\":\"Salut Bob !\"}" | jq
echo -e "\n"

# 6. Bob répond à Alice
echo -e "${GREEN}6. Bob répond à Alice...${NC}"
curl -s -X POST http://localhost:3000/messages \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"receiverId\":$ALICE_ID,\"content\":\"Salut Alice, comment ça va ?\"}" | jq
echo -e "\n"

# 7. Alice récupère l'historique avec Bob
echo -e "${GREEN}7. Historique conversation Alice-Bob...${NC}"
curl -s "http://localhost:3000/messages?userId=$BOB_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq
echo -e "\n"

echo -e "${BLUE}=== Tests terminés ===${NC}"
```

**Pour l'utiliser :**

```bash
# Sauvegarder dans un fichier
nano test-api.sh

# Rendre exécutable
chmod +x test-api.sh

# Exécuter
./test-api.sh
```

---

## 🔌 Tests Socket.IO avec Node.js

Créez un fichier `test-socket.js` :

```javascript
import { io } from 'socket.io-client';

// Configuration
const SERVER_URL = 'http://localhost:3000';
const ALICE_TOKEN = 'collez_le_token_d_alice_ici';
const BOB_TOKEN = 'collez_le_token_de_bob_ici';
const ALICE_ID = 5; // ID d'Alice
const BOB_ID = 6;   // ID de Bob

// Alice se connecte
console.log('🔵 Alice se connecte...');
const aliceSocket = io(SERVER_URL);

aliceSocket.on('connect', () => {
  console.log('✅ Alice connectée');
  
  // Authentification
  aliceSocket.emit('authenticate', { token: ALICE_TOKEN });
});

aliceSocket.on('authenticated', (data) => {
  console.log('✅ Alice authentifiée:', data);
  
  // Rejoindre la conversation avec Bob
  aliceSocket.emit('join_conversation', { otherUserId: BOB_ID });
});

aliceSocket.on('joined_conversation', (data) => {
  console.log('✅ Alice a rejoint la conversation:', data);
  
  // Envoyer un message
  setTimeout(() => {
    console.log('📤 Alice envoie un message...');
    aliceSocket.emit('send_message', {
      receiverId: BOB_ID,
      content: 'Coucou Bob via Socket.IO !'
    });
  }, 1000);
});

aliceSocket.on('message', (message) => {
  console.log('💬 Alice reçoit:', message);
});

aliceSocket.on('error', (error) => {
  console.error('❌ Erreur Alice:', error);
});

// Bob se connecte
setTimeout(() => {
  console.log('\n🟢 Bob se connecte...');
  const bobSocket = io(SERVER_URL);
  
  bobSocket.on('connect', () => {
    console.log('✅ Bob connecté');
    bobSocket.emit('authenticate', { token: BOB_TOKEN });
  });
  
  bobSocket.on('authenticated', (data) => {
    console.log('✅ Bob authentifié:', data);
    bobSocket.emit('join_conversation', { otherUserId: ALICE_ID });
  });
  
  bobSocket.on('joined_conversation', (data) => {
    console.log('✅ Bob a rejoint la conversation:', data);
  });
  
  bobSocket.on('message', (message) => {
    console.log('💬 Bob reçoit:', message);
    
    // Bob répond
    setTimeout(() => {
      console.log('📤 Bob répond...');
      bobSocket.emit('send_message', {
        receiverId: ALICE_ID,
        content: 'Salut Alice ! Ça marche bien !'
      });
    }, 1000);
  });
  
  bobSocket.on('error', (error) => {
    console.error('❌ Erreur Bob:', error);
  });
}, 2000);

// Garder le script actif
setTimeout(() => {
  console.log('\n✅ Tests Socket.IO terminés');
  process.exit(0);
}, 10000);
```

**Pour l'utiliser :**

```bash
# Installer socket.io-client
npm install socket.io-client

# Lancer le test
node test-socket.js
```

---

## 🌐 Tests avec Postman

### Import collection Postman

Créez une nouvelle collection avec ces requêtes :

**1. Register**
- Method: POST
- URL: `http://localhost:3000/register`
- Body (JSON):
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**2. Login**
- Method: POST
- URL: `http://localhost:3000/login`
- Body (JSON):
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```
- Test Script:
```javascript
// Sauvegarder le token automatiquement
pm.test("Login successful", function () {
    var jsonData = pm.response.json();
    pm.environment.set("token", jsonData.token);
});
```

**3. Get Profile**
- Method: GET
- URL: `http://localhost:3000/me`
- Headers:
  - `Authorization`: `Bearer {{token}}`

**4. Get Messages**
- Method: GET
- URL: `http://localhost:3000/messages?userId=2`
- Headers:
  - `Authorization`: `Bearer {{token}}`

**5. Send Message**
- Method: POST
- URL: `http://localhost:3000/messages`
- Headers:
  - `Authorization`: `Bearer {{token}}`
- Body (JSON):
```json
{
  "receiverId": 2,
  "content": "Test message from Postman"
}
```

---

## ✅ Checklist de tests

### Authentification
- [ ] Inscription avec email valide
- [ ] Inscription avec email déjà utilisé (erreur 409)
- [ ] Inscription avec mot de passe trop court (erreur 400)
- [ ] Connexion avec identifiants corrects
- [ ] Connexion avec identifiants incorrects (erreur 401)
- [ ] Accès aux endpoints protégés sans token (erreur 401)
- [ ] Accès aux endpoints protégés avec token invalide (erreur 401)

### Messages REST
- [ ] Récupérer l'historique d'une conversation
- [ ] Envoyer un message via REST
- [ ] Vérifier que le message est sauvegardé en base
- [ ] Filtrer par limite de messages

### Socket.IO
- [ ] Connexion Socket.IO
- [ ] Authentification Socket.IO avec JWT
- [ ] Rejoindre une conversation
- [ ] Envoyer un message en temps réel
- [ ] Recevoir un message en temps réel
- [ ] Vérifier que les messages ne sont reçus que par les deux utilisateurs concernés

---

## 🐛 Debugging

### Voir les logs du serveur

```bash
# Si démarré manuellement
npm start

# Si service systemd
sudo journalctl -u test-api -f

# Logs avec timestamps
npm start | ts '[%Y-%m-%d %H:%M:%S]'
```

### Erreurs communes

**1. Cannot connect to MySQL**
- Vérifier DB_HOST, DB_USER, DB_PASSWORD dans `.env`
- Vérifier que MySQL est accessible depuis le conteneur
- Tester : `mysql -h DB_HOST -u DB_USER -p`

**2. JWT token invalid**
- Vérifier que JWT_SECRET est identique entre les requêtes
- Le token expire après 7 jours par défaut

**3. Socket.IO ne reçoit pas les messages**
- Vérifier l'authentification Socket.IO
- Vérifier que les deux utilisateurs ont rejoint la conversation
- Vérifier les logs serveur

---

## 📊 Résultats attendus

### Base de données après les tests

**Table `user` :**
```
+----+------------------+----------------+------------------------------------------------------+
| id | email            | roles          | password                                             |
+----+------------------+----------------+------------------------------------------------------+
| 1  | admin@pluvio.com | ["ROLE_ADMIN"] | $2y$10$dummyhashadmin                                   |
| 5  | alice@test.com   | ["ROLE_USER"]  | $2y$13$AlclI8u.3AR6857n85W0WON4PpaqVSd0Cc.9YKnPqV... |
| 6  | bob@test.com     | ["ROLE_USER"]  | $2y$13$AlclI8u.3AR6857n85W0WON4PpaqVSd0Cc.9YKnPqV... |
+----+------------------+----------------+------------------------------------------------------+
```

**Table `message` :**
```
+----+-----------+-------------+--------------------------------+---------------------+
| id | sender_id | receiver_id | content                        | created_at          |
+----+-----------+-------------+--------------------------------+---------------------+
| 1  | 5         | 6           | Salut Bob !                    | 2025-11-07 10:30:00 |
| 2  | 6         | 5           | Salut Alice, comment ça va ?   | 2025-11-07 10:31:00 |
| 3  | 5         | 6           | Coucou Bob via Socket.IO !     | 2025-11-07 10:32:00 |
+----+-----------+-------------+--------------------------------+---------------------+
```

---

## 🎯 Prochaines étapes

Une fois tous les tests validés :

1. ✅ Tester avec votre application Android Kotlin
2. ✅ Configurer un reverse proxy Nginx avec SSL
3. ✅ Mettre en place un monitoring (PM2, logs)
4. ✅ Activer le rate limiting en production
5. ✅ Restreindre CORS aux domaines autorisés

Bon test ! 🚀
