#!/bin/bash

# ============================================================================
# Script de génération de certificats SSL auto-signés (DÉVELOPPEMENT UNIQUEMENT)
# ============================================================================
# ⚠️ NE PAS UTILISER EN PRODUCTION - Utilisez Let's Encrypt pour la production
# ============================================================================

set -e

echo "🔒 Génération de certificats SSL auto-signés pour développement..."
echo ""

# Créer le dossier ssl s'il n'existe pas
mkdir -p ssl

# Définir les variables
DOMAIN="localhost"
DAYS=365
KEY_FILE="ssl/server.key"
CERT_FILE="ssl/server.cert"

# Vérifier si les certificats existent déjà
if [ -f "$KEY_FILE" ] && [ -f "$CERT_FILE" ]; then
    echo "⚠️  Des certificats existent déjà dans le dossier ssl/"
    read -p "Voulez-vous les remplacer ? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Annulé"
        exit 0
    fi
fi

# Générer la clé privée et le certificat auto-signé
echo "📝 Génération de la clé privée et du certificat..."
openssl req -x509 -nodes -days $DAYS \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=FR/ST=IleDeFrance/L=Paris/O=Development/OU=API/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

# Modifier les permissions
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo ""
echo "✅ Certificats SSL générés avec succès !"
echo ""
echo "📁 Fichiers créés :"
echo "   - Clé privée: $KEY_FILE"
echo "   - Certificat: $CERT_FILE"
echo ""
echo "⚙️  Configuration .env nécessaire :"
echo "   SSL_KEY_PATH=./ssl/server.key"
echo "   SSL_CERT_PATH=./ssl/server.cert"
echo ""
echo "⚠️  IMPORTANT - Accepter le certificat dans votre navigateur :"
echo "   1. Ouvrez https://localhost:3000"
echo "   2. Cliquez sur 'Avancé' puis 'Continuer vers localhost'"
echo "   3. Ou ajoutez le certificat aux autorités de confiance de votre système"
echo ""
echo "🔐 Pour ajouter aux autorités de confiance (Linux) :"
echo "   sudo cp $CERT_FILE /usr/local/share/ca-certificates/localhost.crt"
echo "   sudo update-ca-certificates"
echo ""
echo "🍎 Pour macOS :"
echo "   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERT_FILE"
echo ""
