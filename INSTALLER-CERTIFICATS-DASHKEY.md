# 🔒 Installation des Certificats SSL pour dashkey.fr

## 📋 Situation actuelle

Vous avez reçu 3 fichiers de certificats SSL :
- `API.Dashkey.key` - Clé privée
- `API.Dashkey.Sign.crt` - Certificat signé
- `CA_DASHKEY.crt` - Certificat de l'autorité de certification (CA)

## 🎯 Objectif

Installer ces certificats sur votre serveur pour activer HTTPS sur votre API Node.js.

---

## 📁 Étape 1 : Créer la structure de dossiers

```bash
# Créer le dossier ssl dans votre projet
mkdir -p /workspace/ssl

# Donner les bonnes permissions
chmod 700 /workspace/ssl
```

---

## 📤 Étape 2 : Transférer vos certificats sur le serveur

### Option A : Depuis votre ordinateur local (recommandé)

```bash
# Depuis votre machine locale, utilisez SCP pour transférer les fichiers
# Remplacez <user> et <server-ip> par vos informations

scp API.Dashkey.key ubuntu@<server-ip>:/workspace/ssl/
scp API.Dashkey.Sign.crt ubuntu@<server-ip>:/workspace/ssl/
scp CA_DASHKEY.crt ubuntu@<server-ip>:/workspace/ssl/
```

### Option B : Via SFTP (ex: FileZilla, WinSCP)

1. Connectez-vous en SFTP à votre serveur
2. Naviguez vers `/workspace/ssl/`
3. Uploadez les 3 fichiers

### Option C : Copier-coller le contenu (si fichiers texte)

```bash
# Sur le serveur, créez chaque fichier et collez le contenu
nano /workspace/ssl/API.Dashkey.key
# Collez le contenu, puis Ctrl+X, Y, Enter

nano /workspace/ssl/API.Dashkey.Sign.crt
# Collez le contenu, puis Ctrl+X, Y, Enter

nano /workspace/ssl/CA_DASHKEY.crt
# Collez le contenu, puis Ctrl+X, Y, Enter
```

---

## 🔐 Étape 3 : Configurer les permissions de sécurité

```bash
# Se déplacer dans le dossier
cd /workspace/ssl

# Clé privée : lecture seule par le propriétaire uniquement (CRITIQUE)
chmod 600 API.Dashkey.key

# Certificats : lecture pour tous
chmod 644 API.Dashkey.Sign.crt
chmod 644 CA_DASHKEY.crt

# S'assurer que vous êtes le propriétaire
sudo chown ubuntu:ubuntu API.Dashkey.key
sudo chown ubuntu:ubuntu API.Dashkey.Sign.crt
sudo chown ubuntu:ubuntu CA_DASHKEY.crt

# Vérifier les permissions
ls -la
```

Vous devriez voir :
```
-rw------- 1 ubuntu ubuntu  1704 Dec  1 10:00 API.Dashkey.key
-rw-r--r-- 1 ubuntu ubuntu  2048 Dec  1 10:00 API.Dashkey.Sign.crt
-rw-r--r-- 1 ubuntu ubuntu  1834 Dec  1 10:00 CA_DASHKEY.crt
```

---

## ⚙️ Étape 4 : Configurer le fichier .env

```bash
# Éditer votre fichier .env
nano /workspace/.env
```

Ajoutez/modifiez ces lignes :

```env
# ============================================================================
# SERVER CONFIGURATION
# ============================================================================
PORT=3000
HOST=127.0.0.1
NODE_ENV=production
DOMAIN=dashkey.fr

# ============================================================================
# SSL/TLS CONFIGURATION - CERTIFICATS DASHKEY
# ============================================================================
SSL_KEY_PATH=/workspace/ssl/API.Dashkey.key
SSL_CERT_PATH=/workspace/ssl/API.Dashkey.Sign.crt
SSL_CA_PATH=/workspace/ssl/CA_DASHKEY.crt

# ============================================================================
# CORS CONFIGURATION
# ============================================================================
# Adaptez selon vos besoins (domaines autorisés à accéder à votre API)
ALLOWED_ORIGINS=https://dashkey.fr,https://www.dashkey.fr,https://app.dashkey.fr

# ============================================================================
# MYSQL DATABASE CONFIGURATION
# ============================================================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=votre-utilisateur
DB_PASSWORD=votre-mot-de-passe
DB_NAME=Dashkey_test

# ============================================================================
# JWT AUTHENTICATION
# ============================================================================
JWT_SECRET=votre-cle-secrete-minimum-32-caracteres-changez-moi
JWT_EXPIRES_IN=7d

# ============================================================================
# SECURITY
# ============================================================================
TRUST_PROXY=1
```

Sauvegardez avec `Ctrl+X`, puis `Y`, puis `Enter`.

---

## ✅ Étape 5 : Vérifier vos certificats

```bash
# Vérifier que les fichiers existent et sont lisibles
ls -la /workspace/ssl/

# Vérifier le contenu du certificat
openssl x509 -in /workspace/ssl/API.Dashkey.Sign.crt -text -noout | grep -E "Subject:|Issuer:|Not After"

# Vérifier la date d'expiration
openssl x509 -in /workspace/ssl/API.Dashkey.Sign.crt -noout -enddate

# Vérifier que la clé privée et le certificat correspondent
openssl x509 -noout -modulus -in /workspace/ssl/API.Dashkey.Sign.crt | openssl md5
openssl rsa -noout -modulus -in /workspace/ssl/API.Dashkey.key | openssl md5
# Les deux MD5 doivent être identiques !
```

---

## 🚀 Étape 6 : Démarrer le serveur

```bash
# Se déplacer dans le projet
cd /workspace

# Tester le démarrage
node server.js
```

Vous devriez voir :
```
🔒 HTTPS server configured
 - SSL Key: /workspace/ssl/API.Dashkey.key
 - SSL Cert: /workspace/ssl/API.Dashkey.Sign.crt
 - SSL CA: /workspace/ssl/CA_DASHKEY.crt
✅ Server running on HTTPS://127.0.0.1:3000 (internal only)
```

---

## 🔍 Étape 7 : Tester la connexion HTTPS

### Test 1 : Depuis le serveur local

```bash
# Test simple
curl -k https://localhost:3000/health

# Test avec détails SSL
curl -vvI https://localhost:3000/health 2>&1 | grep -E "SSL|TLS|subject|issuer"
```

### Test 2 : Depuis un navigateur

**Important** : Votre API écoute sur `127.0.0.1:3000` (localhost seulement).
Pour y accéder depuis Internet, vous devez configurer un **reverse proxy** (Nginx ou Apache).

---

## 🌐 Étape 8 : Configurer Nginx comme reverse proxy (RECOMMANDÉ)

### Installation de Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

### Configuration Nginx pour dashkey.fr

```bash
# Créer la configuration
sudo nano /etc/nginx/sites-available/dashkey-api
```

Collez cette configuration :

```nginx
# Redirection HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name dashkey.fr www.dashkey.fr api.dashkey.fr;
    
    # Rediriger tout vers HTTPS
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS avec vos certificats
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dashkey.fr www.dashkey.fr api.dashkey.fr;

    # Certificats SSL
    ssl_certificate /workspace/ssl/API.Dashkey.Sign.crt;
    ssl_certificate_key /workspace/ssl/API.Dashkey.key;
    ssl_trusted_certificate /workspace/ssl/CA_DASHKEY.crt;

    # Configuration SSL moderne et sécurisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/dashkey-api-access.log;
    error_log /var/log/nginx/dashkey-api-error.log;

    # Limite de taille des uploads
    client_max_body_size 10M;

    # Proxy vers Node.js (en HTTP en interne)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # Headers pour WebSocket (Socket.IO)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Headers standards
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Activer la configuration

```bash
# Créer un lien symbolique
sudo ln -s /etc/nginx/sites-available/dashkey-api /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Si OK, recharger Nginx
sudo systemctl reload nginx

# Activer le démarrage automatique
sudo systemctl enable nginx
```

### Ajuster le .env pour Nginx

Puisque Nginx gère le SSL, vous pouvez désactiver HTTPS dans Node.js :

```bash
nano /workspace/.env
```

**Option 1** : Node.js en HTTP (Nginx gère le SSL) - **RECOMMANDÉ**

```env
# Commentez les lignes SSL
# SSL_KEY_PATH=/workspace/ssl/API.Dashkey.key
# SSL_CERT_PATH=/workspace/ssl/API.Dashkey.Sign.crt
# SSL_CA_PATH=/workspace/ssl/CA_DASHKEY.crt

# Node.js écoute en HTTP en interne
PORT=3000
HOST=127.0.0.1

# Nginx est le premier proxy
TRUST_PROXY=1
```

**Option 2** : Double SSL (Node.js + Nginx) - Si vous voulez vraiment

```env
# Garder les certificats
SSL_KEY_PATH=/workspace/ssl/API.Dashkey.key
SSL_CERT_PATH=/workspace/ssl/API.Dashkey.Sign.crt
SSL_CA_PATH=/workspace/ssl/CA_DASHKEY.crt

# Et dans Nginx, utiliser proxy_pass https://127.0.0.1:3000;
```

**Je recommande l'Option 1** : plus simple et performant.

---

## 🔥 Étape 9 : Configurer le pare-feu

```bash
# Autoriser HTTP et HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Vérifier
sudo ufw status
```

---

## 🎯 Étape 10 : Test final

```bash
# Test depuis le serveur
curl https://dashkey.fr/health

# Test depuis votre ordinateur
# Ouvrez votre navigateur et allez sur :
https://dashkey.fr
```

---

## 🔧 Dépannage

### Erreur : "ENOENT: no such file or directory"

```bash
# Vérifier que les fichiers existent
ls -la /workspace/ssl/

# Si manquants, retournez à l'Étape 2
```

### Erreur : "EACCES: permission denied"

```bash
# Corriger les permissions
cd /workspace/ssl
chmod 600 API.Dashkey.key
chmod 644 *.crt
sudo chown ubuntu:ubuntu *
```

### Erreur : "key values mismatch" ou "unable to load certificate"

```bash
# Vérifier que la clé et le certificat correspondent
openssl x509 -noout -modulus -in /workspace/ssl/API.Dashkey.Sign.crt | openssl md5
openssl rsa -noout -modulus -in /workspace/ssl/API.Dashkey.key | openssl md5

# Les deux MD5 doivent être identiques !
```

### Le site n'est pas accessible depuis Internet

1. Vérifiez que votre DNS pointe vers l'IP du serveur :
   ```bash
   dig dashkey.fr +short
   nslookup dashkey.fr
   ```

2. Vérifiez que Nginx est démarré :
   ```bash
   sudo systemctl status nginx
   ```

3. Vérifiez que les ports sont ouverts :
   ```bash
   sudo netstat -tulpn | grep -E ':80|:443'
   ```

### Nginx affiche une erreur SSL

```bash
# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/error.log

# Vérifier la configuration
sudo nginx -t
```

---

## 📊 Architecture finale

```
Internet (HTTPS)
      ↓
   dashkey.fr (443)
      ↓
  Nginx (SSL/TLS termination)
      ↓
  HTTP localhost:3000
      ↓
  Node.js API (Express + Socket.IO)
      ↓
  MySQL Database
```

**Avantages** :
- ✅ SSL géré par Nginx (plus performant)
- ✅ Node.js simplifié (pas de gestion SSL)
- ✅ Reverse proxy avec cache possible
- ✅ Certificats centralisés
- ✅ Renouvellement simplifié

---

## 🔄 Renouvellement des certificats

Quand vos certificats expirent, il suffit de :

1. Remplacer les fichiers dans `/workspace/ssl/`
2. Recharger Nginx : `sudo systemctl reload nginx`
3. Pas besoin de redémarrer Node.js !

---

## ✅ Checklist finale

- [ ] Certificats copiés dans `/workspace/ssl/`
- [ ] Permissions correctes (600 pour .key, 644 pour .crt)
- [ ] Fichier `.env` configuré
- [ ] Certificats valides (vérifiés avec openssl)
- [ ] Nginx installé et configuré
- [ ] Pare-feu ouvert (ports 80 et 443)
- [ ] DNS configuré (dashkey.fr → IP serveur)
- [ ] Test HTTPS réussi
- [ ] Socket.IO fonctionne en HTTPS

---

**🎉 Votre API est maintenant sécurisée avec HTTPS !**
