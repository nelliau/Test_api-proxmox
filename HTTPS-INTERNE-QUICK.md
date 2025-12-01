# ⚡ HTTPS Interne - Démarrage Rapide

## 🚀 En 3 étapes

### 1. Générer le certificat SSL

```bash
./generate-ssl-cert.sh
```

### 2. Configurer `.env`

```env
HOST=127.0.0.1
PORT=3000
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
```

### 3. Démarrer

```bash
node server.js
```

**Résultat** : `✅ Server running on HTTPS://127.0.0.1:3000 (internal only)`

---

## ✅ Test

```bash
curl -k https://localhost:3000
```

---

## 📖 Documentation complète

Voir `HTTPS-INTERNE.md` pour plus de détails.
