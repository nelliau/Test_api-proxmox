#!/bin/bash

echo "🔒 Générateur de certificats SSL auto-signés pour HTTPS"
echo "========================================================="
echo ""

# Créer le dossier SSL
mkdir -p ./ssl

# Générer les certificats auto-signés (valides 1 an)
openssl req -x509 -newkey rsa:4096 \
  -keyout ./ssl/key.pem \
  -out ./ssl/cert.pem \
  -days 365 \
  -nodes \
  -subj "/C=FR/ST=IDF/L=Paris/O=RealtimeMessagingAPI/CN=localhost"

echo ""
echo "✅ Certificats SSL générés avec succès!"
echo ""
echo "📁 Fichiers créés:"
echo "   - $(pwd)/ssl/key.pem (clé privée)"
echo "   - $(pwd)/ssl/cert.pem (certificat)"
echo ""
echo "📝 Configuration .env recommandée:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SSL_KEY_PATH=$(pwd)/ssl/key.pem"
echo "SSL_CERT_PATH=$(pwd)/ssl/cert.pem"
echo "PORT=3443"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Pour démarrer en HTTPS:"
echo "   1. Ajoutez les lignes ci-dessus à votre .env"
echo "   2. npm start"
echo "   3. Testez: curl -k https://localhost:3443/"
echo ""
echo "⚠️  Note: Certificat auto-signé = développement uniquement!"
echo "    Pour la production, utilisez Let's Encrypt (gratuit)."
echo ""
