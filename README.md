# 🚀 API de Messagerie Temps Réel avec Authentification JWT

Backend Node.js complet pour application de messagerie Android avec authentification sécurisée, API REST et Socket.IO pour messagerie instantanée privée.

## ✨ Fonctionnalités

### 🔐 Authentification
- Inscription et connexion utilisateur
- Tokens JWT sécurisés
- Compatibilité avec les mots de passe Symfony bcrypt
- Protection de toutes les routes sensibles

### 💬 Messagerie
- **API REST** pour l'historique des conversations
- **Socket.IO** pour les messages en temps réel
- Salons privés entre deux utilisateurs
- Stockage automatique dans MySQL
- Support de conversations 1-à-1

### 🗄️ Base de données
- Connexion à MySQL externe (Proxmox)
- Compatible avec schéma Symfony existant
- Tables `user` et `message` avec contraintes de clés étrangères

---

## 📦 Installation

### Installation automatique (recommandée)

```bash
# Télécharger et exécuter le script d'installation
curl -fsSL https://raw.githubusercontent.com/nelliau/Test_api-proxmox/main/install.sh | bash
```

### Installation manuelle

```bash
# 1. Cloner le repository
git clone https://github.com/nelliau/Test_api-proxmox.git
cd Test_api-proxmox

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
nano .env  # Éditer avec vos paramètres

# 4. Démarrer le serveur
npm start
```

---

## ⚙️ Configuration

Créez un fichier `.env` à la racine du projet :

```env
# Server Configuration
PORT=3000

# MySQL Database Configuration
DB_HOST=192.168.1.100
DB_USER=votre-utilisateur
DB_PASSWORD=votre-mot-de-passe
DB_NAME=Dashkey_test

# JWT Authentication
JWT_SECRET=votre-cle-secrete-tres-longue-et-aleatoire
JWT_EXPIRES_IN=7d
```

**⚠️ IMPORTANT** : En production, générez une clé JWT_SECRET forte et aléatoire :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🔌 API REST

### Endpoints publics

#### 🏥 Health Check
```http
GET /
```
**Réponse :**
```json
{
  "status": "ok",
  "message": "Realtime Messaging API"
}
```

#### 📝 Inscription
```http
POST /register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```
**Réponse (201) :**
```json
{
  "message": "Utilisateur créé avec succès",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "email": "user@example.com",
    "roles": ["ROLE_USER"]
  }
}
```

#### 🔑 Connexion
```http
POST /login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```
**Réponse (200) :**
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "email": "user@example.com",
    "roles": ["ROLE_USER"]
  }
}
```

---

### Endpoints protégés (JWT requis)

**Toutes les routes ci-dessous nécessitent un header d'authentification :**
```http
Authorization: Bearer <votre_token_jwt>
```

#### 👤 Informations utilisateur actuel
```http
GET /me
Authorization: Bearer <token>
```
**Réponse :**
```json
{
  "id": 5,
  "email": "user@example.com",
  "roles": ["ROLE_USER"]
}
```

#### 💬 Récupérer l'historique d'une conversation
```http
GET /messages?userId=2&limit=50
Authorization: Bearer <token>
```
**Paramètres :**
- `userId` (requis) : ID de l'autre utilisateur
- `limit` (optionnel) : Nombre maximum de messages (défaut: 50, max: 200)

**Réponse :**
```json
[
  {
    "id": 1,
    "senderId": 5,
    "receiverId": 2,
    "content": "Salut, comment ça va ?",
    "createdAt": "2025-11-07T10:30:00.000Z",
    "sender": {
      "id": 5,
      "email": "user@example.com"
    },
    "receiver": {
      "id": 2,
      "email": "autre@example.com"
    }
  },
  {
    "id": 2,
    "senderId": 2,
    "receiverId": 5,
    "content": "Très bien merci !",
    "createdAt": "2025-11-07T10:31:00.000Z",
    "sender": {
      "id": 2,
      "email": "autre@example.com"
    },
    "receiver": {
      "id": 5,
      "email": "user@example.com"
    }
  }
]
```

#### 📤 Envoyer un message (REST)
```http
POST /messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "receiverId": 2,
  "content": "Bonjour, comment allez-vous ?"
}
```
**Réponse (201) :**
```json
{
  "id": 3,
  "senderId": 5,
  "receiverId": 2,
  "content": "Bonjour, comment allez-vous ?",
  "createdAt": "2025-11-07T10:35:00.000Z"
}
```

---

## 🔥 Socket.IO - Messagerie Temps Réel

### Connexion et authentification

```javascript
import io from 'socket.io-client';

// 1. Se connecter au serveur Socket.IO
const socket = io('http://votre-serveur:3000');

// 2. S'authentifier avec le JWT
socket.emit('authenticate', {
  token: 'votre_token_jwt'
});

// 3. Écouter la confirmation d'authentification
socket.on('authenticated', (data) => {
  console.log('Authentifié !', data);
  // { userId: 5, message: "Authentification réussie" }
});

// Gérer les erreurs
socket.on('error', (error) => {
  console.error('Erreur:', error.message);
});
```

### Rejoindre une conversation

```javascript
// Rejoindre la conversation avec l'utilisateur ID 2
socket.emit('join_conversation', {
  otherUserId: 2
});

// Confirmation
socket.on('joined_conversation', (data) => {
  console.log('Conversation rejointe:', data);
  // { roomName: "chat_2_5", otherUserId: 2 }
});
```

### Envoyer un message en temps réel

```javascript
socket.emit('send_message', {
  receiverId: 2,
  content: 'Message en temps réel !'
});
```

### Recevoir les messages en temps réel

```javascript
socket.on('message', (message) => {
  console.log('Nouveau message reçu:', message);
  /*
  {
    id: 10,
    senderId: 2,
    receiverId: 5,
    content: "Réponse en temps réel",
    createdAt: "2025-11-07T11:00:00.000Z"
  }
  */
  
  // Afficher le message dans l'interface Android
  displayMessage(message);
});
```

### Événements Socket.IO disponibles

| Événement | Direction | Description |
|-----------|-----------|-------------|
| `authenticate` | Client → Serveur | Authentifier avec JWT |
| `authenticated` | Serveur → Client | Confirmation d'authentification |
| `join_conversation` | Client → Serveur | Rejoindre une conversation privée |
| `joined_conversation` | Serveur → Client | Confirmation de jonction |
| `send_message` | Client → Serveur | Envoyer un message |
| `message` | Serveur → Client | Recevoir un message |
| `error` | Serveur → Client | Notification d'erreur |

---

## 🏗️ Architecture

### Salons Socket.IO privés

Les messages sont échangés dans des **salons privés** nommés `chat_{userId1}_{userId2}` où :
- Les IDs sont triés (le plus petit d'abord)
- Seuls les deux utilisateurs concernés reçoivent les messages
- Garantit la confidentialité des conversations

**Exemple** : 
- User 5 ↔ User 2 = Salon `chat_2_5`
- User 10 ↔ User 3 = Salon `chat_3_10`

### Flux d'une conversation

```
[Android App User A]                    [Node.js Server]                    [Android App User B]
        |                                       |                                       |
        |-- 1. POST /login ------------------>|                                       |
        |<----- Token JWT --------------------|                                       |
        |                                       |                                       |
        |-- 2. Socket.IO connect ------------>|                                       |
        |-- 3. emit('authenticate') --------->|                                       |
        |<----- authenticated -----------------|                                       |
        |                                       |<-- Socket.IO connect ---------------|
        |                                       |<-- emit('authenticate') -------------|
        |                                       |------ authenticated ---------------->|
        |                                       |                                       |
        |-- 4. emit('join_conversation', {2})->|                                       |
        |                                       |<-- emit('join_conversation', {5}) ---|
        |                                       |                                       |
        |-- 5. emit('send_message') --------->|                                       |
        |                               [Save to MySQL]                               |
        |<----- on('message') ----------------|------ on('message') ---------------->|
        |                                       |                                       |
        |                                       |<-- emit('send_message') -------------|
        |                               [Save to MySQL]                               |
        |<----- on('message') ----------------|------ on('message') ---------------->|
```

---

## 🗄️ Structure de la Base de Données

### Table `user`
```sql
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(180) NOT NULL,
  `roles` longtext NOT NULL,  -- JSON: ["ROLE_USER"]
  `password` varchar(255) NOT NULL,  -- bcrypt hash
  PRIMARY KEY (`id`),
  UNIQUE KEY (`email`)
);
```

### Table `message`
```sql
CREATE TABLE `message` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`sender_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`receiver_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
);
```

---

## 🚀 Déploiement

### Option A : Démarrage manuel

```bash
npm start
```

### Option B : Service systemd (démarrage automatique)

```bash
# Installer le service
sudo ./install-service.sh

# Gérer le service
sudo systemctl start test-api
sudo systemctl stop test-api
sudo systemctl restart test-api
sudo systemctl status test-api

# Activer au démarrage
sudo systemctl enable test-api

# Voir les logs
sudo journalctl -u test-api -f
```

### Option C : PM2 (recommandé en production)

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer avec PM2
pm2 start server.js --name "messaging-api"

# Sauvegarder la configuration
pm2 save

# Démarrage automatique au boot
pm2 startup
```

---

## 📱 Intégration Android (Kotlin)

### Dépendances Gradle

```gradle
dependencies {
    // Retrofit pour l'API REST
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    
    // Socket.IO pour le temps réel
    implementation 'io.socket:socket.io-client:2.1.0'
    
    // OkHttp pour les intercepteurs JWT
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.11.0'
}
```

### Exemple d'implémentation Kotlin

```kotlin
// Service Retrofit pour l'API REST
interface MessagingApi {
    @POST("login")
    suspend fun login(@Body credentials: LoginRequest): Response<LoginResponse>
    
    @GET("messages")
    suspend fun getMessages(
        @Header("Authorization") token: String,
        @Query("userId") otherUserId: Int
    ): Response<List<Message>>
}

// Client Socket.IO
class SocketManager(private val token: String) {
    private lateinit var socket: Socket
    
    fun connect() {
        socket = IO.socket("http://votre-serveur:3000")
        
        socket.on(Socket.EVENT_CONNECT) {
            // S'authentifier
            socket.emit("authenticate", JSONObject().put("token", token))
        }
        
        socket.on("authenticated") { args ->
            val data = args[0] as JSONObject
            Log.d("Socket", "Authentifié: ${data.getInt("userId")}")
        }
        
        socket.on("message") { args ->
            val message = args[0] as JSONObject
            // Traiter le message reçu
            handleNewMessage(message)
        }
        
        socket.connect()
    }
    
    fun joinConversation(otherUserId: Int) {
        socket.emit("join_conversation", JSONObject().put("otherUserId", otherUserId))
    }
    
    fun sendMessage(receiverId: Int, content: String) {
        val data = JSONObject()
            .put("receiverId", receiverId)
            .put("content", content)
        socket.emit("send_message", data)
    }
}
```

---

## 🔒 Sécurité

### Recommandations de production

1. **JWT Secret** : Utilisez une clé forte générée aléatoirement
2. **HTTPS** : Utilisez un reverse proxy (Nginx) avec SSL/TLS
3. **CORS** : Restreignez les origines autorisées dans la configuration
4. **Rate Limiting** : Ajoutez express-rate-limit pour limiter les requêtes
5. **Validation** : Tous les inputs sont validés côté serveur
6. **Mots de passe** : Hash bcrypt avec 13 rounds (compatible Symfony)

### Configuration Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🧪 Tests

### Test de l'API REST avec curl

```bash
# 1. Inscription
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Connexion
TOKEN=$(curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.token')

# 3. Profil utilisateur
curl http://localhost:3000/me \
  -H "Authorization: Bearer $TOKEN"

# 4. Historique conversation
curl "http://localhost:3000/messages?userId=2" \
  -H "Authorization: Bearer $TOKEN"

# 5. Envoyer un message
curl -X POST http://localhost:3000/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverId":2,"content":"Test message"}'
```

---

## 📊 Monitoring

### Vérifier les logs

```bash
# Logs en temps réel
sudo journalctl -u test-api -f

# Logs des dernières 24h
sudo journalctl -u test-api --since "24 hours ago"

# Logs avec erreurs uniquement
sudo journalctl -u test-api -p err
```

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

## 📄 Licence

Ce projet est sous licence MIT.

---

## 🆘 Support

Pour toute question ou problème :
- Ouvrez une issue sur GitHub
- Consultez la documentation Socket.IO : https://socket.io/docs/
- Consultez la documentation JWT : https://jwt.io/

---

## 🎯 Roadmap

- [ ] Rate limiting sur les endpoints
- [ ] Support des fichiers/images
- [ ] Notifications push
- [ ] Statut en ligne/hors ligne
- [ ] Indicateur "en train d'écrire..."
- [ ] Messages lus/non lus
- [ ] Conversations de groupe
