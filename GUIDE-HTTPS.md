# 🔒 Guide de Configuration HTTPS pour server.js

Ce guide vous explique comment activer HTTPS sur votre API Node.js.

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Option 1 : Certificat Auto-signé (Développement)](#option-1--certificat-auto-signé-développement)
3. [Option 2 : Let's Encrypt (Production)](#option-2--lets-encrypt-production)
4. [Option 3 : Certificat Commercial](#option-3--certificat-commercial)
5. [Configuration du serveur](#configuration-du-serveur)
6. [Vérification](#vérification)
7. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

Votre serveur `server.js` supporte maintenant **HTTPS automatiquement** si vous fournissez des certificats SSL. Sinon, il fonctionne en HTTP.

**Fonctionnement** :
- Si `SSL_KEY_PATH` et `SSL_CERT_PATH` sont définis → **HTTPS activé**
- Sinon → **HTTP** (avec avertissement en production)

---

## 🔧 Option 1 : Certificat Auto-signé (Développement)

### Génération du certificat

```bash
# Créer un répertoire pour les certificats
mkdir -p ssl
cd ssl

# Générer une clé privée
openssl genrsa -out private.key 2048

# Générer un certificat auto-signé (valide 365 jours)
openssl req -new -x509 -key private.key -out certificate.crt -days 365 \
  -subj "/C=FR/ST=State/L=City/O=Organization/CN=localhost"

# Vérifier les permissions (sécurité)
chmod 600 private.key
chmod 644 certificate.crt
```

### Configuration dans `.env`

```env
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
PORT=3000
```

### ⚠️ Note importante

Les certificats auto-signés génèrent un avertissement dans le navigateur. C'est normal pour le développement.

---

## 🌐 Option 2 : Let's Encrypt (Production)

Let's Encrypt fournit des certificats SSL gratuits et valides.

### Prérequis

- Un domaine pointant vers votre serveur
- Port 80 et 443 ouverts
- Accès root/sudo

### Installation de Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot

# Ou via snap (recommandé)
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### Génération du certificat

```bash
# Méthode 1 : Standalone (arrête temporairement votre serveur)
sudo certbot certonly --standalone -d api.votre-domaine.com

# Méthode 2 : Webroot (recommandé si vous avez Nginx)
sudo certbot certonly --webroot -w /var/www/html -d api.votre-domaine.com

# Méthode 3 : DNS Challenge (si vous ne pouvez pas exposer les ports)
sudo certbot certonly --manual --preferred-challenges dns -d api.votre-domaine.com
```

### Fichiers générés

Les certificats sont généralement dans :
```
/etc/letsencrypt/live/api.votre-domaine.com/
├── privkey.pem      → Clé privée
├── fullchain.pem    → Certificat + chaîne
├── cert.pem         → Certificat seul
└── chain.pem        → Chaîne de certificats
```

### Configuration dans `.env`

```env
SSL_KEY_PATH=/etc/letsencrypt/live/api.votre-domaine.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/api.votre-domaine.com/fullchain.pem
PORT=443
NODE_ENV=production
```

### Renouvellement automatique

Let's Encrypt expire après 90 jours. Configurez le renouvellement automatique :

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Ajouter un cron job pour renouvellement automatique
sudo crontab -e

# Ajouter cette ligne (vérifie et renouvelle tous les jours à 3h)
0 3 * * * certbot renew --quiet --deploy-hook "systemctl restart votre-service"
```

---

## 💼 Option 3 : Certificat Commercial

Si vous avez un certificat commercial (DigiCert, GlobalSign, etc.) :

### Format des fichiers

- **Clé privée** : `private.key` ou `server.key`
- **Certificat** : `certificate.crt` ou `server.crt`
- **Chaîne** : `ca_bundle.crt` ou `chain.crt` (optionnel)

### Configuration dans `.env`

```env
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt
SSL_CA_PATH=/path/to/ca_bundle.crt  # Optionnel
PORT=443
```

---

## ⚙️ Configuration du serveur

### 1. Créer/Modifier le fichier `.env`

```bash
cp .env.example .env
nano .env
```

### 2. Ajouter les variables SSL

```env
# Configuration SSL
SSL_KEY_PATH=/chemin/vers/private.key
SSL_CERT_PATH=/chemin/vers/certificate.crt
SSL_CA_PATH=/chemin/vers/ca_bundle.crt  # Optionnel

# Port (443 pour HTTPS, 3000 pour HTTP)
PORT=443

# Environnement
NODE_ENV=production

# CORS - Mettre à jour avec votre domaine HTTPS
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com
```

### 3. Démarrer le serveur

```bash
node server.js
```

Vous devriez voir :
```
🔒 HTTPS server configured
   - SSL Key: /path/to/private.key
   - SSL Cert: /path/to/certificate.crt
✅ Server running on HTTPS://localhost:443
```

---

## ✅ Vérification

### Test local

```bash
# Test avec curl (ignore l'avertissement pour certificat auto-signé)
curl -k https://localhost:3000

# Test avec vérification SSL
curl https://api.votre-domaine.com
```

### Test dans le navigateur

1. Ouvrez `https://localhost:3000` (ou votre domaine)
2. Pour certificat auto-signé : Cliquez sur "Avancé" → "Continuer"
3. Vous devriez voir la réponse JSON de l'API

### Test SSL/TLS en ligne

Pour les certificats de production :
- [SSL Labs](https://www.ssllabs.com/ssltest/) - Test complet
- [SSL Checker](https://www.sslshopper.com/ssl-checker.html) - Vérification rapide

---

## 🔍 Dépannage

### Erreur : "Cannot find module 'fs'"

❌ **Problème** : Module Node.js manquant  
✅ **Solution** : `fs` est un module natif, vérifiez votre version de Node.js (>= 14)

### Erreur : "ENOENT: no such file or directory"

❌ **Problème** : Chemin de certificat incorrect  
✅ **Solution** : Vérifiez que les chemins dans `.env` sont corrects et absolus

```bash
# Vérifier l'existence des fichiers
ls -la /path/to/private.key
ls -la /path/to/certificate.crt
```

### Erreur : "Error: error:0909006C:PEM routines:get_name:no start line"

❌ **Problème** : Format de certificat incorrect  
✅ **Solution** : Vérifiez que les fichiers sont en format PEM

```bash
# Vérifier le format
head -1 private.key
# Devrait afficher : -----BEGIN PRIVATE KEY----- ou -----BEGIN RSA PRIVATE KEY-----

head -1 certificate.crt
# Devrait afficher : -----BEGIN CERTIFICATE-----
```

### Erreur : "Permission denied"

❌ **Problème** : Permissions insuffisantes  
✅ **Solution** : Ajuster les permissions

```bash
# Clé privée : lecture seule pour le propriétaire
chmod 600 private.key

# Certificat : lecture pour tous
chmod 644 certificate.crt

# Si nécessaire, changer le propriétaire
sudo chown $USER:$USER private.key certificate.crt
```

### Le serveur démarre en HTTP au lieu de HTTPS

❌ **Problème** : Variables d'environnement non chargées  
✅ **Solution** : Vérifier le fichier `.env`

```bash
# Vérifier que les variables sont chargées
node -e "require('dotenv').config(); console.log(process.env.SSL_KEY_PATH)"
```

### Socket.IO ne fonctionne pas avec HTTPS

✅ **Solution** : Mettre à jour les origines CORS dans `.env`

```env
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com
```

---

## 🔐 Sécurité des Certificats

### Bonnes pratiques

1. **Permissions** :
   ```bash
   chmod 600 private.key  # Lecture/écriture pour propriétaire uniquement
   chmod 644 certificate.crt  # Lecture pour tous
   ```

2. **Stockage** :
   - Ne jamais commiter les certificats dans Git
   - Utiliser des variables d'environnement
   - Stocker les clés privées de manière sécurisée

3. **Renouvellement** :
   - Configurer le renouvellement automatique pour Let's Encrypt
   - Surveiller les dates d'expiration

4. **Backup** :
   - Sauvegarder les clés privées de manière sécurisée
   - Ne jamais partager les clés privées

---

## 📝 Exemple de Configuration Complète

### `.env` pour développement

```env
PORT=3000
NODE_ENV=development
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
ALLOWED_ORIGINS=https://localhost:3000,http://localhost:3000
```

### `.env` pour production

```env
PORT=443
NODE_ENV=production
SSL_KEY_PATH=/etc/letsencrypt/live/api.votre-domaine.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/api.votre-domaine.com/fullchain.pem
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com
JWT_SECRET=votre-cle-secrete-tres-longue
```

---

## 🚀 Démarrer avec HTTPS

```bash
# 1. Générer les certificats (voir options ci-dessus)
# 2. Configurer .env
# 3. Démarrer le serveur
node server.js

# Vous devriez voir :
# 🔒 HTTPS server configured
# ✅ Server running on HTTPS://localhost:443
```

---

## 📚 Ressources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)

---

**Date de création** : $(date)  
**Dernière mise à jour** : $(date)
