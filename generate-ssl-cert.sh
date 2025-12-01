#!/bin/bash

# Script de génération de certificat SSL auto-signé pour le développement
# Usage: ./generate-ssl-cert.sh [domain]

set -e

DOMAIN="${1:-localhost}"
SSL_DIR="./ssl"
KEY_FILE="$SSL_DIR/private.key"
CERT_FILE="$SSL_DIR/certificate.crt"
DAYS_VALID=365

echo "🔒 Génération d'un certificat SSL auto-signé pour: $DOMAIN"
echo ""

# Créer le répertoire ssl s'il n'existe pas
mkdir -p "$SSL_DIR"

# Vérifier si les fichiers existent déjà
if [ -f "$KEY_FILE" ] || [ -f "$CERT_FILE" ]; then
    echo "⚠️  Les fichiers de certificat existent déjà dans $SSL_DIR"
    read -p "Voulez-vous les écraser? (o/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        echo "❌ Annulé"
        exit 1
    fi
    rm -f "$KEY_FILE" "$CERT_FILE"
fi

# Générer la clé privée
echo "📝 Génération de la clé privée..."
openssl genrsa -out "$KEY_FILE" 2048

# Générer le certificat auto-signé
echo "📝 Génération du certificat auto-signé..."
openssl req -new -x509 -key "$KEY_FILE" -out "$CERT_FILE" -days "$DAYS_VALID" \
    -subj "/C=FR/ST=State/L=City/O=Development/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,IP:127.0.0.1,IP:::1"

# Définir les permissions
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo ""
echo "✅ Certificat généré avec succès!"
echo ""
echo "📁 Fichiers créés:"
echo "   - Clé privée: $KEY_FILE"
echo "   - Certificat: $CERT_FILE"
echo ""
echo "📝 Ajoutez ces lignes à votre fichier .env:"
echo "   SSL_KEY_PATH=$KEY_FILE"
echo "   SSL_CERT_PATH=$CERT_FILE"
echo ""
echo "⚠️  Note: Ce certificat est auto-signé et générera un avertissement"
echo "   dans le navigateur. C'est normal pour le développement."
echo ""
