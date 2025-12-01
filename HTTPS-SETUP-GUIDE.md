# 🔒 Guide de Configuration HTTPS pour l'API

Ce guide vous explique comment activer HTTPS sur votre API Node.js.

## 📋 Table des matières

1. [Développement (Certificats auto-signés)](#développement)
2. [Production (Let's Encrypt)](#production)
3. [Configuration des variables d'environnement](#configuration)
4. [Vérification](#vérification)
5. [Dépannage](#dépannage)

---

## 🔧 Développement (Certificats auto-signés)

### Méthode 1 : Script automatique (Recommandé)

```bash
# Rendre le script exécutable
chmod +x generate-ssl-certs.sh

# Générer les certificats
./generate-ssl-certs.sh
```

### Méthode 2 : Commande manuelle

```bash
# Créer le dossier ssl
mkdir -p ssl

# Générer la clé privée et le certificat
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout ssl/server.key \
  -out ssl/server.cert \
  -subj "/C=FR/ST=IleDeFrance/L=Paris/O=Development/OU=API/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

# Permissions appropriées
chmod 600 ssl/server.key
chmod 644 ssl/server.cert
```

### ⚙️ Configuration .env

Ajoutez ces lignes à votre fichier `.env` :

```env
# SSL/TLS Configuration (Développement)
SSL_KEY_PATH=./ssl/server.key
SSL_CERT_PATH=./ssl/server.cert
# SSL_CA_PATH=./ssl/ca-bundle.crt  # Optionnel

# Mettre à jour les origines autorisées pour HTTPS
ALLOWED_ORIGINS=https://localhost:3000,http://localhost:3000
```

### 🚀 Démarrer le serveur

```bash
node server.js
```

Vous devriez voir :

```
🔒 HTTPS server configured
 - SSL Key: ./ssl/server.key
 - SSL Cert: ./ssl/server.cert
✅ Server running on HTTPS://127.0.0.1:3000 (internal only)
```

### 🌐 Accepter le certificat dans votre navigateur

1. Ouvrez `https://localhost:3000`
2. Vous verrez un avertissement de sécurité (normal pour les certificats auto-signés)
3. Cliquez sur **"Avancé"** puis **"Continuer vers localhost"**

### 🔐 Ajouter le certificat aux autorités de confiance (Optionnel)

**Linux (Ubuntu/Debian) :**

```bash
sudo cp ssl/server.cert /usr/local/share/ca-certificates/localhost.crt
sudo update-ca-certificates
```

**macOS :**

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain ssl/server.cert
```

**Windows :**

1. Double-cliquez sur `ssl/server.cert`
2. Cliquez sur "Installer le certificat..."
3. Choisissez "Ordinateur local"
4. Sélectionnez "Placer tous les certificats dans le magasin suivant"
5. Cliquez sur "Parcourir" et sélectionnez "Autorités de certification racines de confiance"

---

## 🚀 Production (Let's Encrypt)

### Prérequis

- Un nom de domaine (ex: `api.example.com`)
- Le domaine pointe vers votre serveur (DNS configuré)
- Port 80 et 443 ouverts
- Certbot installé

### Installation de Certbot

**Ubuntu/Debian :**

```bash
sudo apt update
sudo apt install certbot
```

**CentOS/RHEL :**

```bash
sudo yum install certbot
```

### Générer les certificats Let's Encrypt

#### Option 1 : Standalone (serveur arrêté)

```bash
# Arrêter votre API temporairement
sudo systemctl stop test-api  # ou pm2 stop server

# Générer les certificats
sudo certbot certonly --standalone \
  -d api.example.com \
  --email votre-email@example.com \
  --agree-tos \
  --no-eff-email

# Redémarrer votre API
sudo systemctl start test-api
```

#### Option 2 : Webroot (serveur en cours d'exécution)

```bash
# Créer un dossier pour la vérification
sudo mkdir -p /var/www/certbot

# Générer les certificats
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d api.example.com \
  --email votre-email@example.com \
  --agree-tos \
  --no-eff-email
```

### 📁 Emplacement des certificats Let's Encrypt

Les certificats sont générés dans : `/etc/letsencrypt/live/api.example.com/`

- `privkey.pem` - Clé privée
- `fullchain.pem` - Certificat + chaîne CA
- `chain.pem` - Chaîne CA (optionnel)

### ⚙️ Configuration .env pour Production

```env
# SSL/TLS Configuration (Production - Let's Encrypt)
SSL_KEY_PATH=/etc/letsencrypt/live/api.example.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/api.example.com/fullchain.pem
# SSL_CA_PATH=/etc/letsencrypt/live/api.example.com/chain.pem  # Optionnel

# Origines autorisées (adaptez à votre domaine)
ALLOWED_ORIGINS=https://app.example.com,https://api.example.com

# Mode production
NODE_ENV=production
```

### 🔄 Renouvellement automatique

Let's Encrypt expire après 90 jours. Configurez le renouvellement automatique :

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Ajouter un cron job pour renouvellement automatique
sudo crontab -e

# Ajouter cette ligne (renouvellement tous les jours à 3h du matin)
0 3 * * * certbot renew --quiet --post-hook "systemctl restart test-api"
```

### 🔐 Permissions pour Node.js

Si vous exécutez Node.js en tant qu'utilisateur non-root, vous devez donner accès aux certificats :

```bash
# Créer un groupe ssl-cert
sudo groupadd ssl-cert

# Ajouter votre utilisateur au groupe
sudo usermod -aG ssl-cert $USER

# Donner les permissions au groupe
sudo chgrp -R ssl-cert /etc/letsencrypt
sudo chmod -R g+rx /etc/letsencrypt
```

Ou copiez les certificats dans votre projet :

```bash
# Créer le dossier ssl
mkdir -p /home/votre-user/api/ssl

# Copier les certificats
sudo cp /etc/letsencrypt/live/api.example.com/privkey.pem /home/votre-user/api/ssl/
sudo cp /etc/letsencrypt/live/api.example.com/fullchain.pem /home/votre-user/api/ssl/

# Changer le propriétaire
sudo chown votre-user:votre-user /home/votre-user/api/ssl/*

# Modifier .env
SSL_KEY_PATH=/home/votre-user/api/ssl/privkey.pem
SSL_CERT_PATH=/home/votre-user/api/ssl/fullchain.pem
```

---

## ⚙️ Configuration

### Variables d'environnement (.env)

```env
# ============================================================================
# SSL/TLS CONFIGURATION
# ============================================================================
# Laissez vide pour HTTP, remplissez pour HTTPS

# Chemin vers la clé privée
SSL_KEY_PATH=./ssl/server.key

# Chemin vers le certificat
SSL_CERT_PATH=./ssl/server.cert

# Chemin vers la chaîne CA (optionnel, pour certificats intermédiaires)
# SSL_CA_PATH=./ssl/ca-bundle.crt

# ============================================================================
# ORIGINES AUTORISÉES (adaptez selon votre protocole)
# ============================================================================
# Pour HTTPS, utilisez https://
ALLOWED_ORIGINS=https://localhost:3000,https://app.example.com

# ============================================================================
# AUTRES CONFIGURATIONS
# ============================================================================
PORT=3000
NODE_ENV=production
HOST=127.0.0.1  # Gardez localhost si derrière un reverse proxy
```

### Structure du code (déjà implémentée)

Votre code détecte automatiquement les certificats :

```javascript
// Votre code vérifie automatiquement les certificats
if (SSL_KEY_PATH && SSL_CERT_PATH && 
    fs.existsSync(SSL_KEY_PATH) && 
    fs.existsSync(SSL_CERT_PATH)) {
  // Crée un serveur HTTPS
  httpServer = https.createServer(options, app);
} else {
  // Crée un serveur HTTP
  httpServer = http.createServer(app);
}
```

---

## ✅ Vérification

### 1. Vérifier que le serveur utilise HTTPS

```bash
# Démarrer le serveur
node server.js

# Vous devriez voir :
# 🔒 HTTPS server configured
# ✅ Server running on HTTPS://127.0.0.1:3000
```

### 2. Tester avec curl

```bash
# Développement (ignorer la vérification du certificat auto-signé)
curl -k https://localhost:3000/health

# Production
curl https://api.example.com/health
```

### 3. Tester avec votre navigateur

Ouvrez `https://localhost:3000` ou `https://api.example.com`

### 4. Tester avec Postman

- Créez une requête GET vers `https://localhost:3000/health`
- Pour les certificats auto-signés : Settings → "SSL certificate verification" → OFF

### 5. Vérifier le certificat

```bash
# Afficher les détails du certificat
openssl x509 -in ssl/server.cert -text -noout

# Vérifier la date d'expiration
openssl x509 -in ssl/server.cert -noout -enddate

# Tester la connexion SSL
openssl s_client -connect localhost:3000 -servername localhost
```

---

## 🔧 Dépannage

### Erreur : "ENOENT: no such file or directory"

**Problème :** Les chemins des certificats sont incorrects.

**Solution :**

```bash
# Vérifier que les fichiers existent
ls -la ssl/

# Utiliser des chemins absolus dans .env
SSL_KEY_PATH=/chemin/absolu/vers/ssl/server.key
SSL_CERT_PATH=/chemin/absolu/vers/ssl/server.cert
```

### Erreur : "EACCES: permission denied"

**Problème :** Pas de permission pour lire les certificats.

**Solution :**

```bash
# Vérifier les permissions
ls -la ssl/

# Donner les permissions appropriées
chmod 600 ssl/server.key
chmod 644 ssl/server.cert

# Ou changer le propriétaire
sudo chown $USER:$USER ssl/*
```

### Le navigateur affiche "Connexion non sécurisée"

**Problème :** Certificat auto-signé en développement.

**Solution :**
- Cliquez sur "Avancé" puis "Continuer vers localhost"
- Ou ajoutez le certificat aux autorités de confiance (voir ci-dessus)

### Socket.IO ne se connecte pas en HTTPS

**Problème :** Le client utilise HTTP au lieu de HTTPS.

**Solution :**

```javascript
// Client Socket.IO - utiliser https://
const socket = io('https://localhost:3000', {
  transports: ['websocket', 'polling'],
  secure: true,  // Important pour HTTPS
  rejectUnauthorized: false  // Seulement pour dev avec certificats auto-signés
});
```

### Erreur : "unable to get local issuer certificate"

**Problème :** Chaîne de certificats incomplète.

**Solution :**

```bash
# Utiliser fullchain.pem avec Let's Encrypt
SSL_CERT_PATH=/etc/letsencrypt/live/api.example.com/fullchain.pem

# Ou ajouter le CA explicitement
SSL_CA_PATH=/etc/letsencrypt/live/api.example.com/chain.pem
```

---

## 🔄 Architecture avec Reverse Proxy (Recommandé pour Production)

### Option 1 : Nginx comme terminaison SSL

Au lieu de gérer SSL dans Node.js, utilisez Nginx :

```nginx
# /etc/nginx/sites-available/api
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirection HTTP → HTTPS
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}
```

**Avantages :**
- Performance optimale
- Gestion centralisée des certificats
- Renouvellement simplifié
- Node.js reste en HTTP en interne

---

## 📚 Ressources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Node.js HTTPS Module](https://nodejs.org/api/https.html)
- [Socket.IO with SSL](https://socket.io/docs/v4/server-options/#https)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)

---

## 🎯 Résumé rapide

### Développement (5 minutes)

```bash
# 1. Générer les certificats
./generate-ssl-certs.sh

# 2. Ajouter dans .env
echo "SSL_KEY_PATH=./ssl/server.key" >> .env
echo "SSL_CERT_PATH=./ssl/server.cert" >> .env
echo "ALLOWED_ORIGINS=https://localhost:3000" >> .env

# 3. Démarrer
node server.js

# 4. Ouvrir https://localhost:3000
```

### Production avec Let's Encrypt

```bash
# 1. Obtenir les certificats
sudo certbot certonly --standalone -d api.example.com

# 2. Configurer .env
SSL_KEY_PATH=/etc/letsencrypt/live/api.example.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/api.example.com/fullchain.pem
NODE_ENV=production

# 3. Configurer le renouvellement automatique
sudo crontab -e
# 0 3 * * * certbot renew --quiet --post-hook "systemctl restart test-api"

# 4. Redémarrer
sudo systemctl restart test-api
```

---

**✅ Votre API est maintenant sécurisée avec HTTPS !**
