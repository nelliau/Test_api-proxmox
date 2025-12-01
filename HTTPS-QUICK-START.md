# 🚀 HTTPS - Démarrage Rapide (2 minutes)

## Option 1: Certificats auto-signés (DÉVELOPPEMENT)

### Étape 1: Générer les certificats
```bash
./generate-ssl.sh
```

### Étape 2: Configurer le .env
Ajoutez ces lignes à votre `.env`:
```bash
SSL_KEY_PATH=/workspace/ssl/key.pem
SSL_CERT_PATH=/workspace/ssl/cert.pem
PORT=3443
```

### Étape 3: Démarrer
```bash
npm start
```

### Étape 4: Tester
```bash
curl -k https://localhost:3443/
```

✅ **C'est tout! Votre API tourne maintenant en HTTPS!**

---

## Option 2: Let's Encrypt (PRODUCTION)

### Prérequis
- Un nom de domaine (ex: `api.monsite.com`)
- Ports 80 et 443 ouverts

### Commandes
```bash
# Installer certbot
sudo apt install certbot -y

# Obtenir le certificat
sudo certbot certonly --standalone -d api.monsite.com

# Configurer le .env
SSL_KEY_PATH=/etc/letsencrypt/live/api.monsite.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/api.monsite.com/fullchain.pem
PORT=3443

# Démarrer
npm start
```

---

## Option 3: Nginx + Let's Encrypt (RECOMMANDÉ PRODUCTION)

### Commandes
```bash
# Installer Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Obtenir certificat et configurer Nginx automatiquement
sudo certbot --nginx -d api.monsite.com

# Copier la configuration Nginx depuis HTTPS-SETUP-GUIDE.md
sudo nano /etc/nginx/sites-available/api-node

# Activer
sudo ln -s /etc/nginx/sites-available/api-node /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Démarrer votre API (en HTTP, Nginx gère HTTPS)
PORT=3000 npm start
```

---

## 📖 Documentation complète

Pour plus de détails, consultez: **HTTPS-SETUP-GUIDE.md**

Contient:
- ✅ 4 méthodes différentes (auto-signé, Let's Encrypt, Nginx, Cloudflare)
- ✅ Configuration Nginx complète
- ✅ Troubleshooting
- ✅ Scripts prêts à l'emploi
- ✅ Comparaison des options

---

## ⚠️ Important

**Certificats auto-signés**: Développement uniquement (navigateur affichera "Non sécurisé")  
**Production**: Utilisez Let's Encrypt, Nginx ou Cloudflare

---

## 🔧 Votre server.js est déjà prêt!

Le code HTTPS est déjà implémenté aux lignes 28-46 de `server.js`:

```javascript
if (SSL_KEY_PATH && SSL_CERT_PATH && fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
  httpServer = https.createServer(options, app);
  console.log('✅ HTTPS server configured');
} else {
  httpServer = http.createServer(app);
  console.log('HTTP server configured');
}
```

Il suffit juste de configurer les certificats! 🎉
