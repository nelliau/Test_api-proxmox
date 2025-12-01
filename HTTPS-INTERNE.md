# 🔒 Configuration HTTPS Interne (Localhost)

Votre API est maintenant configurée pour fonctionner en **HTTPS uniquement en interne** (localhost/127.0.0.1).

---

## 🎯 Qu'est-ce que cela signifie ?

- ✅ **HTTPS activé** : Communication chiffrée
- ✅ **Accès interne uniquement** : Accessible uniquement depuis la machine locale
- ✅ **Sécurité renforcée** : Pas d'exposition sur le réseau externe
- ✅ **Idéal pour** : Développement, tests, ou API backend interne

---

## ⚡ Configuration Rapide

### 1. Générer un certificat SSL auto-signé

```bash
# Utiliser le script automatique
./generate-ssl-cert.sh

# Cela crée :
# - ./ssl/private.key
# - ./ssl/certificate.crt
```

### 2. Configurer `.env`

```env
# Écouter uniquement sur localhost (interne)
HOST=127.0.0.1
PORT=3000

# Certificats SSL pour HTTPS interne
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt

# Environnement
NODE_ENV=development
```

### 3. Démarrer le serveur

```bash
node server.js
```

**Résultat attendu** :
```
🔒 HTTPS server configured
✅ Server running on HTTPS://127.0.0.1:3000 (internal only)
```

---

## 🔍 Vérification

### Test depuis la machine locale

```bash
# Test avec curl (ignore l'avertissement du certificat auto-signé)
curl -k https://127.0.0.1:3000

# Ou avec localhost
curl -k https://localhost:3000

# Test de l'endpoint health
curl -k https://localhost:3000/health
```

### Test depuis un autre ordinateur

```bash
# Depuis une autre machine (devrait échouer)
curl https://VOTRE_IP:3000
# Résultat : Connection refused ou timeout
```

✅ **C'est normal** : L'API n'est accessible que depuis localhost.

---

## 🔧 Options de Configuration

### Écouter uniquement sur localhost (par défaut)

```env
HOST=127.0.0.1
# ou
HOST=localhost
```

**Résultat** : Accessible uniquement depuis la machine locale

### Écouter sur toutes les interfaces (externe)

Si vous voulez exposer l'API sur le réseau (non recommandé sans reverse proxy) :

```env
HOST=0.0.0.0
```

⚠️ **Attention** : Cela expose l'API sur toutes les interfaces réseau.

---

## 🏗️ Architecture Recommandée

Pour une architecture de production avec HTTPS externe :

```
[Internet] 
    ↓
[Nginx/Apache Reverse Proxy] (HTTPS public, port 443)
    ↓ (HTTPS interne, port 3000)
[Votre API Node.js] (127.0.0.1:3000)
```

**Avantages** :
- ✅ HTTPS public géré par le reverse proxy
- ✅ API Node.js en HTTPS interne (sécurisé)
- ✅ API non exposée directement sur Internet
- ✅ Gestion SSL/TLS centralisée

---

## 📝 Exemple de Configuration Complète

### `.env` pour HTTPS interne

```env
# Server - Internal only
HOST=127.0.0.1
PORT=3000
NODE_ENV=development

# SSL - Self-signed certificate for internal use
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=your_database

# JWT
JWT_SECRET=your-very-long-secret-key-here
JWT_EXPIRES_IN=7d

# CORS - Internal origins only
ALLOWED_ORIGINS=https://localhost:3000,http://localhost:3000
```

---

## 🔐 Sécurité

### Avantages de HTTPS interne

1. **Chiffrement** : Communication chiffrée même en local
2. **Isolation** : API non accessible depuis l'extérieur
3. **Protection** : Réduit la surface d'attaque
4. **Conformité** : Certains protocoles nécessitent HTTPS

### Certificat auto-signé

- ⚠️ **Avertissement navigateur** : Normal pour certificat auto-signé
- ✅ **Sécurisé** : Communication toujours chiffrée
- ✅ **Idéal pour** : Développement et usage interne

---

## 🚀 Utilisation avec Reverse Proxy

Si vous utilisez Nginx comme reverse proxy :

### Configuration Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name api.votre-domaine.com;

    # Certificats SSL publics (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.votre-domaine.com/privkey.pem;

    location / {
        # Proxy vers votre API Node.js en HTTPS interne
        proxy_pass https://127.0.0.1:3000;
        
        # Headers pour HTTPS
        proxy_ssl_verify off;  # Ignore le certificat auto-signé
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Résultat** :
- Internet → Nginx (HTTPS public, certificat valide)
- Nginx → API Node.js (HTTPS interne, certificat auto-signé)

---

## 🐛 Dépannage

### Erreur : "EADDRINUSE: address already in use"

```bash
# Trouver le processus utilisant le port
lsof -i :3000

# Tuer le processus
kill -9 <PID>
```

### Erreur : "Cannot find module 'fs'"

Le module `fs` est natif à Node.js. Vérifiez votre version :
```bash
node --version  # Doit être >= 14
```

### Le serveur ne démarre pas en HTTPS

Vérifiez que les chemins des certificats sont corrects :
```bash
ls -la ./ssl/private.key
ls -la ./ssl/certificate.crt
```

### Impossible d'accéder depuis une autre machine

✅ **C'est normal** : L'API écoute uniquement sur 127.0.0.1 (interne).

Pour permettre l'accès externe (non recommandé sans reverse proxy) :
```env
HOST=0.0.0.0
```

---

## 📊 Comparaison

| Configuration | Accès | Sécurité | Usage |
|---------------|-------|----------|-------|
| `HOST=127.0.0.1` + HTTPS | Interne uniquement | ✅ Haute | Développement, API backend |
| `HOST=0.0.0.0` + HTTPS | Externe | ⚠️ Moyenne | Tests réseau local |
| `HOST=127.0.0.1` + HTTP | Interne uniquement | ❌ Faible | Développement uniquement |
| Reverse Proxy + HTTPS interne | Externe via proxy | ✅ Très haute | Production |

---

## ✅ Checklist

- [ ] Certificat SSL généré (`./generate-ssl-cert.sh`)
- [ ] Variables `SSL_KEY_PATH` et `SSL_CERT_PATH` configurées dans `.env`
- [ ] `HOST=127.0.0.1` dans `.env` (interne uniquement)
- [ ] Serveur démarre avec `🔒 HTTPS server configured`
- [ ] Test local réussi : `curl -k https://localhost:3000`
- [ ] Accès externe bloqué (normal)

---

## 📚 Ressources

- [Guide HTTPS complet](./GUIDE-HTTPS.md)
- [Démarrage rapide HTTPS](./HTTPS-QUICK-START.md)
- [Configuration Reverse Proxy](./REVERSE-PROXY-SETUP.md)

---

**Date** : $(date)  
**Configuration** : HTTPS interne (localhost uniquement)
