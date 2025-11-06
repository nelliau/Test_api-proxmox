#!/bin/bash
# Script pour installer l'API en tant que service systemd

SERVICE_FILE="/home/soc-admin/Test_api-proxmox/test-api.service"
SYSTEMD_SERVICE="/etc/systemd/system/test-api.service"

echo "=========================================="
echo "  Installation du service API WebSocket"
echo "=========================================="
echo ""

# Vérifier que le fichier service existe
if [ ! -f "$SERVICE_FILE" ]; then
    echo "❌ Fichier service non trouvé: $SERVICE_FILE"
    exit 1
fi

# Copier le service
echo "📝 Copie du service systemd..."
sudo cp "$SERVICE_FILE" "$SYSTEMD_SERVICE"

# Recharger systemd
echo "🔄 Rechargement de systemd..."
sudo systemctl daemon-reload

# Activer le service
echo "✅ Activation du service..."
sudo systemctl enable test-api.service

echo ""
echo "✅ Service installé avec succès!"
echo ""
echo "📌 Commandes utiles:"
echo ""
echo "   Démarrer l'API:"
echo "     sudo systemctl start test-api"
echo ""
echo "   Arrêter l'API:"
echo "     sudo systemctl stop test-api"
echo ""
echo "   Voir le statut:"
echo "     sudo systemctl status test-api"
echo ""
echo "   Voir les logs en temps réel:"
echo "     sudo journalctl -u test-api -f"
echo ""
echo "   Redémarrer l'API:"
echo "     sudo systemctl restart test-api"
echo ""

