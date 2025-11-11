# 🚀 Guide de Démarrage Rapide

## ✅ Votre API est maintenant COMPLÈTE !

Votre serveur Node.js dispose maintenant de **toutes les fonctionnalités** demandées :

### 🎯 Fonctionnalités implémentées

✅ **Authentification JWT complète**
- Inscription utilisateur avec validation
- Connexion sécurisée
- Tokens JWT (expiration 7 jours)
- Compatibilité avec bcrypt Symfony

✅ **API REST sécurisée**
- Récupération historique messages filtrée
- Envoi de messages
- Profil utilisateur
- Middleware d'authentification

✅ **Socket.IO temps réel**
- Salons privés entre 2 utilisateurs
- Authentification JWT obligatoire
- Messages instantanés
- Stockage automatique en DB

✅ **Base de données MySQL**
- Connexion à votre DB externe existante
- Modèles `User` et `Message`
- Contraintes de clés étrangères

---

## 📋 Prérequis

- **Node.js** 16+ installé
- **MySQL** accessible (votre serveur Proxmox externe)
- **Git** (optionnel)

---

## ⚡ Démarrage en 3 étapes

### 1️⃣ Configuration de la base de données

Assurez-vous que votre base MySQL contient les tables :

```sql
-- Table user (déjà existante)
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(180) NOT NULL,
  `roles` longtext NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`email`)
);

-- Table message (déjà existante)
CREATE TABLE `message` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`sender_id`) REFERENCES `user` (`id`),
  FOREIGN KEY (`receiver_id`) REFERENCES `user` (`id`)
);
```

### 2️⃣ Configurer les variables d'environnement

```bash
# Copier le template
cp .env.example .env

# Éditer avec vos paramètres
nano .env
```

**Exemple de `.env` :**
```env
PORT=3000
DB_HOST=192.168.1.50
DB_USER=votre_user
DB_PASSWORD=votre_password
DB_NAME=Dashkey_test
JWT_SECRET=generez_une_cle_aleatoire_longue_ici
JWT_EXPIRES_IN=7d
```

💡 **Générer un JWT_SECRET sécurisé :**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3️⃣ Installer et démarrer

```bash
# Installer les dépendances
npm install

# Démarrer le serveur
npm start
```

**Résultat attendu :**
```
Database connected and models synced.
✅ Server listening on port 3000
📡 Socket.IO ready for real-time messaging
🔐 JWT authentication enabled
```

---

## 🧪 Tester l'installation

### Test automatique complet

```bash
# Rendre le script exécutable (une seule fois)
chmod +x test-api.sh

# Lancer les tests
./test-api.sh
```

Ce script teste automatiquement :
- ✅ Health check
- ✅ Inscription de 2 utilisateurs
- ✅ Connexion
- ✅ Récupération profil
- ✅ Envoi de messages REST
- ✅ Historique conversation
- ✅ Sécurité JWT

### Test manuel rapide

```bash
# 1. Health check
curl http://localhost:3000/

# 2. Créer un compte
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Copier le token de la réponse et l'utiliser ci-dessous
TOKEN="eyJhbGc..."

# 3. Récupérer son profil
curl http://localhost:3000/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📱 Intégration Android (Kotlin)

### Dépendances Gradle

```gradle
dependencies {
    // API REST
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.11.0'
    
    // Socket.IO
    implementation 'io.socket:socket.io-client:2.1.0'
}
```

### Exemple minimal Kotlin

```kotlin
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

// ===== API REST =====
interface MessagingApi {
    @POST("login")
    suspend fun login(@Body body: LoginRequest): LoginResponse
    
    @GET("messages")
    suspend fun getMessages(
        @Header("Authorization") token: String,
        @Query("userId") userId: Int
    ): List<Message>
    
    @POST("messages")
    suspend fun sendMessage(
        @Header("Authorization") token: String,
        @Body body: SendMessageRequest
    ): Message
}

data class LoginRequest(val email: String, val password: String)
data class LoginResponse(val token: String, val user: User)
data class User(val id: Int, val email: String, val roles: List<String>)
data class Message(val id: Int, val senderId: Int, val receiverId: Int, 
                   val content: String, val createdAt: String)
data class SendMessageRequest(val receiverId: Int, val content: String)

// ===== RETROFIT =====
val retrofit = Retrofit.Builder()
    .baseUrl("http://192.168.1.100:3000/")
    .addConverterFactory(GsonConverterFactory.create())
    .build()

val api = retrofit.create(MessagingApi::class.java)

// ===== SOCKET.IO =====
class SocketManager(private val serverUrl: String, private val token: String) {
    private lateinit var socket: Socket
    
    fun connect() {
        socket = IO.socket(serverUrl)
        
        socket.on(Socket.EVENT_CONNECT) {
            // S'authentifier
            val data = JSONObject().put("token", token)
            socket.emit("authenticate", data)
        }
        
        socket.on("authenticated") { args ->
            val response = args[0] as JSONObject
            println("Authentifié: ${response.getInt("userId")}")
        }
        
        socket.on("message") { args ->
            val message = args[0] as JSONObject
            // Afficher dans l'UI
            val content = message.getString("content")
            val senderId = message.getInt("senderId")
            updateUI(senderId, content)
        }
        
        socket.connect()
    }
    
    fun joinConversation(otherUserId: Int) {
        val data = JSONObject().put("otherUserId", otherUserId)
        socket.emit("join_conversation", data)
    }
    
    fun sendMessage(receiverId: Int, content: String) {
        val data = JSONObject()
            .put("receiverId", receiverId)
            .put("content", content)
        socket.emit("send_message", data)
    }
    
    fun disconnect() {
        socket.disconnect()
    }
    
    private fun updateUI(senderId: Int, content: String) {
        // TODO: Mettre à jour l'interface Android
    }
}

// ===== UTILISATION =====
suspend fun example() {
    // 1. Login
    val response = api.login(LoginRequest("user@test.com", "password123"))
    val token = response.token
    val userId = response.user.id
    
    // 2. Récupérer historique avec user ID 2
    val messages = api.getMessages("Bearer $token", userId = 2)
    println("${messages.size} messages")
    
    // 3. Connecter Socket.IO
    val socket = SocketManager("http://192.168.1.100:3000", token)
    socket.connect()
    socket.joinConversation(2)
    socket.sendMessage(2, "Bonjour en temps réel !")
}
```

---

## 🔧 Configuration en production

### 1. Service systemd (démarrage automatique)

```bash
sudo ./install-service.sh
sudo systemctl enable test-api
sudo systemctl start test-api
```

### 2. Nginx reverse proxy avec SSL

```nginx
server {
    listen 443 ssl http2;
    server_name api.votre-domaine.com;
    
    ssl_certificate /etc/letsencrypt/live/api.votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.votre-domaine.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Firewall

```bash
# Ouvrir le port 3000
sudo ufw allow 3000/tcp

# Ou si vous utilisez Nginx (recommandé)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 📚 Documentation complète

- **README.md** : Documentation complète de l'API
- **API-TESTS.md** : Guide détaillé des tests
- **test-api.sh** : Script de test automatique

---

## 🆘 Dépannage

### Le serveur ne démarre pas

```bash
# Vérifier les logs
npm start

# Vérifier la connexion MySQL
mysql -h DB_HOST -u DB_USER -p

# Vérifier que le port n'est pas utilisé
sudo lsof -i :3000
```

### Socket.IO ne fonctionne pas

1. Vérifier que le token JWT est valide
2. S'assurer d'avoir appelé `authenticate` avant tout
3. Vérifier les logs serveur : `sudo journalctl -u test-api -f`

### Erreurs de connexion MySQL

```bash
# Tester la connexion
telnet DB_HOST 3306

# Vérifier les permissions MySQL
GRANT ALL PRIVILEGES ON Dashkey_test.* TO 'votre_user'@'%';
FLUSH PRIVILEGES;
```

---

## ✅ Checklist de déploiement

Avant de passer en production :

- [ ] Générer un JWT_SECRET fort et unique
- [ ] Configurer CORS pour votre domaine uniquement
- [ ] Activer HTTPS avec certificat SSL
- [ ] Configurer le firewall
- [ ] Activer le service systemd
- [ ] Configurer les sauvegardes MySQL
- [ ] Mettre en place le monitoring (PM2/logs)
- [ ] Tester depuis l'application Android

---

## 🎉 Félicitations !

Votre backend de messagerie est maintenant **100% opérationnel** avec :

✅ Authentification JWT sécurisée  
✅ API REST complète  
✅ Socket.IO temps réel  
✅ Base MySQL externe  
✅ Salons privés  
✅ Compatible Android Kotlin  

**Prêt pour la production !** 🚀
