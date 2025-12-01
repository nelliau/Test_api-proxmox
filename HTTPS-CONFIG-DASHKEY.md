# 🔒 Configuration HTTPS pour dashkey.fr

## 📋 Vos certificats existants

Vous avez déjà vos certificats SSL sur votre VM :

- **Clé privée** : `/etc/ssl/private/API.Dashkey.key`
- **Certificat** : `/home/API.Dashkey.Sign.crt`
- **CA (Chaîne)** : `/home/CA_DASHKEY.crt`

---

## ⚙️ Configuration .env

Sur votre VM, créez ou modifiez le fichier `.env` :

```env
# ============================================================================
# SERVER CONFIGURATION
# ============================================================================
PORT=3000
HOST=127.0.0.1
NODE_ENV=production
DOMAIN=dashkey.fr

# ============================================================================
# SSL/TLS CONFIGURATION (HTTPS) - Certificats Dashkey
# ============================================================================
SSL_KEY_PATH=/etc/ssl/private/API.Dashkey.key
SSL_CERT_PATH=/home/API.Dashkey.Sign.crt
SSL_CA_PATH=/home/CA_DASHKEY.crt

# ============================================================================
# CORS CONFIGURATION
# ============================================================================
# Ajustez selon vos domaines/sous-domaines
ALLOWED_ORIGINS=https://dashkey.fr,https://www.dashkey.fr,https://api.dashkey.fr

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
JWT_SECRET=votre-cle-secrete-minimum-32-caracteres
JWT_EXPIRES_IN=7d

# ============================================================================
# SECURITY
# ============================================================================
# Si derrière un reverse proxy (Nginx/Apache), mettez 1
TRUST_PROXY=1
```

---

## 🔍 Vérifications sur votre VM

### 1. Vérifier que les certificats existent

```bash
# Se connecter à votre VM en SSH
ssh user@votre-vm

# Vérifier la clé privée (nécessite sudo)
sudo ls -la /etc/ssl/private/API.Dashkey.key

# Vérifier les certificats
ls -la /home/API.Dashkey.Sign.crt
ls -la /home/CA_DASHKEY.crt
```

### 2. Vérifier les permissions

```bash
# La clé privée doit être accessible
sudo chmod 640 /etc/ssl/private/API.Dashkey.key
sudo chgrp ubuntu /etc/ssl/private/API.Dashkey.key  # ou votre utilisateur

# Les certificats doivent être lisibles
chmod 644 /home/API.Dashkey.Sign.crt
chmod 644 /home/CA_DASHKEY.crt
```

### 3. Vérifier le contenu des certificats

```bash
# Afficher les infos du certificat
openssl x509 -in /home/API.Dashkey.Sign.crt -text -noout | grep -E "Subject:|Issuer:|Not|DNS:"

# Vérifier la date d'expiration
openssl x509 -in /home/API.Dashkey.Sign.crt -noout -enddate

# Vérifier que la clé privée correspond au certificat
# Les deux commandes doivent donner le même hash
openssl x509 -noout -modulus -in /home/API.Dashkey.Sign.crt | openssl md5
sudo openssl rsa -noout -modulus -in /etc/ssl/private/API.Dashkey.key | openssl md5
```

---

## 🚀 Démarrer le serveur HTTPS

### Option 1 : Démarrage direct

```bash
# Aller dans le dossier de votre API
cd /chemin/vers/votre/api

# Démarrer avec Node.js
node server.js
```

Vous devriez voir :

```
🔒 HTTPS server configured
 - SSL Key: /etc/ssl/private/API.Dashkey.key
 - SSL Cert: /home/API.Dashkey.Sign.crt
 - SSL CA: /home/CA_DASHKEY.crt
✅ Server running on HTTPS://127.0.0.1:3000 (internal only)
```

### Option 2 : Avec PM2 (recommandé)

```bash
# Installer PM2 si pas déjà fait
npm install -g pm2

# Démarrer l'application
pm2 start server.js --name dashkey-api

# Voir les logs
pm2 logs dashkey-api

# Redémarrer
pm2 restart dashkey-api

# Arrêter
pm2 stop dashkey-api

# Auto-démarrage au boot
pm2 startup
pm2 save
```

### Option 3 : Avec systemd (service)

Votre fichier `test-api.service` existant :

```bash
# Redémarrer le service
sudo systemctl restart test-api

# Voir les logs
sudo journalctl -u test-api -f

# Vérifier le statut
sudo systemctl status test-api
```

---

## ⚠️ Résolution de problème : Permission denied

Si vous obtenez `EACCES: permission denied` pour `/etc/ssl/private/API.Dashkey.key` :

### Solution 1 : Donner accès à votre utilisateur

```bash
# Créer un groupe ssl-cert si n'existe pas
sudo groupadd ssl-cert 2>/dev/null || true

# Ajouter votre utilisateur au groupe
sudo usermod -aG ssl-cert ubuntu  # ou votre utilisateur

# Changer le groupe de la clé
sudo chgrp ssl-cert /etc/ssl/private/API.Dashkey.key

# Donner les permissions de lecture au groupe
sudo chmod 640 /etc/ssl/private/API.Dashkey.key

# Se déconnecter et reconnecter pour appliquer le groupe
exit
# Puis reconnectez-vous en SSH
```

### Solution 2 : Copier la clé dans un emplacement accessible

```bash
# Créer un dossier ssl dans votre projet
mkdir -p /chemin/vers/votre/api/ssl

# Copier les certificats (nécessite sudo)
sudo cp /etc/ssl/private/API.Dashkey.key /chemin/vers/votre/api/ssl/
sudo cp /home/API.Dashkey.Sign.crt /chemin/vers/votre/api/ssl/
sudo cp /home/CA_DASHKEY.crt /chemin/vers/votre/api/ssl/

# Changer le propriétaire
sudo chown ubuntu:ubuntu /chemin/vers/votre/api/ssl/*

# Permissions appropriées
chmod 600 /chemin/vers/votre/api/ssl/API.Dashkey.key
chmod 644 /chemin/vers/votre/api/ssl/API.Dashkey.Sign.crt
chmod 644 /chemin/vers/votre/api/ssl/CA_DASHKEY.crt

# Modifier le .env pour utiliser ces nouveaux chemins
SSL_KEY_PATH=./ssl/API.Dashkey.key
SSL_CERT_PATH=./ssl/API.Dashkey.Sign.crt
SSL_CA_PATH=./ssl/CA_DASHKEY.crt
```

### Solution 3 : Lancer avec sudo (NON RECOMMANDÉ)

```bash
# Seulement en dernier recours
sudo node server.js

# Ou avec PM2
sudo pm2 start server.js --name dashkey-api
```

---

## 🧪 Tester la connexion HTTPS

### 1. Test local sur la VM

```bash
# Test simple (si sur la VM)
curl -k https://localhost:3000/health

# Vérifier la connexion SSL
openssl s_client -connect localhost:3000 -servername dashkey.fr
```

### 2. Test depuis l'extérieur

⚠️ **Important** : Votre API écoute sur `127.0.0.1:3000` (localhost uniquement).

Pour être accessible de l'extérieur, vous **DEVEZ** utiliser un reverse proxy (Nginx/Apache).

---

## 🔧 Configuration Reverse Proxy (Nginx) - RECOMMANDÉ

Votre API écoute en interne sur `127.0.0.1:3000` (HTTPS).
Nginx doit faire le relais depuis l'extérieur.

### Configuration Nginx

```nginx
# /etc/nginx/sites-available/dashkey-api

upstream dashkey_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTPS (Port 443)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.dashkey.fr;

    # Certificats SSL (même certificats que pour Node.js)
    ssl_certificate /home/API.Dashkey.Sign.crt;
    ssl_certificate_key /etc/ssl/private/API.Dashkey.key;
    ssl_trusted_certificate /home/CA_DASHKEY.crt;

    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Logs
    access_log /var/log/nginx/dashkey-api-access.log;
    error_log /var/log/nginx/dashkey-api-error.log;

    # Proxy vers Node.js (en HTTPS aussi)
    location / {
        proxy_pass https://dashkey_api;
        proxy_http_version 1.1;
        
        # Headers pour Socket.IO
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Headers standard
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Important : ne pas mettre en cache les websockets
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Redirection HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.dashkey.fr;
    
    return 301 https://$server_name$request_uri;
}
```

### Activer la configuration Nginx

```bash
# Créer un lien symbolique
sudo ln -s /etc/nginx/sites-available/dashkey-api /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

---

## 📊 Architecture finale

```
Internet (HTTPS)
    ↓
[Nginx :443 - HTTPS]
    ↓
[Node.js :3000 - HTTPS en interne sur 127.0.0.1]
    ↓
[MySQL]
```

**Avantages** :
- Nginx gère les connexions externes (optimisé)
- Node.js en HTTPS en interne (sécurisé)
- Certificats partagés entre Nginx et Node.js
- Performance maximale

---

## ✅ Checklist finale

- [ ] Certificats présents sur la VM
- [ ] Permissions correctes (clé privée accessible à l'utilisateur)
- [ ] `.env` configuré avec les bons chemins
- [ ] Variable `ALLOWED_ORIGINS` mise à jour avec `https://`
- [ ] Serveur Node.js démarre sans erreur
- [ ] Message "HTTPS server configured" visible dans les logs
- [ ] Test `curl -k https://localhost:3000/health` fonctionne
- [ ] Nginx configuré pour faire le reverse proxy
- [ ] DNS pointe vers votre VM
- [ ] Accessible depuis l'extérieur : `https://api.dashkey.fr/health`

---

## 🔍 Commandes de diagnostic

```bash
# Vérifier que Node.js écoute sur le port 3000
sudo netstat -tlnp | grep 3000
# ou
sudo ss -tlnp | grep 3000

# Vérifier les logs Node.js
pm2 logs dashkey-api
# ou
sudo journalctl -u test-api -f

# Tester la connexion SSL locale
openssl s_client -connect localhost:3000 -servername dashkey.fr < /dev/null

# Tester depuis l'extérieur
curl -v https://api.dashkey.fr/health
```

---

## 📝 Notes importantes

1. **Chemins des certificats** :
   - Votre certificat CA est dans `/home/CA_DASHKEY.crt` (inhabituel)
   - Assurez-vous que c'est bien le bon emplacement
   - Généralement on les met dans `/etc/ssl/certs/`

2. **Permissions** :
   - La clé privée dans `/etc/ssl/private/` nécessite des permissions spéciales
   - Solutions : ajouter l'utilisateur au groupe, ou copier la clé

3. **Reverse Proxy** :
   - Avec `HOST=127.0.0.1`, votre API n'est accessible QUE depuis la VM
   - Nginx est OBLIGATOIRE pour exposer l'API à l'extérieur

4. **CORS** :
   - N'oubliez pas de mettre `https://` dans `ALLOWED_ORIGINS`
   - Listez tous vos domaines/sous-domaines

---

Besoin d'aide ? Vérifiez les logs et testez étape par étape ! 🚀
