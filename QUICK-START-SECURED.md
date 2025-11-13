# 🚀 Quick Start - Serveur Sécurisé

**Temps estimé:** 10 minutes  
**Résultat:** API REST sécurisée et optimisée en HTTP

---

## ⚡ Installation Express (4 étapes)

### 1️⃣ Installer les dépendances

```bash
npm install helmet express-rate-limit compression
```

### 2️⃣ Créer .env

```bash
# Générer JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Créer .env (copier le secret généré)
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=messaging_db
JWT_SECRET=COLLER_LE_SECRET_GENERE_ICI
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000
TRUST_PROXY=0
EOF
```

### 3️⃣ Créer les index MySQL

```bash
# Éditer create-indexes.sql (remplacer nom de DB ligne 8)
nano create-indexes.sql

# Exécuter
mysql -u root -p < create-indexes.sql
```

### 4️⃣ Démarrer le serveur sécurisé

```bash
# Backup de l'ancien
cp server.js server.js.backup

# Activer le nouveau
cp server-secured.js server.js

# Démarrer
npm start
```

**Attendu:**
```
✅ Database connected
✅ Database models synced

════════════════════════════════════════════════════════
✅ Server running on port 3000
📡 Socket.IO ready for real-time notifications
💬 Messages via REST API (polling recommended)
🔐 JWT authentication enabled
🛡️  Security: Helmet + Rate Limiting + CORS
⚡ Optimization: Compression + Connection Pool
════════════════════════════════════════════════════════
```

---

## 🧪 Test Rapide (2 minutes)

### Test 1: Health check

```bash
curl http://localhost:3000
```

**Attendu:**
```json
{
  "status": "ok",
  "message": "Realtime Messaging API",
  "version": "1.0.0",
  "environment": "development"
}
```

✅ Serveur fonctionne !

---

### Test 2: Register + Login

```bash
# Register
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

**Attendu:**
```json
{
  "message": "Utilisateur créé avec succès",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "roles": ["ROLE_USER"],
    "publicKey": null
  }
}
```

**Sauvegarder le token:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Test 3: Endpoint protégé

```bash
curl -X GET http://localhost:3000/me \
  -H "Authorization: Bearer $TOKEN"
```

**Attendu:**
```json
{
  "id": 1,
  "email": "test@example.com",
  "roles": ["ROLE_USER"],
  "publicKey": null
}
```

✅ Authentification fonctionne !

---

### Test 4: Rate Limiting

```bash
# Répéter cette commande 6 fois rapidement
for i in {1..6}; do
  echo "Tentative $i:"
  curl -X POST http://localhost:3000/login \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@test.com","password":"wrong"}'
  echo ""
done
```

**Attendu (tentative 6):**
```json
{
  "error": "too_many_requests",
  "message": "Trop de tentatives de connexion, réessayez dans 15 minutes",
  "retryAfter": 899
}
```

✅ Rate limiting actif !

---

## 🎉 C'est prêt !

Votre serveur est maintenant:
- ✅ Sécurisé (Helmet, Rate Limiting, CORS, Validation)
- ✅ Optimisé (Pool DB, Compression, Error handling)
- ✅ Production-ready (en HTTP)

---

## 📚 Pour aller plus loin

### Tests complets
👉 Voir `TEST-SECURED-SERVER.md` (32 tests)

### Migration détaillée
👉 Voir `MIGRATION-GUIDE.md` (tous les changements)

### Reverse proxy HTTPS
👉 Voir `REVERSE-PROXY-SETUP.md` (Nginx + SSL)

### Rapport de sécurité
👉 Voir `SERVER-SECURITY-AUDIT.md` (audit complet)

---

## ⚠️ Problèmes courants

### Serveur crash au démarrage

**Erreur:** `JWT_SECRET doit être défini`

**Solution:**
```bash
# Générer un secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# L'ajouter dans .env
JWT_SECRET=le_secret_genere
```

---

### CORS bloque les requêtes

**Erreur:** `⚠️  CORS blocked origin: http://...`

**Solution:** Ajouter dans `.env`
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

---

### Rate limiting trop strict

**Solution:** Augmenter les limites dans `server.js` (ligne ~104)
```javascript
const authLimiter = rateLimit({
  max: 10, // Au lieu de 5
  // ...
});
```

---

## 🔥 Commandes utiles

```bash
# Voir les logs en temps réel
npm start 2>&1 | tee server.log

# Tester avec Postman/Insomnia
# Importer: http://localhost:3000 + endpoints du README

# Surveiller les connexions MySQL
watch -n 1 'mysql -u root -p -e "SHOW PROCESSLIST"'

# Vérifier les index
mysql -u root -p -e "USE messaging_db; SHOW INDEX FROM message;"
```

---

**🎯 Prochaine étape:** Configurer le reverse proxy HTTPS (optionnel)
