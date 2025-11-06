#!/bin/bash
# Script simple pour pousser vers GitHub

GITHUB_TOKEN="YOUR_GITHUB_TOKEN"

echo "=========================================="
echo "  Push vers GitHub"
echo "=========================================="
echo ""

cd /home/soc-admin/Test_api-proxmox

# Configurer l'URL avec le token
git remote set-url origin https://${GITHUB_TOKEN}@github.com/nelliau/Test_api-proxmox.git

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "server.js" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le répertoire Test_api-proxmox"
    exit 1
fi

# Vérifier l'état Git
echo "📊 État du repository:"
git status --short
echo ""

# Demander confirmation
echo -n "Voulez-vous pousser ces changements vers GitHub? (o/N): "
read CONFIRM
if [ "$CONFIRM" != "o" ] && [ "$CONFIRM" != "O" ]; then
    echo "Annulé."
    exit 0
fi

# Ajouter tous les changements
echo ""
echo "📦 Ajout des fichiers..."
git add .

# Demander le message de commit
echo ""
echo -n "Message de commit (ou Entrée pour message par défaut): "
read COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Mise à jour du projet"
fi

# Créer le commit
echo ""
echo "💾 Création du commit..."
git commit -m "$COMMIT_MSG"

# Push vers GitHub
echo ""
echo "📤 Push vers GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Push réussi!"
else
    echo ""
    echo "❌ Erreur lors du push"
    echo "   Vérifiez votre connexion et réessayez"
    exit 1
fi
