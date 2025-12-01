#!/bin/bash

echo "🔍 Diagnostic de connexion API Dashkey"
echo "========================================"
echo ""

# Test de connexion à la base de données
echo "1️⃣  Test de connexion MySQL (192.168.105.3:3306)..."
if command -v mysql &> /dev/null; then
    timeout 5 mysql -h 192.168.105.3 -P 3306 -u API -p'G7!k9#vR2qX$u8LmZ4tPf3Y' -e "SELECT 1;" 2>&1 | head -5
    if [ $? -eq 0 ]; then
        echo "✅ Connexion MySQL OK"
    else
        echo "❌ Erreur de connexion MySQL"
    fi
else
    echo "⚠️  Client MySQL non installé, test avec telnet..."
    timeout 3 bash -c "echo > /dev/tcp/192.168.105.3/3306" 2>&1 && echo "✅ Port MySQL accessible" || echo "❌ Port MySQL non accessible"
fi
echo ""

# Test de port
echo "2️⃣  Vérification des ports..."
echo "Port 3000 (API) :"
sudo ss -tlnp | grep :3000 || echo "❌ Port 3000 non ouvert"
echo ""
echo "Port 30443 (Proxy) :"
sudo ss -tlnp | grep :30443 || echo "❌ Port 30443 non ouvert"
echo ""

# Test de connectivité réseau
echo "3️⃣  Test de connectivité réseau..."
ping -c 2 192.168.105.3 2>&1 | tail -3
echo ""

# Vérifier les interfaces réseau
echo "4️⃣  Interfaces réseau :"
ip addr show | grep -E "inet |^[0-9]:" | grep -v "127.0.0.1"
echo ""

# Logs récents
echo "5️⃣  Derniers logs du serveur (si PM2) :"
if command -v pm2 &> /dev/null; then
    pm2 logs --lines 20 --nostream 2>/dev/null || echo "Pas de logs PM2"
else
    echo "PM2 non installé"
fi
echo ""

echo "6️⃣  Vérifier le fichier .env :"
if [ -f .env ]; then
    echo "HOST actuel :"
    grep "^HOST=" .env || echo "HOST non défini (par défaut: 127.0.0.1)"
    echo ""
    echo "TRUST_PROXY :"
    grep "^TRUST_PROXY=" .env || echo "TRUST_PROXY non défini (par défaut: 0)"
else
    echo "❌ Fichier .env introuvable"
fi
