# Realtime Messaging API (Express + Socket.IO)

API de messagerie en temps réel pour la communication entre deux téléphones Android.

## 🚀 Installation rapide

### Installation automatique

```bash
# Télécharger et exécuter le script d'installation
curl -fsSL https://raw.githubusercontent.com/nelliau/Test_api-proxmox/main/install.sh | bash
```

### Installation manuelle

```bash
git clone https://github.com/nelliau/Test_api-proxmox.git
cd Test_api-proxmox
chmod +x install.sh
./install.sh
```

## Configuration

1. Copier le fichier d'environnement:
```bash
cp .env.example .env
npm install
npm start
```

2. Modifier `.env` avec vos paramètres de base de données:
```bash
PORT=3000
DB_HOST=votre-serveur-db
DB_USER=votre-utilisateur
DB_PASSWORD=votre-mot-de-passe
DB_NAME=votre-base-de-donnees
```

## Démarrage

### Option A: Démarrage manuel
```bash
npm start
```

### Option B: Service systemd (démarrage automatique)
```bash
./install-service.sh
sudo systemctl start test-api
sudo systemctl enable test-api
```

## Endpoints REST

- **Health check**: `GET /` → `{ "status": "ok" }`
- **Liste des messages**: `GET /messages?limit=50`
- **Créer un message**: `POST /messages` avec `{ senderId, receiverId, content }`

## Socket.IO

Événements:
* **Entrant**: `message` avec `{ senderId, receiverId, content }`
* **Sortant**: `message` avec l'objet sauvegardé `{ id, senderId, receiverId, content, createdAt }`

## Gestion du service

```bash
# Démarrer
sudo systemctl start test-api

# Arrêter
sudo systemctl stop test-api

# Redémarrer
sudo systemctl restart test-api

# Statut
sudo systemctl status test-api

# Logs en temps réel
sudo journalctl -u test-api -f
```

## Structure de la base de données

L'API utilise la table `message` avec les colonnes suivantes:
- `id` (INTEGER, auto-increment)
- `sender_id` (INTEGER)
- `receiver_id` (INTEGER)
- `content` (TEXT)
- `created_at` (DATETIME)
