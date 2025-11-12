# 🤝 Workflow à 2 développeurs - Guide pratique

## 👥 Rôles

| Développeur | Rôle | Technologies |
|-------------|------|--------------|
| **DEV 1** | Backend API | Node.js, Express, Sequelize, MySQL |
| **DEV 2** | Frontend Android | Kotlin, Jetpack Compose, libsignal |

---

## 📅 Organisation quotidienne

### **🌅 Début de journée (8h00 - 8h15)**

#### **1. Sync rapide (10 min) - Tous les 2**

Format :
```
DEV 1 : "Hier j'ai fait X, aujourd'hui je fais Y, blocage : Z"
DEV 2 : "Hier j'ai fait X, aujourd'hui je fais Y, blocage : Z"
```

**Checklist :**
- [ ] Qu'est-ce que l'autre a fait hier ? (lire commits Git)
- [ ] Est-ce que ça impacte mon travail aujourd'hui ?
- [ ] Y a-t-il des modifications du contrat API ?
- [ ] Des bugs d'intégration à résoudre ?

#### **2. Lecture individuelle (5 min)**

**DEV 1 (Backend) :**
- [ ] Lire `API-CONTRACT.md`
- [ ] Vérifier si Dev 2 a ouvert des issues GitHub
- [ ] Voir les logs de production si déployé

**DEV 2 (Android) :**
- [ ] Lire `API-CONTRACT.md`
- [ ] Vérifier si Dev 1 a modifié des endpoints
- [ ] Tester l'API en local

---

### **💻 Développement (8h15 - 12h00)**

#### **Mode Focus : Travail parallèle**

**DEV 1 (Backend) :**
```bash
# 1. Créer une branche feature
git checkout -b feature/add-groups-api

# 2. Dire à Cursor :
"Lis API-CONTRACT.md.
 Implémente l'endpoint POST /groups selon le contrat.
 Ne modifie rien sans me demander."

# 3. Coder + Tests
# 4. Commit régulièrement
git commit -m "feat: Add POST /groups endpoint"
```

**DEV 2 (Android) :**
```bash
# 1. Créer une branche feature
git checkout -b feature/add-groups-ui

# 2. Dire à JetBrains AI :
"Lis API-CONTRACT.md.
 Implémente l'appel à POST /groups selon le contrat.
 Utilise Retrofit."

# 3. Coder + Tests
# 4. Commit régulièrement
git commit -m "feat: Add groups UI and API call"
```

#### **Communication asynchrone**

**Slack/Discord :**
```
DEV 1: "J'ai changé le format de réponse de GET /messages,
        j'ai mis à jour API-CONTRACT.md, check ligne 234"

DEV 2: "👍 Vu, je l'intègre dans 30 min"
```

---

### **🍽️ Pause déjeuner (12h00 - 13h00)**

---

### **💻 Développement après-midi (13h00 - 16h30)**

Continuation du travail en parallèle.

#### **Point de synchronisation (15h00 - 15 min)**

**Objectif :** Vérifier que vous êtes alignés

**Questions :**
1. Est-ce que nos branches vont pouvoir merger sans conflit ?
2. L'intégration va fonctionner ?
3. Besoin d'aide de l'autre ?

---

### **🧪 Tests d'intégration (16h30 - 17h30)**

#### **Ensemble - 1h**

```bash
# 1. DEV 1 merge sa branche en dev
git checkout dev
git merge feature/add-groups-api

# 2. DEV 2 merge sa branche en dev
git merge feature/add-groups-ui

# 3. DEV 1 lance le serveur
cd backend
node server-e2ee.js

# 4. DEV 2 lance l'app Android
cd android
./gradlew installDebug

# 5. Tests manuels ensemble
# - Dev 2 teste la feature
# - Dev 1 regarde les logs serveur
# - Correction des bugs ensemble si besoin

# 6. Tests automatisés
cd integration-tests
npm test
```

**Si tests OK ✅ :**
```bash
git push origin dev
```

**Si tests KO ❌ :**
- Debug ensemble
- Fix
- Re-test

---

### **📝 Fin de journée (17h30 - 17h45)**

#### **1. Recap (10 min) - Tous les 2**

**Questions :**
1. Qu'est-ce qui a été terminé aujourd'hui ?
2. Qu'est-ce qui reste à faire demain ?
3. Y a-t-il des décisions à prendre ensemble ?

#### **2. Update documentation (5 min)**

- [ ] Mettre à jour `API-CONTRACT.md` si besoin
- [ ] Documenter les décisions prises
- [ ] Créer des issues GitHub pour demain

#### **3. Commit + Push**

```bash
git add .
git commit -m "feat: Groups feature completed"
git push
```

---

## 🎯 Workflow par type de feature

### **Feature 1 : Nouvelle fonctionnalité (ex: Messages de groupe)**

#### **Phase 1 : Définition (30 min - Ensemble)**

```
1. Brainstorm au tableau (physique ou Miro/Excalidraw)
   - Comment ça marche ?
   - Structure BDD ?
   - Endpoints nécessaires ?

2. Écrire dans API-CONTRACT.md
   - POST /groups
   - GET /groups/:id/messages
   - etc.

3. Valider ensemble

4. Commit API-CONTRACT.md
   git add API-CONTRACT.md
   git commit -m "docs: Add groups API contract"
   git push
```

#### **Phase 2 : Dev parallèle (3-5h chacun)**

**DEV 1 (Backend) :**
```
- Créer table `groups` en BDD
- Créer modèle Sequelize
- Implémenter POST /groups
- Implémenter GET /groups/:id/messages
- Tests Postman
- Commit
```

**DEV 2 (Android) :**
```
- Créer UI liste groupes
- Créer UI conversation groupe
- Retrofit API calls
- ViewModel + State
- Tests Android
- Commit
```

#### **Phase 3 : Intégration (1h - Ensemble)**

```
- Merger les 2 branches
- Tests E2E
- Fix bugs
- Push
```

---

### **Feature 2 : Bug fix**

#### **Bug côté Backend**

**DEV 1 :**
```
1. Reproduire le bug
2. Fix
3. Tester
4. Commit : "fix: Correct oneTimePreKey consumption"
5. Push

6. Notifier DEV 2 :
   "Bug fixé sur GET /keys/:userId, re-pull la branche"
```

**DEV 2 :**
```
1. Pull la branche
2. Re-tester l'app
3. Confirmer que ça marche
```

---

#### **Bug côté Android**

**DEV 2 :**
```
1. Reproduire le bug
2. Fix
3. Commit
4. Push

5. Notifier DEV 1 si impact API
```

---

### **Feature 3 : Modification d'un endpoint existant**

⚠️ **DANGER : Risque de casser l'intégration !**

#### **Procédure obligatoire :**

```
1. DEV 1 propose la modification
   "Je veux ajouter un champ 'readAt' dans GET /messages"

2. Discussion avec DEV 2
   "OK pour toi ? Ça impacte ton code ?"

3. Mise à jour API-CONTRACT.md ENSEMBLE

4. DEV 1 implémente côté backend

5. DEV 2 adapte côté Android

6. Tests d'intégration ENSEMBLE

7. Merge si OK
```

⚠️ **NE JAMAIS modifier un endpoint sans prévenir l'autre !**

---

## 🔧 Outils et scripts

### **Script 1 : Vérifier la sync**

**`check-sync.sh`** (à lancer chaque matin)

```bash
#!/bin/bash

echo "🔍 Vérification de la synchronisation..."

# Vérifier les commits non pullés
git fetch
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})

if [ $LOCAL != $REMOTE ]; then
    echo "⚠️  Des commits existent sur le remote !"
    echo "   Faire : git pull"
else
    echo "✅ Branche à jour"
fi

# Vérifier API-CONTRACT.md
if git diff origin/main -- API-CONTRACT.md > /dev/null 2>&1; then
    echo "⚠️  API-CONTRACT.md a été modifié !"
    echo "   Lire les changements avant de coder"
else
    echo "✅ API-CONTRACT.md inchangé"
fi

# Vérifier les issues GitHub
echo ""
echo "📋 Issues GitHub ouvertes :"
gh issue list --limit 5 2>/dev/null || echo "   (gh CLI non installé)"
```

---

### **Script 2 : Tests d'intégration rapide**

**`quick-test.sh`**

```bash
#!/bin/bash

echo "🧪 Tests d'intégration rapides..."

# Test 1 : API répond
curl -s http://localhost:30443/ | grep "ok" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ API répond"
else
    echo "❌ API ne répond pas"
    exit 1
fi

# Test 2 : Authentification
TOKEN=$(curl -s -X POST http://localhost:30443/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  | jq -r '.token')

if [ "$TOKEN" != "null" ]; then
    echo "✅ Authentification OK"
else
    echo "❌ Authentification KO"
    exit 1
fi

# Test 3 : Upload keys
curl -s -X POST http://localhost:30443/keys/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"identityKey":"test","signedPreKeyId":1,"signedPreKeyPublic":"test","signedPreKeySignature":"test"}' \
  | grep "bundleId" > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Upload keys OK"
else
    echo "❌ Upload keys KO"
    exit 1
fi

echo ""
echo "🎉 Tous les tests passent !"
```

---

### **Script 3 : Notification de changement API**

**`notify-api-change.sh`** (après modification API-CONTRACT.md)

```bash
#!/bin/bash

# Récupérer le dernier commit qui a touché API-CONTRACT.md
LAST_COMMIT=$(git log -1 --oneline API-CONTRACT.md)

# Envoyer notification Slack/Discord (webhook)
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"⚠️ API-CONTRACT.md modifié: $LAST_COMMIT\"}"

echo "✅ Notification envoyée"
```

---

## 📋 Checklist feature complète

### **☑️ Définition**
- [ ] Brainstorm ensemble (30 min)
- [ ] API-CONTRACT.md mis à jour
- [ ] Les 2 devs comprennent la feature
- [ ] Commit API-CONTRACT.md

### **☑️ Développement Backend**
- [ ] Branche créée (`feature/xxx-api`)
- [ ] Modifications BDD si nécessaire
- [ ] Endpoints implémentés selon contrat
- [ ] Tests Postman/curl
- [ ] Logs ajoutés
- [ ] Commit + Push

### **☑️ Développement Android**
- [ ] Branche créée (`feature/xxx-android`)
- [ ] UI créée
- [ ] Appels API selon contrat
- [ ] Gestion erreurs
- [ ] Tests unitaires
- [ ] Commit + Push

### **☑️ Intégration**
- [ ] Merge backend → dev
- [ ] Merge android → dev
- [ ] Tests E2E manuels
- [ ] Tests automatisés (si existent)
- [ ] Bugs fixés
- [ ] Documentation mise à jour
- [ ] Merge dev → main

---

## 🚨 Résolution de conflits

### **Conflit Git**

```bash
# DEV 1 et DEV 2 ont modifié le même fichier

# Exemple : API-CONTRACT.md

# Solution :
1. DEV 1 et DEV 2 se mettent d'accord sur Slack
2. L'un des deux fait la résolution
3. Commit de merge
4. L'autre pull
```

---

### **Conflit de logique**

**Symptôme :** L'app Android ne fonctionne pas avec l'API

```
Exemple :
- API retourne { "friends": [...] }
- Android s'attend à { "data": { "friends": [...] } }
```

**Solution :**
```
1. Vérifier API-CONTRACT.md
   → Qui a raison ?

2. Si API-CONTRACT.md est flou :
   → Discussion + mise à jour du contrat

3. Celui qui a tort adapte son code

4. Tests pour confirmer
```

---

### **Conflit de timing**

**Symptôme :** DEV 2 a besoin d'un endpoint que DEV 1 n'a pas encore fait

**Solution :**
```
Option 1 : DEV 1 priorise cet endpoint

Option 2 : DEV 2 fait un mock temporaire
   // Mock temporaire
   fun getFriends(): List<Friend> {
       return listOf(
           Friend(1, "Alice"),
           Friend(2, "Bob")
       )
   }

Option 3 : DEV 2 travaille sur autre chose en attendant
```

---

## 🎯 Indicateurs de bonne collaboration

### **✅ Signes que ça va bien :**

- Intégration fonctionne du premier coup (ou presque)
- Pas de surprises lors des merges
- Les 2 comprennent le code de l'autre
- Communication fluide (< 1h de délai de réponse)
- Bugs détectés rapidement

### **⚠️ Signes d'alerte :**

- Bugs d'intégration fréquents
- Merges qui prennent > 1h
- Incompréhension du code de l'autre
- API-CONTRACT.md obsolète
- Pas de communication pendant > 4h

**Action si signes d'alerte :**
```
1. Réunion de 30 min pour discuter
2. Identifier le problème
3. Ajuster le workflow
```

---

## 📞 Communication

### **Canaux recommandés**

| Canal | Usage | Délai réponse |
|-------|-------|---------------|
| **Slack/Discord** | Communication quotidienne | < 1h |
| **Réunion daily** | Sync quotidien | Temps réel |
| **GitHub Issues** | Bugs, features à venir | Async |
| **API-CONTRACT.md** | Source de vérité | Sync |
| **Appel vocal** | Déblocage urgent | Immédiat |

### **Templates de messages**

**Notification de changement API :**
```
🔄 Changement API

Endpoint: POST /messages
Changement: Ajout du champ "readAt"
Impact: Ton code Android doit être mis à jour
Voir: API-CONTRACT.md ligne 234

CC @dev2
```

**Demande de review :**
```
👀 Review request

Feature: Messages de groupe
Branch: feature/groups-api
Commits: 5
Tests: ✅ Passent
Besoin de ton avis avant merge

@dev2
```

**Blocage :**
```
🚧 Blocage

Problème: L'endpoint GET /keys/:userId retourne null pour oneTimePreKey
Impact: Je ne peux pas avancer sur le chiffrement
Besoin: Debug ensemble ?

@dev1
```

---

## 🎉 Bonnes pratiques

### **DO ✅**

1. **Communiquer tôt et souvent**
2. **Mettre à jour API-CONTRACT.md avant de coder**
3. **Faire des commits atomiques** (1 feature = 1 commit)
4. **Tester avant de push**
5. **Demander de l'aide rapidement** (< 30 min de blocage)
6. **Lire le code de l'autre** (review)
7. **Documenter les décisions** (commentaires, README)

### **DON'T ❌**

1. **Coder sans lire API-CONTRACT.md**
2. **Modifier un endpoint sans prévenir**
3. **Push du code qui ne compile pas**
4. **Ignorer les messages de l'autre > 2h**
5. **Travailler sur la même fonctionnalité sans coordination**
6. **Faire de grosses PR** (> 500 lignes = difficile à review)
7. **Cacher un bug** (le dire immédiatement)

---

## 🚀 Résumé : Une journée type

```
08h00 - 08h15 : Daily sync
08h15 - 12h00 : Dev parallèle (focus)
12h00 - 13h00 : Pause déjeuner
13h00 - 15h00 : Dev parallèle (focus)
15h00 - 15h15 : Point de sync
15h15 - 16h30 : Dev parallèle (focus)
16h30 - 17h30 : Tests d'intégration (ensemble)
17h30 - 17h45 : Recap + docs
```

**Temps de communication : 1h30/jour (20%)**
**Temps de dev : 6h30/jour (80%)**

---

**🤝 Avec ce workflow, vous êtes une équipe ultra-efficace ! 🚀**
