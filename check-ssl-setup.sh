#!/bin/bash

# ============================================================================
# Script de vérification de la configuration SSL pour Dashkey
# ============================================================================

set -e

echo "🔍 Vérification de la configuration SSL pour Dashkey..."
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
check_file() {
    local file=$1
    local name=$2
    
    if [ -f "$file" ]; then
        if [ -r "$file" ]; then
            echo -e "${GREEN}✅ $name trouvé et accessible${NC}"
            ls -lh "$file"
            return 0
        else
            echo -e "${YELLOW}⚠️  $name trouvé mais non accessible (permissions)${NC}"
            ls -lh "$file" 2>/dev/null || echo "   Nécessite sudo pour voir les détails"
            return 1
        fi
    else
        echo -e "${RED}❌ $name introuvable à : $file${NC}"
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  VÉRIFICATION DES FICHIERS CERTIFICATS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Chemins des certificats Dashkey
KEY_PATH="/etc/ssl/private/API.Dashkey.key"
CERT_PATH="/home/API.Dashkey.Sign.crt"
CA_PATH="/home/CA_DASHKEY.crt"

check_file "$KEY_PATH" "Clé privée" || KEY_ACCESSIBLE=false
echo ""
check_file "$CERT_PATH" "Certificat" || CERT_ACCESSIBLE=false
echo ""
check_file "$CA_PATH" "Certificat CA" || CA_ACCESSIBLE=false
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  VÉRIFICATION DES PERMISSIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier les permissions de la clé privée
echo "🔐 Permissions de la clé privée :"
if [ -r "$KEY_PATH" ]; then
    stat -c "Permissions: %a (%A) - Propriétaire: %U:%G" "$KEY_PATH"
    echo -e "${GREEN}✅ Clé accessible en lecture${NC}"
else
    echo -e "${YELLOW}⚠️  Clé non accessible, vérification avec sudo...${NC}"
    sudo stat -c "Permissions: %a (%A) - Propriétaire: %U:%G" "$KEY_PATH" 2>/dev/null || echo "Impossible d'accéder même avec sudo"
    echo ""
    echo "💡 Solutions possibles :"
    echo "   1. Ajouter votre utilisateur au groupe :"
    echo "      sudo groupadd ssl-cert"
    echo "      sudo usermod -aG ssl-cert $USER"
    echo "      sudo chgrp ssl-cert $KEY_PATH"
    echo "      sudo chmod 640 $KEY_PATH"
    echo ""
    echo "   2. Ou copier la clé dans votre projet :"
    echo "      mkdir -p ./ssl"
    echo "      sudo cp $KEY_PATH ./ssl/"
    echo "      sudo chown $USER:$USER ./ssl/API.Dashkey.key"
    echo "      chmod 600 ./ssl/API.Dashkey.key"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  INFORMATIONS SUR LE CERTIFICAT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -r "$CERT_PATH" ]; then
    echo "📄 Détails du certificat :"
    openssl x509 -in "$CERT_PATH" -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null || echo "Erreur lors de la lecture du certificat"
    echo ""
    
    # Vérifier la date d'expiration
    EXPIRY=$(openssl x509 -in "$CERT_PATH" -noout -enddate 2>/dev/null | cut -d= -f2)
    echo "📅 Date d'expiration : $EXPIRY"
    
    # Calculer les jours restants
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
    
    if [ $DAYS_LEFT -lt 0 ]; then
        echo -e "${RED}⚠️  CERTIFICAT EXPIRÉ depuis $((- $DAYS_LEFT)) jours !${NC}"
    elif [ $DAYS_LEFT -lt 30 ]; then
        echo -e "${YELLOW}⚠️  Expire dans $DAYS_LEFT jours - Pensez à le renouveler !${NC}"
    else
        echo -e "${GREEN}✅ Valide pour encore $DAYS_LEFT jours${NC}"
    fi
else
    echo -e "${RED}❌ Impossible de lire le certificat${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  VÉRIFICATION DE LA CORRESPONDANCE CLÉ/CERTIFICAT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -r "$CERT_PATH" ] && [ -r "$KEY_PATH" ]; then
    echo "🔍 Comparaison des empreintes..."
    CERT_MD5=$(openssl x509 -noout -modulus -in "$CERT_PATH" 2>/dev/null | openssl md5 | cut -d' ' -f2)
    KEY_MD5=$(openssl rsa -noout -modulus -in "$KEY_PATH" 2>/dev/null | openssl md5 | cut -d' ' -f2)
    
    echo "   Certificat : $CERT_MD5"
    echo "   Clé privée : $KEY_MD5"
    
    if [ "$CERT_MD5" = "$KEY_MD5" ]; then
        echo -e "${GREEN}✅ La clé privée correspond au certificat${NC}"
    else
        echo -e "${RED}❌ ERREUR : La clé privée ne correspond PAS au certificat !${NC}"
    fi
elif [ -r "$CERT_PATH" ]; then
    echo "🔍 Vérification avec sudo pour la clé privée..."
    CERT_MD5=$(openssl x509 -noout -modulus -in "$CERT_PATH" 2>/dev/null | openssl md5 | cut -d' ' -f2)
    KEY_MD5=$(sudo openssl rsa -noout -modulus -in "$KEY_PATH" 2>/dev/null | openssl md5 | cut -d' ' -f2)
    
    echo "   Certificat : $CERT_MD5"
    echo "   Clé privée : $KEY_MD5"
    
    if [ "$CERT_MD5" = "$KEY_MD5" ]; then
        echo -e "${GREEN}✅ La clé privée correspond au certificat${NC}"
    else
        echo -e "${RED}❌ ERREUR : La clé privée ne correspond PAS au certificat !${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Impossible de vérifier (fichiers non accessibles)${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  VÉRIFICATION DU FICHIER .env"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f ".env" ]; then
    echo "📄 Configuration SSL dans .env :"
    grep -E "^SSL_" .env 2>/dev/null || echo "   Aucune variable SSL trouvée"
    echo ""
    grep -E "^ALLOWED_ORIGINS" .env 2>/dev/null || echo "   ALLOWED_ORIGINS non défini"
    echo ""
    
    # Vérifier que les chemins dans .env correspondent aux fichiers
    ENV_KEY=$(grep "^SSL_KEY_PATH" .env 2>/dev/null | cut -d= -f2)
    ENV_CERT=$(grep "^SSL_CERT_PATH" .env 2>/dev/null | cut -d= -f2)
    
    if [ "$ENV_KEY" = "$KEY_PATH" ] && [ "$ENV_CERT" = "$CERT_PATH" ]; then
        echo -e "${GREEN}✅ Les chemins dans .env correspondent aux certificats${NC}"
    else
        echo -e "${YELLOW}⚠️  Les chemins dans .env sont différents :${NC}"
        echo "   .env KEY_PATH  : $ENV_KEY"
        echo "   Attendu        : $KEY_PATH"
        echo "   .env CERT_PATH : $ENV_CERT"
        echo "   Attendu        : $CERT_PATH"
    fi
else
    echo -e "${RED}❌ Fichier .env introuvable${NC}"
    echo ""
    echo "💡 Créez un fichier .env avec :"
    echo "   cp .env.dashkey.example .env"
    echo "   Puis éditez-le avec vos configurations"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  TEST DE CONNEXION (si serveur lancé)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier si le port 3000 est ouvert
if sudo netstat -tlnp 2>/dev/null | grep -q ":3000" || sudo ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "✅ Port 3000 en écoute"
    echo ""
    echo "🧪 Test de connexion HTTPS..."
    timeout 5 curl -k -s https://localhost:3000/health 2>/dev/null && echo -e "${GREEN}✅ Serveur HTTPS répond !${NC}" || echo -e "${YELLOW}⚠️  Pas de réponse (serveur pas encore démarré ou erreur)${NC}"
else
    echo -e "${YELLOW}⚠️  Port 3000 non ouvert - Serveur pas encore démarré${NC}"
    echo "   Lancez le serveur avec : node server.js"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 RÉSUMÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Pour démarrer votre serveur HTTPS :"
echo "  1. Assurez-vous que tous les certificats sont accessibles"
echo "  2. Configurez le fichier .env (voir .env.dashkey.example)"
echo "  3. Lancez : node server.js"
echo "  4. Vérifiez les logs pour voir '🔒 HTTPS server configured'"
echo ""
echo "📖 Documentation complète : HTTPS-CONFIG-DASHKEY.md"
echo ""
