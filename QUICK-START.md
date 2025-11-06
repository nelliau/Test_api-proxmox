# ⚡ Démarrage ultra-rapide

## Installation en 30 secondes

```bash
curl -fsSL https://raw.githubusercontent.com/nelliau/test_api2/main/install.sh | bash
```

C'est tout ! Le script fait tout automatiquement :
- ✅ Installe Docker, Node.js, Git si nécessaire
- ✅ Clone le repository
- ✅ Configure l'environnement
- ✅ Démarre MySQL
- ✅ Installe et démarre l'API

## Après l'installation

L'API est accessible sur :
- **HTTP**: `http://localhost:30443`
- **WebSocket**: `ws://localhost:30443`
- **phpMyAdmin**: `http://localhost:8080`

## Commandes utiles

```bash
# Vérifier le statut
sudo systemctl status test-api

# Voir les logs
sudo journalctl -u test-api -f

# Redémarrer
sudo systemctl restart test-api
```

## Besoin d'aide ?

Consultez [DEPLOY.md](DEPLOY.md) pour le guide complet.

