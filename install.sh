#!/bin/bash

###############################################################################
# Script d'installation automatique pour Test_api-proxmox
# Déploie l'API de messagerie en temps réel sur un nouveau serveur Proxmox
###############################################################################

# Ne pas arrêter en cas d'erreur pour certaines commandes
set -o pipefail

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration par défaut
GITHUB_REPO="https://github.com/nelliau/Test_api-proxmox.git"
INSTALL_DIR="/home/$(whoami)/Test_api-proxmox"
PORT_DEFAULT=3000

# Variables
PORT=${PORT_DEFAULT}
SKIP_DEPS=false

###############################################################################
# Fonctions utilitaires
###############################################################################

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

###############################################################################
# Vérification des prérequis
###############################################################################

check_prerequisites() {
    print_header "Vérification des prérequis"
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        print_warning "Node.js n'est pas installé"
        echo "Installation de Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        print_success "Node.js installé"
    else
        NODE_VERSION=$(node --version)
        print_success "Node.js est installé ($NODE_VERSION)"
    fi
    
    # Vérifier npm
    if ! command -v npm &> /dev/null; then
        print_error "npm n'est pas installé"
        exit 1
    else
        NPM_VERSION=$(npm --version)
        print_success "npm est installé ($NPM_VERSION)"
    fi
    
    # Vérifier Git
    if ! command -v git &> /dev/null; then
        print_warning "Git n'est pas installé"
        echo "Installation de Git..."
        sudo apt-get update
        sudo apt-get install -y git
        print_success "Git installé"
    else
        print_success "Git est installé"
    fi
}

###############################################################################
# Installation depuis GitHub
###############################################################################

install_from_github() {
    print_header "Installation depuis GitHub"
    
    # Demander le token GitHub si nécessaire
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -n "Token GitHub (optionnel, appuyez sur Entrée pour ignorer): "
        read GITHUB_TOKEN
    fi
    
    # Construire l'URL avec token si fourni
    if [ -n "$GITHUB_TOKEN" ]; then
        GITHUB_URL=$(echo $GITHUB_REPO | sed "s|https://github.com/|https://${GITHUB_TOKEN}@github.com/|")
    else
        GITHUB_URL=$GITHUB_REPO
    fi
    
    # Cloner ou mettre à jour le repository
    if [ -d "$INSTALL_DIR" ]; then
        print_info "Le répertoire existe déjà, mise à jour..."
        cd "$INSTALL_DIR"
        git pull || print_warning "Impossible de mettre à jour, utilisation de la version existante"
    else
        print_info "Clonage du repository..."
        git clone "$GITHUB_URL" "$INSTALL_DIR" || {
            print_error "Échec du clonage. Vérifiez votre connexion et le token GitHub."
            exit 1
        }
        cd "$INSTALL_DIR"
    fi
    
    print_success "Repository cloné/mis à jour dans $INSTALL_DIR"
}

###############################################################################
# Configuration
###############################################################################

configure_environment() {
    print_header "Configuration de l'environnement"
    
    cd "$INSTALL_DIR"
    
    # Demander le port
    echo -n "Port pour l'API (défaut: $PORT_DEFAULT): "
    read PORT_INPUT
    if [ -n "$PORT_INPUT" ]; then
        PORT=$PORT_INPUT
    fi
    
    # Demander les informations de la base de données externe
    echo ""
    print_info "Configuration de la base de données externe:"
    echo -n "Host de la base de données: "
    read DB_HOST
    echo -n "Utilisateur de la base de données: "
    read DB_USER
    echo -n "Mot de passe de la base de données: "
    read -s DB_PASSWORD
    echo ""
    echo -n "Nom de la base de données: "
    read DB_NAME
    
    # Créer le fichier .env
    print_info "Création du fichier .env..."
    cat > .env <<ENVEOF
PORT=$PORT
DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
ENVEOF
    
    print_success "Configuration terminée"
    print_info "Port: $PORT"
    print_info "Base de données: $DB_HOST/$DB_NAME"
}

###############################################################################
# Installation des dépendances
###############################################################################

install_dependencies() {
    print_header "Installation des dépendances Node.js"
    
    cd "$INSTALL_DIR"
    
    if [ "$SKIP_DEPS" = false ]; then
        print_info "Installation des packages npm..."
        npm install
        print_success "Dépendances installées"
    else
        print_warning "Installation des dépendances ignorée"
    fi
}

###############################################################################
# Installation du service systemd
###############################################################################

install_systemd_service() {
    print_header "Installation du service systemd"
    
    cd "$INSTALL_DIR"
    
    # Mettre à jour le fichier service avec le bon utilisateur et chemin
    CURRENT_USER=$(whoami)
    CURRENT_DIR="$INSTALL_DIR"
    
    if [ -f "test-api.service" ]; then
        print_info "Configuration du service systemd..."
        sed -i "s|User=.*|User=$CURRENT_USER|" test-api.service
        sed -i "s|WorkingDirectory=.*|WorkingDirectory=$CURRENT_DIR|" test-api.service
        sed -i "s|ExecStart=.*|ExecStart=/usr/bin/node $CURRENT_DIR/server.js|" test-api.service
        sed -i "s|EnvironmentFile=.*|EnvironmentFile=$CURRENT_DIR/.env|" test-api.service
    fi
    
    # Installer le service
    if [ -f "install-service.sh" ]; then
        chmod +x install-service.sh
        ./install-service.sh
    else
        print_info "Installation manuelle du service..."
        sudo cp test-api.service /etc/systemd/system/test-api.service
        sudo systemctl daemon-reload
        sudo systemctl enable test-api.service
    fi
    
    print_success "Service systemd installé"
}

###############################################################################
# Démarrage de l'API
###############################################################################

start_api() {
    print_header "Démarrage de l'API"
    
    cd "$INSTALL_DIR"
    
    # Démarrer le service
    print_info "Démarrage du service..."
    sudo systemctl start test-api
    
    # Attendre un peu
    sleep 3
    
    # Vérifier le statut
    if sudo systemctl is-active --quiet test-api; then
        print_success "API démarrée avec succès"
    else
        print_error "L'API n'a pas démarré correctement"
        print_info "Vérifiez les logs avec: sudo journalctl -u test-api -n 50"
        exit 1
    fi
}

###############################################################################
# Tests de vérification
###############################################################################

run_tests() {
    print_header "Tests de vérification"
    
    cd "$INSTALL_DIR"
    
    # Test 1: Vérifier que l'API répond
    print_info "Test de l'endpoint de santé..."
    if curl -s http://localhost:$PORT > /dev/null; then
        print_success "API accessible sur http://localhost:$PORT"
    else
        print_warning "L'API ne répond pas encore, attente..."
        sleep 5
        if curl -s http://localhost:$PORT > /dev/null; then
            print_success "API accessible"
        else
            print_error "L'API ne répond pas"
        fi
    fi
    
    # Afficher les informations de connexion
    print_header "Informations de connexion"
    echo ""
    print_info "API HTTP: http://localhost:$PORT"
    print_info "API WebSocket: ws://localhost:$PORT"
    echo ""
    print_info "Pour voir les logs: sudo journalctl -u test-api -f"
    echo ""
}

###############################################################################
# Fonction principale
###############################################################################

main() {
    print_header "Installation de Test_api-proxmox"
    
    # Afficher les informations
    echo "Ce script va installer l'API de messagerie en temps réel"
    echo "Repository: $GITHUB_REPO"
    echo "Répertoire d'installation: $INSTALL_DIR"
    echo ""
    echo -n "Continuer? (o/N): "
    read CONFIRM
    if [ "$CONFIRM" != "o" ] && [ "$CONFIRM" != "O" ]; then
        print_info "Installation annulée"
        exit 0
    fi
    
    # Exécuter les étapes
    check_prerequisites
    install_from_github
    configure_environment
    install_dependencies
    install_systemd_service
    start_api
    run_tests
    
    print_header "Installation terminée avec succès! 🎉"
    echo ""
    print_success "L'API est maintenant en cours d'exécution"
    echo ""
    print_info "Commandes utiles:"
    echo "  - Démarrer: sudo systemctl start test-api"
    echo "  - Arrêter: sudo systemctl stop test-api"
    echo "  - Statut: sudo systemctl status test-api"
    echo "  - Logs: sudo journalctl -u test-api -f"
    echo ""
}

# Exécuter le script principal
main "$@"
