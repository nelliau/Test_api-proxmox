#!/bin/bash
# Script de vérification de la configuration Proxmox

echo "🔍 VÉRIFICATION DE LA CONFIGURATION server.js"
echo "=============================================="
echo ""

cd /root/Test_api-proxmox

echo "1️⃣ Vérification du nom de la table :"
echo "   Doit être : tableName: 'friends'"
grep -A 5 "Define FriendRequest" server.js | grep "tableName"
echo ""

echo "2️⃣ Vérification des colonnes :"
echo "   Doit contenir : field: 'sender_id' et field: 'receiver_id'"
grep "field: 'sender_id'" server.js && echo "   ✅ sender_id trouvé" || echo "   ❌ sender_id MANQUANT"
grep "field: 'receiver_id'" server.js && echo "   ✅ receiver_id trouvé" || echo "   ❌ receiver_id MANQUANT"
echo ""

echo "3️⃣ Vérification du status :"
echo "   Doit contenir : 'declined'"
grep "ENUM.*declined" server.js && echo "   ✅ 'declined' trouvé" || echo "   ❌ 'declined' MANQUANT (utilise 'rejected' ?)"
echo ""

echo "4️⃣ Vérification des associations :"
grep "FriendRequest.belongsTo" server.js
echo ""

echo "5️⃣ Recherche d'anciennes références (ne devrait rien retourner) :"
REQUESTER_COUNT=$(grep -c "requester_id" server.js 2>/dev/null || echo 0)
REJECTED_COUNT=$(grep -c "'rejected'" server.js 2>/dev/null || echo 0)

if [ "$REQUESTER_COUNT" -gt 0 ]; then
    echo "   ❌ Trouvé $REQUESTER_COUNT occurrences de 'requester_id' (devrait être 'sender_id')"
    grep -n "requester_id" server.js
else
    echo "   ✅ Aucune référence à 'requester_id'"
fi

if [ "$REJECTED_COUNT" -gt 0 ]; then
    echo "   ❌ Trouvé $REJECTED_COUNT occurrences de 'rejected' (devrait être 'declined')"
    grep -n "'rejected'" server.js
else
    echo "   ✅ Aucune référence à 'rejected'"
fi

echo ""
echo "=============================================="
echo "6️⃣ Vérification de la table en base de données :"
echo ""

mysql -h 192.168.105.3 -P 3306 -u API -p'G7!k9#vR2qX$u8LmZ4tPf3Y' Dashkey_test -e "
SELECT 
    'Table friends existe' AS Status,
    COUNT(*) AS 'Nombre de lignes'
FROM friends;
" 2>/dev/null || echo "❌ Impossible de se connecter à la base de données"

echo ""
echo "✅ Vérification terminée !"
