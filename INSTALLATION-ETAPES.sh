#!/bin/bash

# ============================================================================
# Script d'installation - Serveur Sécurisé
# ============================================================================
# Ce script guide l'installation du serveur sécurisé étape par étape
# NE PAS exécuter directement ! Copier/coller les commandes une par une
# ============================================================================

set -e  # Arrêter en cas d'erreur

echo "════════════════════════════════════════════════════════"
echo "🔒 Installation du Serveur Sécurisé"
echo "════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# ÉTAPE 1: Installer les dépendances NPM
# ============================================================================
echo "📦 Étape 1/7: Installation des dépendances..."
echo ""
echo "Commande à exécuter:"
echo "  npm install helmet express-rate-limit compression"
echo ""
read -p "Appuyer sur Entrée après avoir installé les dépendances..."

# ============================================================================
# ÉTAPE 2: Générer JWT_SECRET
# ============================================================================
echo ""
echo "🔑 Étape 2/7: Génération du JWT_SECRET..."
echo ""
echo "Exécuter cette commande et SAUVEGARDER le résultat:"
echo "  node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
echo ""

# Générer automatiquement
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "JWT_SECRET généré:"
echo "  $JWT_SECRET"
echo ""
echo "⚠️  SAUVEGARDER ce secret ! Il sera nécessaire à l'étape suivante."
echo ""
read -p "Appuyer sur Entrée pour continuer..."

# ============================================================================
# ÉTAPE 3: Créer le fichier .env
# ============================================================================
echo ""
echo "⚙️  Étape 3/7: Création du fichier .env..."
echo ""

if [ -f .env ]; then
    echo "⚠️  Le fichier .env existe déjà."
    read -p "Voulez-vous le remplacer ? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Annulé. Modifiez manuellement .env avec le JWT_SECRET ci-dessus."
        exit 1
    fi
    mv .env .env.backup.$(date +%s)
    echo "✅ Ancien .env sauvegardé"
fi

echo "Création de .env avec vos paramètres..."
echo ""

# Demander les informations DB
read -p "Hôte MySQL (défaut: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Port MySQL (défaut: 3306): " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "Utilisateur MySQL (défaut: root): " DB_USER
DB_USER=${DB_USER:-root}

read -sp "Mot de passe MySQL: " DB_PASSWORD
echo ""

read -p "Nom de la base de données: " DB_NAME

read -p "Port du serveur (défaut: 3000): " PORT
PORT=${PORT:-3000}

read -p "Origines CORS autorisées (défaut: http://localhost:3000): " ALLOWED_ORIGINS
ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-http://localhost:3000}

# Créer .env
cat > .env << EOF
# ============================================================================
# CONFIGURATION SERVEUR
# ============================================================================
NODE_ENV=development
PORT=$PORT

# ============================================================================
# BASE DE DONNÉES MySQL
# ============================================================================
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# ============================================================================
# SÉCURITÉ JWT
# ============================================================================
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# ============================================================================
# REVERSE PROXY (0 si pas de proxy)
# ============================================================================
TRUST_PROXY=0

# ============================================================================
# CORS - Origines autorisées
# ============================================================================
ALLOWED_ORIGINS=$ALLOWED_ORIGINS
EOF

echo ""
echo "✅ Fichier .env créé avec succès"
echo ""
read -p "Appuyer sur Entrée pour continuer..."

# ============================================================================
# ÉTAPE 4: Créer les index MySQL
# ============================================================================
echo ""
echo "🗄️  Étape 4/7: Création des index MySQL..."
echo ""

if [ ! -f create-indexes.sql ]; then
    echo "❌ Erreur: create-indexes.sql introuvable"
    exit 1
fi

echo "⚠️  Avant d'exécuter, vérifier que le nom de la base est correct"
echo "   dans create-indexes.sql (ligne 8)"
echo ""
echo "Commande à exécuter:"
echo "  mysql -u $DB_USER -p < create-indexes.sql"
echo ""
read -p "Appuyer sur Entrée après avoir créé les index..."

# ============================================================================
# ÉTAPE 5: Backup de l'ancien serveur
# ============================================================================
echo ""
echo "💾 Étape 5/7: Backup de l'ancien server.js..."
echo ""

if [ -f server.js ]; then
    BACKUP_FILE="server.js.backup.$(date +%Y%m%d_%H%M%S)"
    cp server.js "$BACKUP_FILE"
    echo "✅ Backup créé: $BACKUP_FILE"
else
    echo "ℹ️  Pas de server.js existant"
fi

echo ""
read -p "Appuyer sur Entrée pour continuer..."

# ============================================================================
# ÉTAPE 6: Activer le nouveau serveur
# ============================================================================
echo ""
echo "🔄 Étape 6/7: Activation du serveur sécurisé..."
echo ""

if [ ! -f server-secured.js ]; then
    echo "❌ Erreur: server-secured.js introuvable"
    exit 1
fi

cp server-secured.js server.js
echo "✅ server-secured.js → server.js"

echo ""
read -p "Appuyer sur Entrée pour continuer..."

# ============================================================================
# ÉTAPE 7: Démarrer le serveur
# ============================================================================
echo ""
echo "🚀 Étape 7/7: Démarrage du serveur..."
echo ""
echo "Commande à exécuter:"
echo "  npm start"
echo ""
echo "Attendu:"
echo "  ════════════════════════════════════════════════════════"
echo "  ✅ Server running on port $PORT"
echo "  📡 Socket.IO ready for real-time notifications"
echo "  💬 Messages via REST API (polling recommended)"
echo "  🔐 JWT authentication enabled"
echo "  🛡️  Security: Helmet + Rate Limiting + CORS"
echo "  ⚡ Optimization: Compression + Connection Pool"
echo "  ════════════════════════════════════════════════════════"
echo ""

echo "════════════════════════════════════════════════════════"
echo "✅ Installation terminée !"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📚 Prochaines étapes:"
echo "  1. Démarrer: npm start"
echo "  2. Tester: Voir QUICK-START-SECURED.md"
echo "  3. Tests complets: Voir TEST-SECURED-SERVER.md"
echo ""
echo "📞 En cas de problème:"
echo "  - Lire README-SECURITE.md"
echo "  - Vérifier .env"
echo "  - Consulter les logs"
echo ""
