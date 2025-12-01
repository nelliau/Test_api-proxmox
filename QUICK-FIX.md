# ⚡ CORRECTION RAPIDE - API Dashkey

## 🎯 Problème identifié

Votre API ne peut pas communiquer avec le proxy et la BDD car elle écoute probablement **uniquement sur localhost** (127.0.0.1).

---

## ✅ SOLUTION EN 3 ÉTAPES

### 1️⃣ Modifier le fichier .env

```bash
nano .env
```

**Ajoutez ou modifiez cette ligne :**

```env
HOST=0.0.0.0
```

**Ajoutez aussi :**

```env
TRUST_PROXY=1
```

**Votre .env corrigé devrait ressembler à ça :**

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
DOMAIN=dashkey.fr

SSL_KEY_PATH=/etc/ssl/private/API.Dashkey.key
SSL_CERT_PATH=/home/API.Dashkey.Sign.crt
SSL_CA_PATH=/home/CA_DASHKEY.crt

ALLOWED_ORIGINS=https://dashkey.fr:30443,https://dashkey.fr,https://www.dashkey.fr

DB_HOST=192.168.105.3
DB_PORT=3306
DB_USER=API
DB_PASSWORD='G7!k9#vR2qX$u8LmZ4tPf3Y'
DB_NAME=Dashkey_test

JWT_SECRET='YEZUUKXlcujXfJH9x/8AoEb5BtBfULyjAZdc4cV6wtj9p8A3LMujw9Y+czGvF3vGIvlthfQxe37RBmi6ZsZT3w=='
JWT_EXPIRES_IN=30d

TRUST_PROXY=1
```

### 2️⃣ Redémarrer l'API

```bash
# Avec PM2
pm2 restart dashkey-api

# Ou avec systemd
sudo systemctl restart test-api

# Ou manuellement
# Ctrl+C puis : node server.js
```

### 3️⃣ Vérifier que ça fonctionne

```bash
# Vérifier que l'API écoute sur 0.0.0.0 (et non 127.0.0.1)
sudo ss -tlnp | grep :3000

# Vous devez voir : 0.0.0.0:3000 (pas 127.0.0.1:3000)
```

**Voir les logs :**

```bash
# Avec PM2
pm2 logs dashkey-api

# Vous devez voir :
# ✅ Database connected
# ✅ Server running on HTTPS://0.0.0.0:3000
```

---

## 🧪 Tests

```bash
# Test 1 : API accessible localement
curl -k https://localhost:3000/health

# Test 2 : Connexion BDD
timeout 3 bash -c "echo > /dev/tcp/192.168.105.3/3306" && echo "✅ MySQL OK" || echo "❌ MySQL KO"
```

---

## 📖 Documentation complète

- **FIX-CONNECTION-ISSUES.md** - Guide détaillé de dépannage
- **diagnose-connection.sh** - Script de diagnostic automatique

---

## ❓ Pourquoi HOST=0.0.0.0 ?

| Configuration | Comportement |
|---------------|--------------|
| `HOST=127.0.0.1` | ❌ Écoute uniquement sur localhost - PAS accessible par le proxy |
| `HOST=0.0.0.0` | ✅ Écoute sur toutes les interfaces - Accessible par le proxy |

Avec `HOST=0.0.0.0`, votre API peut recevoir des connexions depuis :
- ✅ localhost (127.0.0.1)
- ✅ L'IP de votre VM (192.168.105.X)
- ✅ Le proxy (qui doit se connecter à l'API)

---

**C'est tout ! Après le redémarrage, votre API devrait fonctionner. 🚀**
