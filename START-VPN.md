# 🚀 Démarrage de l'API sur le VPN

## Configuration actuelle

- **API accessible sur :** `http://10.6.0.6:80`
- **Base de données :** `10.6.0.5:8080`
- **Réseau :** VPN

## ⚙️ Configuration

Le fichier `.env` est déjà configuré :

```bash
PORT=80
DB_HOST=10.6.0.5
DB_PORT=8080
DB_USER=root
DB_PASSWORD=your_password  # ⬅️ À MODIFIER
DB_NAME=secure_messaging    # ⬅️ À MODIFIER si nécessaire
JWT_SECRET=your_super_secret_jwt_key_change_in_production  # ⬅️ À MODIFIER
JWT_EXPIRES_IN=7d
```

## 📝 Étapes de configuration

### 1. Modifier le fichier .env

```bash
nano .env
```

Changez :
- `DB_PASSWORD` : Votre mot de passe MySQL
- `DB_NAME` : Le nom de votre base de données
- `JWT_SECRET` : Une clé secrète longue et aléatoire

### 2. Générer une clé JWT sécurisée (optionnel)

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copiez le résultat dans `JWT_SECRET`

## 🚀 Démarrage de l'API

### Option A : Port 80 avec sudo (recommandé)

Le port 80 nécessite des privilèges root :

```bash
sudo npm start
```

### Option B : Port 80 avec capabilities (sans sudo)

Donner les permissions à Node.js :

```bash
# Une seule fois
sudo setcap 'cap_net_bind_service=+ep' $(which node)

# Puis démarrer normalement
npm start
```

### Option C : Utiliser un port non-privilégié temporairement

Pour tester, modifiez `.env` :

```bash
PORT=3000  # Au lieu de 80
```

Puis :

```bash
npm start
```

## ✅ Vérification

### 1. Tester la connexion depuis votre machine

```bash
# Health check
curl http://10.6.0.6/

# Devrait retourner : {"status":"ok","message":"Realtime Messaging API"}
```

### 2. Créer un utilisateur de test

```bash
curl -X POST http://10.6.0.6/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Se connecter

```bash
curl -X POST http://10.6.0.6/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🐛 Dépannage

### Erreur : "ECONNREFUSED 10.6.0.5:8080"

➡️ Vérifiez que :
- Votre VPN est actif
- MySQL est accessible sur `10.6.0.5:8080`
- Le pare-feu autorise la connexion

```bash
# Tester depuis votre machine locale
telnet 10.6.0.5 8080
# ou
mysql -h 10.6.0.5 -P 8080 -u root -p
```

### Erreur : "EACCES: permission denied, bind to 0.0.0.0:80"

➡️ Utilisez `sudo npm start` ou configurez les capabilities (voir Option B)

### Erreur : "Access denied for user 'root'@'10.6.0.6'"

➡️ Vérifiez que l'utilisateur MySQL a les permissions depuis votre IP :

```sql
-- Sur le serveur MySQL (10.6.0.5)
GRANT ALL PRIVILEGES ON secure_messaging.* TO 'root'@'10.6.0.6' IDENTIFIED BY 'votre_password';
FLUSH PRIVILEGES;
```

## 📊 Structure de la base de données requise

Votre base de données doit avoir ces tables :

```sql
CREATE TABLE IF NOT EXISTS `user` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(180) UNIQUE NOT NULL,
  `roles` TEXT NOT NULL,
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

## 🔒 Sécurité VPN

Votre API sera accessible sur :
- ✅ **Depuis le VPN :** `http://10.6.0.6:80`
- ❌ **Depuis Internet :** Non accessible (protégé par VPN)

C'est sécurisé ! Seuls les utilisateurs connectés au VPN peuvent accéder à l'API.

## 📱 Configuration Android

Dans votre app Android, utilisez :

```kotlin
const val BASE_URL = "http://10.6.0.6/"  // Port 80 par défaut
```

**Important :** Votre téléphone Android doit être connecté au même VPN !

## 🔄 Redémarrage automatique (systemd)

Pour que l'API démarre automatiquement :

```bash
# Créer le service
sudo nano /etc/systemd/system/test-api.service
```

Contenu :

```ini
[Unit]
Description=Test API Node.js
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/workspace
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Puis :

```bash
sudo systemctl daemon-reload
sudo systemctl enable test-api
sudo systemctl start test-api
sudo systemctl status test-api
```

## 📋 Checklist avant le premier test

- [ ] Fichier `.env` configuré avec les bons paramètres
- [ ] VPN actif et connecté
- [ ] MySQL accessible sur `10.6.0.5:8080`
- [ ] Base de données et tables créées
- [ ] JWT_SECRET changé
- [ ] API démarrée avec `sudo npm start`
- [ ] Health check fonctionne : `curl http://10.6.0.6/`
- [ ] Test d'inscription réussi

---

**Bon test ! 🚀**
