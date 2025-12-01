#!/bin/bash

# Script pour générer un certificat SSL auto-signé pour le développement

set -e

echo "🔐 Génération d'un certificat SSL auto-signé pour le développement"
echo ""

# Créer le répertoire ssl s'il n'existe pas
mkdir -p ssl

# Vérifier si openssl est installé
if ! command -v openssl &> /dev/null; then
    echo "❌ Erreur: openssl n'est pas installé"
    echo "💡 Installez-le avec: sudo apt-get install openssl (Ubuntu/Debian)"
    exit 1
fi

# Demander le nom de domaine (par défaut: localhost)
read -p "Nom de domaine (par défaut: localhost): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

# Demander la durée de validité (par défaut: 365 jours)
read -p "Durée de validité en jours (par défaut: 365): " DAYS
DAYS=${DAYS:-365}

echo ""
echo "📝 Génération du certificat pour: $DOMAIN"
echo "⏱️  Durée de validité: $DAYS jours"
echo ""

# Générer la clé privée et le certificat
openssl req -x509 -newkey rsa:4096 -nodes \
    -keyout ssl/private.key \
    -out ssl/certificate.crt \
    -days "$DAYS" \
    -subj "/C=FR/ST=State/L=City/O=Development/CN=$DOMAIN"

# Sécuriser les permissions
chmod 600 ssl/private.key
chmod 644 ssl/certificate.crt

echo ""
echo "✅ Certificat généré avec succès!"
echo ""
echo "📁 Fichiers créés:"
echo "   - ssl/private.key (clé privée)"
echo "   - ssl/certificate.crt (certificat)"
echo ""
echo "📝 Ajoutez ces lignes à votre fichier .env:"
echo "   SSL_KEY_PATH=./ssl/private.key"
echo "   SSL_CERT_PATH=./ssl/certificate.crt"
echo ""
echo "⚠️  ATTENTION: Ce certificat est auto-signé et ne convient que pour le développement."
echo "   Les navigateurs afficheront un avertissement de sécurité."
echo "   Pour la production, utilisez Let's Encrypt ou un certificat commercial."
echo ""
