# 🚀 HTTPS - Démarrage Rapide

## ⚡ En 3 étapes

### 1. Générer un certificat (développement)

```bash
# Utiliser le script automatique
./generate-ssl-cert.sh

# Ou manuellement
mkdir -p ssl
openssl genrsa -out ssl/private.key 2048
openssl req -new -x509 -key ssl/private.key -out ssl/certificate.crt -days 365 \
  -subj "/C=FR/ST=State/L=City/O=Dev/CN=localhost"
chmod 600 ssl/private.key
chmod 644 ssl/certificate.crt
```

### 2. Configurer `.env`

```env
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
PORT=3000
```

### 3. Démarrer le serveur

```bash
node server.js
```

Vous verrez : `🔒 HTTPS server configured`

---

## 🌐 Production avec Let's Encrypt

```bash
# Installer Certbot
sudo apt install certbot  # ou snap install certbot

# Générer le certificat
sudo certbot certonly --standalone -d api.votre-domaine.com

# Configurer .env
SSL_KEY_PATH=/etc/letsencrypt/live/api.votre-domaine.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/api.votre-domaine.com/fullchain.pem
PORT=443
```

---

## ✅ Vérification

```bash
# Test local
curl -k https://localhost:3000

# Test production
curl https://api.votre-domaine.com
```

---

📖 **Guide complet** : Voir `GUIDE-HTTPS.md`
