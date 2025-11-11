#!/bin/bash

echo "🧪 Script de Test Socket.IO - API-EFRIE"
echo "========================================"
echo ""

# Vérifier qu'on est sur la bonne machine
if [ ! -f .env ]; then
    echo "❌ Fichier .env manquant !"
    echo "Créez-le avec vos vraies données :"
    echo ""
    cat << 'EOF'
PORT=30443
DB_HOST=192.168.105.3
DB_PORT=3306
DB_USER=API
DB_PASSWORD='G7!k9#vR2qX$u8LmZ4tPf3Y'
DB_NAME=Dashkey_test
JWT_SECRET=generer_une_cle_secrete_ici
JWT_EXPIRES_IN=7d
EOF
    exit 1
fi

echo "✅ Fichier .env trouvé"
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé !"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Vérifier les dépendances
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances npm..."
    npm install
    echo ""
fi

echo "✅ Dépendances npm installées"
echo ""

# Vérifier la connexion MySQL
echo "🔍 Test de connexion MySQL..."
timeout 5 bash -c "</dev/tcp/192.168.105.3/3306" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ MySQL est accessible sur 192.168.105.3:3306"
else
    echo "❌ MySQL n'est pas accessible !"
    echo "   Vérifiez que le serveur MySQL est démarré"
    exit 1
fi
echo ""

# Vérifier si le serveur tourne déjà
if lsof -Pi :30443 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Le serveur tourne déjà sur le port 30443"
    echo "   PID: $(lsof -Pi :30443 -sTCP:LISTEN -t)"
    echo ""
    read -p "Voulez-vous le redémarrer ? (o/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        echo "🔄 Arrêt du serveur en cours..."
        kill $(lsof -Pi :30443 -sTCP:LISTEN -t) 2>/dev/null
        sleep 2
    else
        echo "ℹ️  Serveur déjà en cours. Tests avec le serveur existant."
        echo ""
    fi
fi

# Démarrer le serveur en arrière-plan
if ! lsof -Pi :30443 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "🚀 Démarrage du serveur sur le port 30443..."
    nohup node server.js > server.log 2>&1 &
    SERVER_PID=$!
    echo "   PID du serveur: $SERVER_PID"
    
    # Attendre que le serveur démarre
    echo "⏳ Attente du démarrage (5 secondes)..."
    sleep 5
    
    # Vérifier que le serveur a démarré
    if lsof -Pi :30443 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "✅ Serveur démarré avec succès !"
    else
        echo "❌ Le serveur n'a pas démarré correctement"
        echo "   Consultez server.log pour les erreurs :"
        tail -20 server.log
        exit 1
    fi
else
    echo "✅ Serveur déjà en cours d'exécution"
fi
echo ""

# Choisir le type de test
echo "📋 Quel test voulez-vous lancer ?"
echo ""
echo "  1) Test complet (inscription + messages online/offline)"
echo "  2) Test simple (livraison directe uniquement)"
echo "  3) Test manuel (ouvrir le HTML dans le navigateur)"
echo "  4) Voir les logs du serveur"
echo "  5) Arrêter le serveur"
echo ""
read -p "Votre choix (1-5) : " choice

case $choice in
    1)
        echo ""
        echo "🧪 Lancement du test complet..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        API_URL="http://localhost:30443" node test-socketio.js
        ;;
    2)
        echo ""
        echo "🧪 Lancement du test simple..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        API_URL="http://localhost:30443" node test-socketio-simple.js
        ;;
    3)
        echo ""
        echo "🌐 Pour tester dans le navigateur :"
        echo ""
        echo "1. Ouvrez test-socketio.html dans votre navigateur"
        echo "2. Modifiez l'URL dans le fichier si nécessaire :"
        echo "   const API_URL = 'http://localhost:30443';"
        echo ""
        echo "3. Ou testez depuis un autre appareil sur le réseau :"
        echo "   const API_URL = 'http://$(hostname -I | awk '{print $1}'):30443';"
        echo ""
        echo "Appuyez sur Entrée pour continuer..."
        read
        ;;
    4)
        echo ""
        echo "📋 Logs du serveur (Ctrl+C pour quitter) :"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        tail -f server.log
        ;;
    5)
        echo ""
        echo "🛑 Arrêt du serveur..."
        pkill -f "node server.js"
        echo "✅ Serveur arrêté"
        ;;
    *)
        echo "❌ Choix invalide"
        exit 1
        ;;
esac

echo ""
echo "✅ Terminé !"
