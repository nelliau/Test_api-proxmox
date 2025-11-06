# 🚀 Guide de déploiement rapide

Ce guide vous permet de déployer l'API de messagerie en temps réel sur un nouveau conteneur Proxmox en quelques minutes.

## 📋 Prérequis

- Un conteneur Proxmox avec Ubuntu/Debian
- Accès root ou sudo
- Connexion Internet

## ⚡ Installation en une commande

### Option 1: Installation automatique complète

```bash
# Télécharger et exécuter le script d'installation
curl -fsSL https://raw.githubusercontent.com/nelliau/test_api2/main/install.sh | bash
```

### Option 2: Installation manuelle étape par étape

```bash
# 1. Cloner le repository
git clone https://github.com/nelliau/test_api2.git
cd test_api2

# 2. Rendre le script exécutable
chmod +x install.sh

# 3. Exécuter le script
./install.sh
```

## 🔧 Configuration

Le script vous demandera:

1. **Token GitHub** (optionnel): Si le repository est privé
2. **Port de l'API** (défaut: 30443): Port sur lequel l'API sera accessible
3. **Mot de passe MySQL** (défaut: rootpassword): Mot de passe pour la base de données

## 📦 Ce que le script installe automatiquement

✅ **Docker** et **Docker Compose** (si non installés)  
✅ **Node.js** et **npm** (si non installés)  
✅ **Git** (si non installé)  
✅ Clone le repository depuis GitHub  
✅ Configure l'environnement (.env)  
✅ Installe les dépendances npm  
✅ Démarre MySQL via Docker  
✅ Configure et démarre le service systemd  
✅ Teste que tout fonctionne  

## 🌐 Accès après installation

Une fois l'installation terminée, l'API est accessible sur:

- **API HTTP**: `http://localhost:PORT` (PORT = celui que vous avez choisi)
- **API WebSocket**: `ws://localhost:PORT`
- **phpMyAdmin**: `http://localhost:8080`
  - Serveur: `mysql`
  - Utilisateur: `root`
  - Mot de passe: celui que vous avez configuré

## 🔍 Vérification

### Vérifier que l'API fonctionne

```bash
# Test de santé
curl http://localhost:30443

# Devrait retourner: {"status":"ok"}
```

### Vérifier le statut du service

```bash
sudo systemctl status test-api
```

### Voir les logs

```bash
# Logs en temps réel
sudo journalctl -u test-api -f

# Dernières 50 lignes
sudo journalctl -u test-api -n 50
```

## 🛠️ Gestion du service

```bash
# Démarrer
sudo systemctl start test-api

# Arrêter
sudo systemctl stop test-api

# Redémarrer
sudo systemctl restart test-api

# Statut
sudo systemctl status test-api

# Désactiver le démarrage automatique
sudo systemctl disable test-api
```

## 🗄️ Gestion de MySQL

```bash
# Démarrer MySQL
cd /home/$USER/test_api2
docker compose up -d mysql

# Arrêter MySQL
docker compose stop mysql

# Voir les logs MySQL
docker logs test_api2_mysql

# Accéder à MySQL en ligne de commande
docker exec -it test_api2_mysql mysql -uroot -prootpassword
```

## 🔄 Mise à jour

Pour mettre à jour l'API depuis GitHub:

```bash
cd /home/$USER/test_api2
git pull
npm install
sudo systemctl restart test-api
```

## 🌍 Configuration pour accès externe

Pour rendre l'API accessible depuis l'extérieur:

1. **Configurer le firewall**:
   ```bash
   sudo ufw allow 30443/tcp
   ```

2. **Configurer le port forwarding** sur votre routeur/pfSense:
   - Port externe: 30443
   - IP interne: IP de votre conteneur
   - Port interne: 30443

3. **Modifier le fichier .env** si nécessaire:
   ```bash
   cd /home/$USER/test_api2
   nano .env
   ```

## 📱 Utilisation avec Android

L'API est prête pour être utilisée avec des applications Android:

### Endpoints REST

- `GET /messages?limit=50` - Récupérer les messages
- `POST /messages` - Créer un message
  ```json
  {
    "senderId": 1,
    "receiverId": 2,
    "content": "Message texte"
  }
  ```

### Socket.IO

- **Connexion**: `ws://VOTRE_IP:PORT`
- **Événement entrant**: `message` avec `{ senderId, receiverId, content }`
- **Événement sortant**: `message` avec `{ id, senderId, receiverId, content, createdAt }`

## ❌ Dépannage

### L'API ne démarre pas

```bash
# Vérifier les logs
sudo journalctl -u test-api -n 50

# Vérifier que MySQL est démarré
docker ps | grep mysql

# Tester manuellement
cd /home/$USER/test_api2
node server.js
```

### MySQL ne démarre pas

```bash
# Voir les logs
docker logs test_api2_mysql

# Redémarrer
docker compose restart mysql
```

### Le port est déjà utilisé

```bash
# Trouver quel processus utilise le port
sudo lsof -i :30443

# Changer le port dans .env
cd /home/$USER/test_api2
nano .env
# Modifier PORT=30443 vers un autre port
sudo systemctl restart test-api
```

## 📞 Support

Pour toute question ou problème, consultez:
- Le README principal: `README.md`
- Les logs du service: `sudo journalctl -u test-api -f`
- Les logs Docker: `docker logs test_api2_mysql`

## 🎯 Résumé rapide

```bash
# Installation complète en une commande
curl -fsSL https://raw.githubusercontent.com/nelliau/test_api2/main/install.sh | bash

# Ou manuellement
git clone https://github.com/nelliau/test_api2.git
cd test_api2
chmod +x install.sh
./install.sh
```

C'est tout! 🎉

