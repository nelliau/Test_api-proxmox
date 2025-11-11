# 🚀 Instructions de démarrage sur votre machine VPN

## ⚠️ Important
Cet environnement de développement n'a pas accès au VPN. Vous devez exécuter le serveur **depuis votre machine locale** qui est connectée au VPN (10.6.0.6).

---

## 📥 1. Récupérer le code sur votre machine

```bash
# Clone le repository
git clone https://github.com/nelliau/Test_api-proxmox.git
cd Test_api-proxmox

# Checkout la bonne branche
git checkout cursor/backend-chat-server-setup-with-authentication-1ef0

# Ou pull les derniers changements si déjà cloné
git pull origin cursor/backend-chat-server-setup-with-authentication-1ef0
```

---

## ⚙️ 2. Configuration (.env)

Créez le fichier `.env` à la racine du projet :

```bash
nano .env
```

Contenu :

```env
# Server Configuration
PORT=80

# MySQL Database Configuration (VPN)
DB_HOST=10.6.0.5
DB_PORT=8080
DB_USER=root
DB_PASSWORD=test
DB_NAME=test

# JWT Authentication
JWT_SECRET=test123
JWT_EXPIRES_IN=7d
```

---

## 📦 3. Installer les dépendances

```bash
npm install
```

Dépendances qui seront installées :
- express
- socket.io
- sequelize
- mysql2
- jsonwebtoken
- bcryptjs
- cors
- dotenv

---

## 🔍 4. Vérifier la connexion MySQL

Avant de démarrer le serveur, testez la connexion MySQL :

```bash
# Tester avec mysql client
mysql -h 10.6.0.5 -P 8080 -u root -p
# Mot de passe : test
```

Puis vérifiez que la base existe :

```sql
SHOW DATABASES;
USE test;
SHOW TABLES;
```

Si les tables `user` et `message` n'existent pas, créez-les :

```sql
CREATE TABLE IF NOT EXISTS `user` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(180) UNIQUE NOT NULL,
  `roles` TEXT NOT NULL DEFAULT '["ROLE_USER"]',
  `password` VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS `message` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sender_id` INT NOT NULL,
  `receiver_id` INT NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES user(id),
  FOREIGN KEY (receiver_id) REFERENCES user(id)
);
```

---

## 🚀 5. Démarrer le serveur

### Option A : Port 80 avec sudo (recommandé)

```bash
sudo npm start
```

Vous devriez voir :
```
Database connected and models synced.
✅ Server listening on port 80
📡 Socket.IO ready for real-time messaging
🔐 JWT authentication enabled
```

### Option B : Sans sudo (capabilities)

Donner les permissions à Node.js une seule fois :

```bash
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

Puis démarrer :

```bash
npm start
```

### Option C : Port temporaire (test rapide)

Modifiez `.env` :
```env
PORT=3000
```

Puis :
```bash
npm start
```

API accessible sur `http://10.6.0.6:3000/`

---

## ✅ 6. Tester l'API

### Test 1 : Health check

```bash
curl http://10.6.0.6/
```

Résultat attendu :
```json
{"status":"ok","message":"Realtime Messaging API"}
```

### Test 2 : Créer un utilisateur

```bash
curl -X POST http://10.6.0.6/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}'
```

Résultat attendu :
```json
{
  "message": "Utilisateur créé avec succès",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "alice@test.com",
    "roles": ["ROLE_USER"]
  }
}
```

💾 **Sauvegardez le token !**

### Test 3 : Se connecter

```bash
curl -X POST http://10.6.0.6/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}'
```

### Test 4 : Récupérer son profil

```bash
# Remplacez YOUR_TOKEN par le token reçu
curl http://10.6.0.6/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 5 : Script de test complet

Si vous avez le fichier `test-api.sh` dans le repo :

```bash
chmod +x test-api.sh
./test-api.sh
```

---

## 🐛 Dépannage

### Erreur : ETIMEDOUT ou ECONNREFUSED

**Problème :** Impossible de se connecter à MySQL

**Solutions :**
1. Vérifiez que le VPN est actif
2. Testez la connexion :
   ```bash
   telnet 10.6.0.5 8080
   ```
3. Vérifiez que MySQL accepte les connexions depuis 10.6.0.6 :
   ```sql
   -- Sur le serveur MySQL
   SELECT host, user FROM mysql.user WHERE user='root';
   
   -- Si nécessaire, créer l'accès :
   CREATE USER 'root'@'10.6.0.6' IDENTIFIED BY 'test';
   GRANT ALL PRIVILEGES ON test.* TO 'root'@'10.6.0.6';
   FLUSH PRIVILEGES;
   ```

### Erreur : EACCES permission denied (port 80)

**Problème :** Le port 80 nécessite des privilèges root

**Solutions :**
- Utilisez `sudo npm start`
- Ou configurez capabilities (Option B ci-dessus)
- Ou utilisez un port > 1024 (3000, 8080, etc.)

### Erreur : Cannot find module 'jsonwebtoken'

**Problème :** Dépendances manquantes

**Solution :**
```bash
npm install
```

### MySQL : Access denied

**Problème :** Authentification MySQL échouée

**Vérifications :**
1. Mot de passe correct ? (`test`)
2. Utilisateur existe ? (`root`)
3. Permissions depuis 10.6.0.6 ?

```sql
SHOW GRANTS FOR 'root'@'10.6.0.6';
```

---

## 📱 7. Configuration Android

Une fois le serveur démarré avec succès, configurez votre app Android :

```kotlin
// build.gradle (app)
dependencies {
    implementation("io.socket:socket.io-client:2.1.0")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
}

// Constants.kt
object ApiConfig {
    const val BASE_URL = "http://10.6.0.6/"  // Port 80 par défaut
    const val SOCKET_URL = "http://10.6.0.6"
}
```

⚠️ **Important :** Votre téléphone Android doit être connecté au même VPN !

---

## 🔄 Démarrage automatique (systemd)

Pour que le serveur démarre automatiquement au boot :

```bash
# Créer le service
sudo nano /etc/systemd/system/test-api.service
```

Contenu :

```ini
[Unit]
Description=Test API Node.js
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=votre_utilisateur
WorkingDirectory=/chemin/vers/Test_api-proxmox
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Puis :

```bash
sudo systemctl daemon-reload
sudo systemctl enable test-api
sudo systemctl start test-api
sudo systemctl status test-api

# Voir les logs
sudo journalctl -u test-api -f
```

---

## 📋 Checklist complète

- [ ] Git : Branche `cursor/backend-chat-server-setup-with-authentication-1ef0` checkout
- [ ] Fichier `.env` créé avec les bons paramètres
- [ ] VPN actif et connecté (IP: 10.6.0.6)
- [ ] MySQL accessible : `telnet 10.6.0.5 8080`
- [ ] Base de données `test` existe
- [ ] Tables `user` et `message` créées
- [ ] Dépendances npm installées : `npm install`
- [ ] Serveur démarré : `sudo npm start`
- [ ] Health check OK : `curl http://10.6.0.6/`
- [ ] Test inscription réussi
- [ ] Token JWT reçu et sauvegardé

---

## 🎯 URLs finales

Une fois tout configuré, votre API est accessible sur :

- **Health check :** `http://10.6.0.6/`
- **Register :** `POST http://10.6.0.6/register`
- **Login :** `POST http://10.6.0.6/login`
- **Profile :** `GET http://10.6.0.6/me`
- **Messages :** `GET http://10.6.0.6/messages?userId=X`
- **Send message :** `POST http://10.6.0.6/messages`
- **Socket.IO :** `ws://10.6.0.6/`

---

**Bon déploiement ! 🚀**

*Note : Tous les utilisateurs doivent être connectés au VPN 10.6.0.x pour accéder à l'API.*
