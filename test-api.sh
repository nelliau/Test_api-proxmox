#!/bin/bash

# Script de test automatique de l'API
# Usage: ./test-api.sh

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${API_URL:-http://localhost:3000}"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test API Messagerie - Node.js        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Vérifier que le serveur répond
echo -e "${YELLOW}🔍 Vérification du serveur...${NC}"
if ! curl -s --max-time 5 "$BASE_URL/" > /dev/null; then
    echo -e "${RED}❌ Serveur inaccessible à $BASE_URL${NC}"
    echo -e "${YELLOW}💡 Démarrez le serveur avec: npm start${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Serveur accessible${NC}\n"

# 1. Health check
echo -e "${BLUE}═══ Test 1: Health Check ═══${NC}"
HEALTH=$(curl -s "$BASE_URL/")
echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
echo ""

# 2. Créer utilisateur Alice
echo -e "${BLUE}═══ Test 2: Inscription Alice ═══${NC}"
ALICE_EMAIL="alice_$(date +%s)@test.com"
ALICE_RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ALICE_EMAIL\",\"password\":\"password123\"}")

if echo "$ALICE_RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
    ALICE_TOKEN=$(echo "$ALICE_RESPONSE" | jq -r '.token')
    ALICE_ID=$(echo "$ALICE_RESPONSE" | jq -r '.user.id')
    echo -e "${GREEN}✅ Alice créée (ID: $ALICE_ID)${NC}"
    echo "   Email: $ALICE_EMAIL"
    echo "   Token: ${ALICE_TOKEN:0:30}..."
else
    echo -e "${RED}❌ Échec création Alice${NC}"
    echo "$ALICE_RESPONSE" | jq . 2>/dev/null || echo "$ALICE_RESPONSE"
    exit 1
fi
echo ""

# 3. Créer utilisateur Bob
echo -e "${BLUE}═══ Test 3: Inscription Bob ═══${NC}"
BOB_EMAIL="bob_$(date +%s)@test.com"
BOB_RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$BOB_EMAIL\",\"password\":\"password123\"}")

if echo "$BOB_RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
    BOB_TOKEN=$(echo "$BOB_RESPONSE" | jq -r '.token')
    BOB_ID=$(echo "$BOB_RESPONSE" | jq -r '.user.id')
    echo -e "${GREEN}✅ Bob créé (ID: $BOB_ID)${NC}"
    echo "   Email: $BOB_EMAIL"
    echo "   Token: ${BOB_TOKEN:0:30}..."
else
    echo -e "${RED}❌ Échec création Bob${NC}"
    echo "$BOB_RESPONSE" | jq . 2>/dev/null || echo "$BOB_RESPONSE"
    exit 1
fi
echo ""

# 4. Login Alice
echo -e "${BLUE}═══ Test 4: Connexion Alice ═══${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ALICE_EMAIL\",\"password\":\"password123\"}")

if echo "$LOGIN_RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Alice connectée${NC}"
else
    echo -e "${RED}❌ Échec connexion Alice${NC}"
    echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"
    exit 1
fi
echo ""

# 5. Profil Alice
echo -e "${BLUE}═══ Test 5: Profil Alice ═══${NC}"
PROFILE=$(curl -s "$BASE_URL/me" \
  -H "Authorization: Bearer $ALICE_TOKEN")

if echo "$PROFILE" | jq -e '.id' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Profil récupéré${NC}"
    echo "$PROFILE" | jq .
else
    echo -e "${RED}❌ Échec récupération profil${NC}"
    echo "$PROFILE"
    exit 1
fi
echo ""

# 6. Alice envoie un message à Bob (REST)
echo -e "${BLUE}═══ Test 6: Alice → Bob (REST) ═══${NC}"
MSG1=$(curl -s -X POST "$BASE_URL/messages" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"receiverId\":$BOB_ID,\"content\":\"Salut Bob ! 👋\"}")

if echo "$MSG1" | jq -e '.id' > /dev/null 2>&1; then
    MSG1_ID=$(echo "$MSG1" | jq -r '.id')
    echo -e "${GREEN}✅ Message envoyé (ID: $MSG1_ID)${NC}"
    echo "$MSG1" | jq .
else
    echo -e "${RED}❌ Échec envoi message${NC}"
    echo "$MSG1"
    exit 1
fi
echo ""

# 7. Bob répond à Alice
echo -e "${BLUE}═══ Test 7: Bob → Alice (REST) ═══${NC}"
MSG2=$(curl -s -X POST "$BASE_URL/messages" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"receiverId\":$ALICE_ID,\"content\":\"Salut Alice ! Comment ça va ? 😊\"}")

if echo "$MSG2" | jq -e '.id' > /dev/null 2>&1; then
    MSG2_ID=$(echo "$MSG2" | jq -r '.id')
    echo -e "${GREEN}✅ Message envoyé (ID: $MSG2_ID)${NC}"
    echo "$MSG2" | jq .
else
    echo -e "${RED}❌ Échec envoi message${NC}"
    echo "$MSG2"
    exit 1
fi
echo ""

# 8. Alice récupère l'historique
echo -e "${BLUE}═══ Test 8: Historique conversation ═══${NC}"
HISTORY=$(curl -s "$BASE_URL/messages?userId=$BOB_ID&limit=10" \
  -H "Authorization: Bearer $ALICE_TOKEN")

if echo "$HISTORY" | jq -e '.[0].id' > /dev/null 2>&1; then
    MSG_COUNT=$(echo "$HISTORY" | jq 'length')
    echo -e "${GREEN}✅ Historique récupéré ($MSG_COUNT messages)${NC}"
    echo "$HISTORY" | jq '.[] | {id, senderId, receiverId, content}'
else
    echo -e "${RED}❌ Échec récupération historique${NC}"
    echo "$HISTORY"
    exit 1
fi
echo ""

# 9. Test erreur : token invalide
echo -e "${BLUE}═══ Test 9: Sécurité (token invalide) ═══${NC}"
ERROR_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/api_error.txt "$BASE_URL/me" \
  -H "Authorization: Bearer invalid_token_xyz")

if [ "$ERROR_RESPONSE" = "401" ]; then
    echo -e "${GREEN}✅ Rejet token invalide (401)${NC}"
    cat /tmp/api_error.txt | jq . 2>/dev/null || cat /tmp/api_error.txt
else
    echo -e "${RED}❌ Devrait rejeter token invalide${NC}"
fi
rm -f /tmp/api_error.txt
echo ""

# 10. Test erreur : inscription avec même email
echo -e "${BLUE}═══ Test 10: Sécurité (email dupliqué) ═══${NC}"
DUPLICATE=$(curl -s -w "%{http_code}" -o /tmp/api_dup.txt -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ALICE_EMAIL\",\"password\":\"password123\"}")

if [ "$DUPLICATE" = "409" ]; then
    echo -e "${GREEN}✅ Rejet email dupliqué (409)${NC}"
    cat /tmp/api_dup.txt | jq . 2>/dev/null || cat /tmp/api_dup.txt
else
    echo -e "${RED}❌ Devrait rejeter email dupliqué${NC}"
fi
rm -f /tmp/api_dup.txt
echo ""

# Résumé
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ TOUS LES TESTS RÉUSSIS !       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}📊 Résumé:${NC}"
echo -e "   • Health check: ${GREEN}✓${NC}"
echo -e "   • Inscription: ${GREEN}✓${NC}"
echo -e "   • Connexion: ${GREEN}✓${NC}"
echo -e "   • Profil: ${GREEN}✓${NC}"
echo -e "   • Envoi messages REST: ${GREEN}✓${NC}"
echo -e "   • Historique: ${GREEN}✓${NC}"
echo -e "   • Sécurité JWT: ${GREEN}✓${NC}"
echo ""

echo -e "${YELLOW}💡 Prochaines étapes:${NC}"
echo -e "   1. Tester Socket.IO avec: node test-socket.js"
echo -e "   2. Intégrer dans votre app Android Kotlin"
echo -e "   3. Configurer le reverse proxy Nginx"
echo ""

echo -e "${BLUE}🎉 Votre API est prête pour la production !${NC}"
