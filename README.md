# Realtime Messaging API (Express + Socket.IO + MySQL)

API de messagerie en temps réel pour la communication entre deux téléphones Android.

## 🚀 Installation rapide sur un nouveau serveur

### Installation automatique en une commande

```bash
# Télécharger et exécuter le script d'installation
curl -fsSL https://raw.githubusercontent.com/nelliau/test_api2/main/install.sh | bash
```

### Installation manuelle

```bash
git clone https://github.com/nelliau/test_api2.git
cd test_api2
chmod +x install.sh
./install.sh
```

Le script installe automatiquement tous les prérequis (Docker, Node.js, etc.) et configure l'API.

📖 **Pour plus de détails, consultez [DEPLOY.md](DEPLOY.md)**

---

## Démarrage rapide (installation manuelle)

### 1) Base de données via Docker (MySQL + phpMyAdmin)

Prépare un MySQL initialisé avec ton dump et accessible via phpMyAdmin.

Commandes:

```bash
docker compose up -d
```

Accès phpMyAdmin: http://localhost:8080

- Serveur: `mysql`
- Utilisateur: `root`
- Mot de passe: `rootpassword`

La base `Dashkey_test` est créée et contient:
- tables de ton dump (`user`, `message`, etc.)
- table supplémentaire `messages` utilisée par Socket.IO pour la persistance simple

### 2) API Node.js

```bash
cp .env.example .env
npm install
npm start
```

Variables `.env` par défaut (pour Docker):

```
PORT=3000
DB_HOST=mysql
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=Dashkey_test
```

Endpoint de santé: `GET /` -> `{ "status": "ok" }`

Socket.IO:
- événement entrant: `message` avec `{ sender, content }`
- diffusion sortante: `message` avec l'objet sauvegardé `{ id, sender, content, timestamp }`

### 3) Notes de compatibilité

- Le dump d'origine utilise la table `message` avec `sender_id/receiver_id`. L'API temps réel simple utilise une table indépendante `messages` (champ `sender` en texte) pour se concentrer sur l'échange en temps réel sans gestion d'utilisateurs.
- Tu peux faire évoluer le modèle Sequelize pour s'appuyer sur la table `message` et gérer des utilisateurs si besoin.