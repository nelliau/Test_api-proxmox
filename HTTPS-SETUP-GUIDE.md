# 🔒 GUIDE COMPLET: Passer votre API en HTTPS

Votre `server.js` supporte déjà HTTPS! Il vous suffit de configurer les certificats SSL.

---

## 📋 TABLE DES MATIÈRES

1. [Option 1: Certificats auto-signés (développement/test)](#option-1-certificats-auto-signés)
2. [Option 2: Let's Encrypt (production gratuite)](#option-2-lets-encrypt-production)
3. [Option 3: Reverse Proxy Nginx (recommandé production)](#option-3-reverse-proxy-nginx)
4. [Option 4: Cloudflare (le plus simple)](#option-4-cloudflare)

---

## ✅ OPTION 1: Certificats auto-signés (DÉVELOPPEMENT SEULEMENT)

**Avantages**: Rapide, gratuit, aucun domaine requis  
**Inconvénients**: Navigateur affichera "Non sécurisé", uniquement pour tests

### Étape 1: Générer les certificats

```bash
# Créer le dossier pour les certificats
mkdir -p /workspace/ssl

# Générer la clé privée et le certificat (valide 365 jours)
openssl req -x509 -newkey rsa:4096 -keyout /workspace/ssl/key.pem -out /workspace/ssl/cert.pem -days 365 -nodes -subj "/C=FR/ST=IDF/L=Paris/O=MonEntreprise/CN=localhost"

# Vérifier les fichiers créés
ls -lh /workspace/ssl/
```

### Étape 2: Configurer le .env

Ajoutez ces lignes à votre `.env`:

```bash
# SSL/TLS Configuration (HTTPS)
SSL_KEY_PATH=/workspace/ssl/key.pem
SSL_CERT_PATH=/workspace/ssl/cert.pem
PORT=3443
```

### Étape 3: Démarrer le serveur

```bash
npm start
```

Vous verrez:
```
✅ HTTPS server configured
✅ Server listening on port 3443
```

### Étape 4: Tester

```bash
# Test avec curl (ignore l'erreur de certificat auto-signé)
curl -k https://localhost:3443/

# Depuis votre navigateur
# https://localhost:3443
# (Cliquez sur "Avancé" → "Continuer quand même")
```

---

## 🌟 OPTION 2: Let's Encrypt (PRODUCTION - GRATUIT)

**Avantages**: Certificat valide, gratuit, auto-renouvelable  
**Inconvénients**: Nécessite un nom de domaine et port 80/443 publics

### Prérequis
- Nom de domaine (ex: `api.monsite.com`)
- Serveur avec IP publique
- Ports 80 et 443 ouverts

### Étape 1: Installer Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot -y

# CentOS/RHEL
sudo yum install certbot -y
```

### Étape 2: Obtenir le certificat

**Option A: Standalone (si port 80 libre)**
```bash
# Arrêter temporairement votre serveur Node.js
sudo certbot certonly --standalone -d api.monsite.com -d www.api.monsite.com

# Les certificats seront dans:
# /etc/letsencrypt/live/api.monsite.com/
```

**Option B: Webroot (si serveur web déjà actif)**
```bash
sudo certbot certonly --webroot -w /var/www/html -d api.monsite.com
```

### Étape 3: Configurer les permissions

```bash
# Donner accès à l'utilisateur Node.js
sudo chmod 755 /etc/letsencrypt/live
sudo chmod 755 /etc/letsencrypt/archive
```

### Étape 4: Configurer le .env

```bash
# SSL/TLS Configuration (Let's Encrypt)
SSL_KEY_PATH=/etc/letsencrypt/live/api.monsite.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/api.monsite.com/fullchain.pem
SSL_CA_PATH=/etc/letsencrypt/live/api.monsite.com/chain.pem
PORT=3443
```

### Étape 5: Auto-renouvellement

Let's Encrypt expire après 90 jours. Configurez le renouvellement automatique:

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Ajouter un cron job (s'exécute tous les jours à 2h du matin)
sudo crontab -e
```

Ajoutez cette ligne:
```
0 2 * * * certbot renew --quiet --post-hook "systemctl restart votre-api-service"
```

### Étape 6: Créer un service systemd

Créez `/etc/systemd/system/api-node.service`:

```ini
[Unit]
Description=Node.js Realtime Messaging API
After=network.target mysql.service

[Service]
Type=simple
User=votre-utilisateur
WorkingDirectory=/workspace
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /workspace/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activez le service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable api-node
sudo systemctl start api-node
sudo systemctl status api-node
```

### Étape 7: Tester

```bash
# Test HTTPS
curl https://api.monsite.com:3443/

# Vérifier le certificat
openssl s_client -connect api.monsite.com:3443 -servername api.monsite.com
```

---

## 🚀 OPTION 3: Reverse Proxy Nginx (RECOMMANDÉ PRODUCTION)

**Avantages**: Meilleure performance, gestion SSL centralisée, protection DDoS  
**Inconvénients**: Configuration plus complexe

Cette option permet à Nginx de gérer HTTPS et rediriger vers votre API Node.js en HTTP.

### Architecture
```
Internet (HTTPS:443) → Nginx → Node.js (HTTP:3000)
```

### Étape 1: Installer Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

### Étape 2: Obtenir certificat Let's Encrypt

```bash
sudo certbot --nginx -d api.monsite.com
```

### Étape 3: Configurer Nginx

Créez `/etc/nginx/sites-available/api-node`:

```nginx
# Redirection HTTP → HTTPS
server {
    listen 80;
    server_name api.monsite.com;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name api.monsite.com;

    # Certificats SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.monsite.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.monsite.com/privkey.pem;
    
    # Protocoles SSL modernes
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS (Force HTTPS pendant 1 an)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Sécurité supplémentaire
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Taille max des uploads
    client_max_body_size 10M;

    # Logs
    access_log /var/log/nginx/api-access.log;
    error_log /var/log/nginx/api-error.log;

    # Reverse proxy vers Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # Headers nécessaires
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache
        proxy_cache_bypass $http_upgrade;
    }

    # Support Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Timeouts longs pour WebSocket
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

### Étape 4: Activer la configuration

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/api-node /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### Étape 5: Configurer votre .env

```bash
# Plus besoin de SSL dans Node.js (Nginx gère)
PORT=3000
# Supprimez les lignes SSL_KEY_PATH, SSL_CERT_PATH
```

### Étape 6: Démarrer votre API

```bash
npm start
```

### Étape 7: Tester

```bash
# Test depuis l'extérieur
curl https://api.monsite.com/

# Test Socket.IO
curl https://api.monsite.com/socket.io/
```

---

## ☁️ OPTION 4: Cloudflare (LE PLUS SIMPLE)

**Avantages**: Configuration instantanée, CDN gratuit, protection DDoS, certificat SSL gratuit  
**Inconvénients**: Trafic passe par Cloudflare

### Étape 1: Créer un compte Cloudflare

1. Allez sur https://cloudflare.com
2. Créez un compte gratuit
3. Ajoutez votre domaine (ex: `monsite.com`)

### Étape 2: Configurer les DNS

Dans le panneau Cloudflare DNS:
```
Type: A
Name: api
Content: [IP de votre serveur]
Proxy: ✅ Activé (nuage orange)
```

### Étape 3: Activer le SSL

1. Dans Cloudflare: **SSL/TLS** → **Overview**
2. Choisissez **Full** ou **Full (strict)**

**Modes disponibles:**
- **Flexible**: Cloudflare↔Client (HTTPS), Cloudflare↔Serveur (HTTP)
- **Full**: HTTPS partout mais certificat auto-signé OK côté serveur
- **Full (strict)**: HTTPS partout avec certificat valide côté serveur

### Étape 4: Certificat Origin (recommandé)

1. **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Téléchargez `certificate.pem` et `private-key.pem`
3. Placez-les sur votre serveur:

```bash
mkdir -p /workspace/ssl
# Coller le contenu dans ces fichiers
nano /workspace/ssl/cloudflare-cert.pem
nano /workspace/ssl/cloudflare-key.pem
```

### Étape 5: Configurer le .env

```bash
# SSL/TLS Configuration (Cloudflare Origin)
SSL_KEY_PATH=/workspace/ssl/cloudflare-key.pem
SSL_CERT_PATH=/workspace/ssl/cloudflare-cert.pem
PORT=3443
```

### Étape 6: Firewall (optionnel mais recommandé)

Autorisez uniquement les IPs Cloudflare:

```bash
# Télécharger les IPs Cloudflare
curl https://www.cloudflare.com/ips-v4 > /tmp/cf-ips-v4.txt

# Configurer UFW (Ubuntu Firewall)
sudo ufw allow from 173.245.48.0/20 to any port 3443
sudo ufw allow from 103.21.244.0/22 to any port 3443
# ... (ajouter toutes les IPs Cloudflare)
```

### Avantages supplémentaires Cloudflare:
- ✅ Cache CDN (API plus rapide mondialement)
- ✅ Protection DDoS automatique
- ✅ Firewall WAF gratuit
- ✅ Analytics
- ✅ Certificat SSL valide sans configuration

---

## 🔧 MODIFICATION DU .ENV

Mettez à jour votre `.env` selon l'option choisie:

### Pour certificats auto-signés ou Let's Encrypt:
```bash
# Ajoutez ces lignes
SSL_KEY_PATH=/chemin/vers/privkey.pem
SSL_CERT_PATH=/chemin/vers/fullchain.pem
SSL_CA_PATH=/chemin/vers/chain.pem  # Optionnel
PORT=3443  # Port HTTPS standard alternatif (443 nécessite root)
```

### Pour Nginx reverse proxy:
```bash
# Gardez votre configuration actuelle
PORT=3000
# Pas besoin de variables SSL (Nginx gère)
```

---

## 📝 SCRIPT DE GÉNÉRATION RAPIDE

Créez un fichier `generate-ssl.sh`:

```bash
#!/bin/bash

echo "🔒 Générateur de certificats SSL auto-signés"
echo "=============================================="

# Créer le dossier
mkdir -p ./ssl

# Générer les certificats
openssl req -x509 -newkey rsa:4096 \
  -keyout ./ssl/key.pem \
  -out ./ssl/cert.pem \
  -days 365 \
  -nodes \
  -subj "/C=FR/ST=IDF/L=Paris/O=MonAPI/CN=localhost"

echo ""
echo "✅ Certificats générés dans ./ssl/"
echo ""
echo "📝 Ajoutez à votre .env:"
echo "SSL_KEY_PATH=$(pwd)/ssl/key.pem"
echo "SSL_CERT_PATH=$(pwd)/ssl/cert.pem"
echo "PORT=3443"
echo ""
echo "🚀 Démarrez avec: npm start"
```

Rendez-le exécutable:
```bash
chmod +x generate-ssl.sh
./generate-ssl.sh
```

---

## 🧪 TESTER VOTRE HTTPS

### Test 1: Vérifier le serveur démarre

```bash
npm start
```

Vous devriez voir:
```
✅ HTTPS server configured
✅ Server listening on port 3443
```

### Test 2: Test avec curl

```bash
# Avec certificat auto-signé (ignore l'erreur)
curl -k https://localhost:3443/

# Avec certificat valide
curl https://api.monsite.com:3443/
```

### Test 3: Vérifier le certificat

```bash
openssl s_client -connect localhost:3443 -servername localhost
```

### Test 4: Test depuis le navigateur

```
https://localhost:3443
```

### Test 5: Analyser la sécurité SSL

```bash
# Installer testssl
git clone https://github.com/drwetter/testssl.sh.git
cd testssl.sh
./testssl.sh https://api.monsite.com:3443
```

Ou en ligne: https://www.ssllabs.com/ssltest/

---

## 🔥 TROUBLESHOOTING

### Erreur: "EACCES: permission denied"

```bash
# Solution 1: Utiliser un port > 1024
PORT=3443  # au lieu de 443

# Solution 2: Donner les permissions à Node (pas recommandé)
sudo setcap 'cap_net_bind_service=+ep' $(which node)

# Solution 3: Utiliser Nginx reverse proxy (recommandé)
```

### Erreur: "Error: ENOENT: no such file or directory"

```bash
# Vérifier les chemins dans .env
ls -la /workspace/ssl/
echo $SSL_KEY_PATH
```

### Erreur: "self signed certificate"

C'est normal pour les certificats auto-signés. Options:
1. Utilisez `-k` avec curl: `curl -k https://localhost:3443`
2. Acceptez l'exception dans le navigateur
3. Utilisez Let's Encrypt pour production

### Socket.IO ne fonctionne pas

Vérifiez le CORS dans server.js:
```javascript
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['https://monsite.com', 'https://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

---

## 📊 COMPARAISON DES OPTIONS

| Critère | Auto-signé | Let's Encrypt | Nginx | Cloudflare |
|---------|-----------|---------------|-------|------------|
| **Difficulté** | ⭐ Facile | ⭐⭐ Moyen | ⭐⭐⭐ Avancé | ⭐ Facile |
| **Coût** | Gratuit | Gratuit | Gratuit | Gratuit |
| **Temps setup** | 2 min | 15 min | 30 min | 5 min |
| **Validité certificat** | ❌ Non reconnu | ✅ Valide | ✅ Valide | ✅ Valide |
| **Production** | ❌ Non | ✅ Oui | ✅ Oui | ✅ Oui |
| **Performance** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Sécurité** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **CDN** | ❌ | ❌ | ❌ | ✅ |
| **Protection DDoS** | ❌ | ❌ | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 RECOMMANDATION

**Développement local**: Option 1 (Certificats auto-signés)  
**Production petit budget**: Option 2 (Let's Encrypt)  
**Production professionnelle**: Option 3 (Nginx + Let's Encrypt)  
**Production simplifiée**: Option 4 (Cloudflare)

---

## 🔗 RESSOURCES UTILES

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Cloudflare SSL Guide](https://developers.cloudflare.com/ssl/)
- [Node.js HTTPS Documentation](https://nodejs.org/api/https.html)
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)

---

**Votre `server.js` est déjà prêt pour HTTPS! Il suffit de configurer les certificats. 🚀**
