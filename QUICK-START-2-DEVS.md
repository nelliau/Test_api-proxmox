# 🚀 Quick Start - Collaboration à 2 développeurs

## 📚 Fichiers essentiels à lire

| Fichier | Priorité | Quand le lire |
|---------|----------|---------------|
| **API-CONTRACT.md** | 🔥 CRITIQUE | Chaque matin + avant chaque feature |
| **WORKFLOW-2-DEVS.md** | ⭐ Important | Une fois au début + référence |
| **E2EE-DEPLOYMENT-GUIDE.md** | 📖 Référence | Quand besoin |
| **DAILY-STANDUP-TEMPLATE.md** | 📅 Quotidien | Chaque matin |

---

## ⚡ Setup initial (à faire UNE FOIS)

### **DEV 1 (Backend) :**

```bash
# 1. Cloner le repo
git clone <repo-url>
cd dashkey-project

# 2. Installer dépendances
npm install

# 3. Créer .env
cp .env.example .env
# Éditer .env avec vos credentials MySQL

# 4. Créer la table prekey_bundles
mysql -u API -p Dashkey_test < create-prekey-bundles-table.sql

# 5. Lancer le serveur
node server-e2ee.js

# 6. Tester
curl http://localhost:30443/
```

---

### **DEV 2 (Android) :**

```bash
# 1. Cloner le repo
git clone <repo-url>
cd dashkey-project/android

# 2. Ouvrir dans Android Studio

# 3. Vérifier build.gradle.kts
# Ajouter si manquant :
implementation("org.signal:libsignal-client:0.42.2")

# 4. Configurer l'API URL
# Dans RetrofitClient.kt :
private const val BASE_URL = "http://10.0.2.2:30443/" // Emulator
// OU
private const val BASE_URL = "http://192.168.x.x:30443/" // Device réel

# 5. Build et run
./gradlew installDebug
```

---

## 🎯 Workflow quotidien (en 1 page)

### **Matin (8h00 - 8h15)**

```bash
# 1. Pull les derniers changements
git pull origin main

# 2. Lire API-CONTRACT.md
cat API-CONTRACT.md | grep "Dernière mise à jour"

# 3. Daily standup (10 min)
# Utiliser DAILY-STANDUP-TEMPLATE.md
```

---

### **Développement (8h15 - 16h30)**

#### **Nouvelle feature ?**

```
1. Discussion ensemble (30 min)
   → Définir les endpoints
   → Mettre à jour API-CONTRACT.md
   → Commit API-CONTRACT.md

2. Dev parallèle
   DEV 1 : Branche feature/xxx-api
   DEV 2 : Branche feature/xxx-android

3. Communication async (Slack/Discord)
   → Notifier les changements importants
```

#### **Bug fix ?**

```
1. Reproduire le bug
2. Fix
3. Test
4. Commit + Push
5. Notifier l'autre si impact
```

---

### **Tests d'intégration (16h30 - 17h30)**

```bash
# 1. Merger les branches
git checkout dev
git merge feature/xxx-api
git merge feature/xxx-android

# 2. Lancer serveur (DEV 1)
node server-e2ee.js

# 3. Lancer app (DEV 2)
./gradlew installDebug

# 4. Tests manuels ensemble

# 5. Si OK → Push
git push origin dev
```

---

### **Fin de journée (17h30 - 17h45)**

```
1. Recap (5 min)
   → Qu'est-ce qui a été fait ?
   → Qu'est-ce qui reste ?

2. Update docs (5 min)
   → API-CONTRACT.md si besoin
   → Archiver DAILY-STANDUP-TEMPLATE.md

3. Commit + Push
```

---

## 🔥 Commandes les plus utilisées

### **DEV 1 (Backend) :**

```bash
# Lancer serveur
node server-e2ee.js

# Tester un endpoint
curl http://localhost:30443/
curl -X POST http://localhost:30443/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Voir les logs MySQL
mysql -u API -p Dashkey_test -e "SELECT * FROM prekey_bundles;"

# Tests automatisés
npm test
```

---

### **DEV 2 (Android) :**

```bash
# Build et install
./gradlew installDebug

# Logs en temps réel
adb logcat | grep "DashKey"

# Clear data (reset app)
adb shell pm clear com.example.dashkey

# Liste des devices
adb devices
```

---

## 📋 Checklist avant chaque commit

### **DEV 1 (Backend) :**

- [ ] Code testé avec Postman/curl
- [ ] Logs console propres (pas d'erreurs)
- [ ] API-CONTRACT.md mis à jour si modification
- [ ] Pas de `console.log` de debug oubliés
- [ ] Commit message clair : `feat: Add groups endpoint`

---

### **DEV 2 (Android) :**

- [ ] App build sans erreurs
- [ ] Testée sur émulateur OU device
- [ ] Gestion des erreurs API implémentée
- [ ] Pas de `println` de debug oubliés
- [ ] Commit message clair : `feat: Add groups UI`

---

## 🚨 Que faire si...

### **L'API ne répond pas ?**

```bash
# DEV 2 : Vérifier que l'API tourne
curl http://localhost:30443/

# Si erreur → Demander à DEV 1 de lancer le serveur
```

---

### **Erreur 401 Unauthorized ?**

```
Cause : Token JWT expiré ou invalide

Solution :
1. Se reconnecter (POST /login)
2. Récupérer un nouveau token
3. Mettre à jour le token dans l'app
```

---

### **Erreur 404 sur un endpoint ?**

```
1. Vérifier l'URL dans API-CONTRACT.md
2. Vérifier que le serveur a bien l'endpoint
3. Si manquant → Demander à DEV 1 de l'implémenter
```

---

### **Message chiffré ne se déchiffre pas ?**

```
Causes possibles :
1. Session Signal Protocol pas initialisée
   → GET /keys/:userId d'abord
   
2. Mauvais format de content
   → Doit être "TYPE:base64"
   
3. Clés publiques manquantes
   → POST /keys/upload d'abord

Debug :
- Vérifier les logs Android
- Demander à DEV 1 de vérifier les logs serveur
- Debug ensemble
```

---

### **Conflit Git ?**

```bash
# 1. Identifier le conflit
git status

# 2. Résoudre ensemble (les 2 devs)
# Option A : Garder votre version
git checkout --ours <fichier>

# Option B : Garder leur version
git checkout --theirs <fichier>

# Option C : Merger manuellement
# Éditer le fichier, supprimer les marqueurs <<<<< ===== >>>>>

# 3. Commit de merge
git add <fichier>
git commit -m "merge: Resolve conflict in <fichier>"
```

---

## 💡 Tips pour être ultra-efficace

### **Communication**

✅ **Slack/Discord :**
- Notifier immédiatement les changements API
- Répondre < 1h
- Utiliser des threads pour organiser

✅ **Daily standup :**
- Être concis (10 min max)
- Dire ce qui impacte l'autre

✅ **Code review :**
- Review le code de l'autre (15 min/jour)
- Poser des questions si pas compris

---

### **Développement**

✅ **Dire à l'IA :**
```
"Lis API-CONTRACT.md.
 Implémente EXACTEMENT ce qui est décrit.
 Ne modifie rien sans me demander."
```

✅ **Commits atomiques :**
```
1 feature = 1 commit
Pas de commits avec 10 features différentes
```

✅ **Tests avant push :**
```
Toujours tester localement avant de push
Évite les "oops, mon code ne compile pas"
```

---

### **Documentation**

✅ **API-CONTRACT.md :**
- Source de vérité UNIQUE
- Toujours à jour
- Lire avant chaque feature

✅ **Commentaires dans le code :**
```javascript
// ⚠️ NE PAS utiliser .trim() sur le content chiffré !
// Ça casserait le chiffrement E2EE
const content = req.body.content;
```

---

## 🎯 Objectifs de productivité

### **Par semaine :**

- ✅ 3-5 nouvelles features complètes
- ✅ 0-2 bugs d'intégration (idéal : 0)
- ✅ 100% des tests d'intégration passent
- ✅ API-CONTRACT.md toujours à jour

### **Par jour :**

- ✅ 1-2 features OU 5-10 bugs fixés
- ✅ 1 daily standup (15 min)
- ✅ 1 session de tests d'intégration (1h)
- ✅ Communication fluide (< 1h de délai)

---

## 📞 Contacts rapides

| Besoin | Action |
|--------|--------|
| **Question rapide** | Slack/Discord |
| **Blocage > 30 min** | Appel vocal |
| **Bug critique** | Réunion immédiate |
| **Décision importante** | Réunion de 30 min |

---

## 🎉 Résumé en 1 image

```
        ┌─────────────────────────────────┐
        │   MORNING (8h00 - 8h15)         │
        │   - Git pull                    │
        │   - Lire API-CONTRACT.md        │
        │   - Daily standup (10 min)      │
        └─────────────┬───────────────────┘
                      │
        ┌─────────────▼───────────────────┐
        │   DEV PARALLÈLE (8h15 - 16h30)  │
        │                                 │
        │   DEV 1: Backend                │
        │   DEV 2: Android                │
        │                                 │
        │   Communication async           │
        │   (Slack/Discord)               │
        └─────────────┬───────────────────┘
                      │
        ┌─────────────▼───────────────────┐
        │   INTÉGRATION (16h30 - 17h30)   │
        │   - Merge branches              │
        │   - Tests ensemble              │
        │   - Fix bugs                    │
        └─────────────┬───────────────────┘
                      │
        ┌─────────────▼───────────────────┐
        │   FIN DE JOURNÉE (17h30 - 17h45)│
        │   - Recap                       │
        │   - Update docs                 │
        │   - Commit + Push               │
        └─────────────────────────────────┘
```

---

**🚀 Vous êtes prêts à être une équipe ultra-productive ! Let's go ! 🎯**
