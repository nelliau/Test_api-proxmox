# 🤝 Guide de collaboration - Équipe à 2 développeurs

## 📦 Tous les fichiers créés pour votre collaboration

Voici l'ensemble complet des fichiers et outils mis en place pour maximiser votre efficacité.

---

## 📋 Fichiers essentiels

### **1. API-CONTRACT.md** 🔥 CRITIQUE

**Rôle :** Source de vérité unique pour l'API

**Contenu :**
- Tous les endpoints (18 endpoints documentés)
- Formats de requête/réponse exacts
- Codes d'erreur standardisés
- Exemples concrets
- Flows complets E2EE
- Règles métier

**Quand le lire :**
- ✅ Chaque matin (vérifier les mises à jour)
- ✅ Avant chaque nouvelle feature
- ✅ En cas de doute sur un endpoint

**Quand le modifier :**
- ⚠️ JAMAIS seul !
- ✅ Après discussion avec les 2 devs
- ✅ Commit immédiat après modification

**Instructions aux IA :**
```
DEV 1 (Cursor) :
"Lis API-CONTRACT.md avant de coder.
 Implémente EXACTEMENT ce qui est décrit.
 Si tu veux modifier quelque chose, demande-moi d'abord."

DEV 2 (JetBrains) :
"Lis API-CONTRACT.md avant de coder.
 Utilise EXACTEMENT les formats spécifiés.
 Si l'API ne répond pas comme attendu, signale-le."
```

---

### **2. WORKFLOW-2-DEVS.md** ⭐ Important

**Rôle :** Guide complet du workflow quotidien

**Contenu :**
- Organisation quotidienne (heure par heure)
- Workflow par type de feature
- Résolution de conflits
- Scripts utiles
- Checklist features
- Indicateurs de bonne collaboration

**Quand le lire :**
- ✅ Une fois au début du projet (lire en entier)
- ✅ En référence quand besoin

---

### **3. QUICK-START-2-DEVS.md** 🚀 Démarrage rapide

**Rôle :** Guide ultra-condensé (tout en 1 page)

**Contenu :**
- Setup initial
- Workflow quotidien résumé
- Commandes les plus utilisées
- Checklist avant commit
- Guide de dépannage

**Quand le lire :**
- ✅ Tous les matins (refresh rapide)
- ✅ Quand vous avez oublié une étape

---

### **4. DAILY-STANDUP-TEMPLATE.md** 📅 Quotidien

**Rôle :** Template pour le daily standup

**Contenu :**
- Structure du standup
- Questions à poser
- Décisions à prendre
- Plan de la journée

**Comment l'utiliser :**
```bash
# Chaque matin à 8h00
cp DAILY-STANDUP-TEMPLATE.md daily-logs/2025-11-11.md
# Remplir pendant le standup
# Archiver à la fin de la journée
```

---

### **5. .github/ISSUE_TEMPLATE/feature.md** 📝

**Rôle :** Template pour créer des issues GitHub

**Utilisation :**
```bash
# Sur GitHub, créer une nouvelle issue
# Le template se charge automatiquement
# Remplir les sections
```

**Sections :**
- Description
- Implémentation Backend
- Implémentation Android
- Critères d'acceptation

---

### **6. .github/PULL_REQUEST_TEMPLATE.md** 🔀

**Rôle :** Template pour créer des Pull Requests

**Utilisation :**
```bash
# Créer une PR sur GitHub
# Le template se charge automatiquement
# Remplir les sections
```

**Sections :**
- Type de changement
- Tests effectués
- Impact sur l'autre dev
- Checklist

---

## 🛠️ Fichiers techniques (déjà existants)

### **Backend**

| Fichier | Rôle |
|---------|------|
| `server-e2ee.js` | Serveur Node.js avec E2EE |
| `create-prekey-bundles-table.sql` | Script SQL pour nouvelle table |
| `.env` | Configuration (DB, JWT, port) |
| `package.json` | Dépendances npm |

### **Documentation E2EE**

| Fichier | Rôle |
|---------|------|
| `E2EE-DEPLOYMENT-GUIDE.md` | Guide complet de déploiement E2EE |
| `E2EE-COMPARISON.md` | Comparaison avec/sans E2EE |
| `E2EE-ANDROID-EXAMPLE.kt` | Exemple de code Android complet |
| `E2EE-README.md` | Vue d'ensemble E2EE |

---

## 🎯 Organisation du repo Git

### **Structure recommandée**

```
dashkey-project/
├── README.md
├── API-CONTRACT.md                    ← 🔥 SOURCE DE VÉRITÉ
├── WORKFLOW-2-DEVS.md                 ← Workflow complet
├── QUICK-START-2-DEVS.md              ← Guide rapide
├── DAILY-STANDUP-TEMPLATE.md          ← Template standup
├── COLLABORATION-README.md            ← Ce fichier
│
├── backend/                           ← Code Backend (DEV 1)
│   ├── server-e2ee.js
│   ├── package.json
│   ├── .env
│   └── ...
│
├── android/                           ← Code Android (DEV 2)
│   ├── app/
│   ├── build.gradle.kts
│   └── ...
│
├── docs/                              ← Documentation
│   ├── E2EE-DEPLOYMENT-GUIDE.md
│   ├── E2EE-COMPARISON.md
│   ├── E2EE-ANDROID-EXAMPLE.kt
│   └── E2EE-README.md
│
├── .github/                           ← Templates GitHub
│   ├── ISSUE_TEMPLATE/
│   │   └── feature.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── daily-logs/                        ← Standup archivés
│   ├── 2025-11-11.md
│   ├── 2025-11-12.md
│   └── ...
│
└── integration-tests/                 ← Tests E2E
    ├── package.json
    └── tests/
        └── e2e.test.js
```

---

## 🔄 Workflow complet en un schéma

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1 : DÉFINITION                     │
│                    (30 min - Ensemble)                      │
├─────────────────────────────────────────────────────────────┤
│  1. Brainstorm feature                                      │
│  2. Définir endpoints dans API-CONTRACT.md                  │
│  3. Valider ensemble                                        │
│  4. Commit API-CONTRACT.md                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────▼────────────┐     ┌────────────────────────┐
    │   DEV 1 (Backend)       │     │   DEV 2 (Android)      │
    │   ──────────────        │     │   ───────────────      │
    │   Branche:              │     │   Branche:             │
    │   feature/xxx-api       │     │   feature/xxx-android  │
    │                         │     │                        │
    │   - Créer BDD           │     │   - Créer UI           │
    │   - Endpoints           │     │   - Appels API         │
    │   - Tests Postman       │     │   - Tests Android      │
    │   - Commit + Push       │     │   - Commit + Push      │
    └────────────┬────────────┘     └────────────┬───────────┘
                 │                               │
                 └───────────┬───────────────────┘
                             │
                ┌────────────▼────────────┐
                │   PHASE 3 : INTÉGRATION │
                │   (1h - Ensemble)       │
                ├─────────────────────────┤
                │  1. Merge branches      │
                │  2. Tests E2E           │
                │  3. Fix bugs            │
                │  4. Push                │
                └─────────────────────────┘
```

---

## 📅 Planning type d'une semaine

### **Lundi**

```
Matin:
- Daily standup
- Planification de la semaine
- Choix des features prioritaires

Journée:
- Dev feature 1 (parallèle)
- Tests d'intégration feature 1

Fin:
- Recap
- Feature 1 mergée
```

---

### **Mardi - Jeudi**

```
Même format:
- Daily standup (10 min)
- Dev parallèle (6h)
- Tests intégration (1h)
- Recap (15 min)

1-2 features par jour
```

---

### **Vendredi**

```
Matin:
- Daily standup
- Finir les features en cours

Après-midi:
- Tests de régression complets
- Fix bugs
- Documentation
- Rétrospective de la semaine (30 min)
```

---

## 🎯 KPIs (Indicateurs de performance)

### **Mesurer votre efficacité**

| KPI | Objectif | Comment mesurer |
|-----|----------|-----------------|
| **Features/semaine** | 5-10 | GitHub closed issues |
| **Bugs d'intégration** | < 2/semaine | Comptage manuel |
| **Délai de réponse** | < 1h | Slack/Discord |
| **Tests passant** | 100% | CI/CD |
| **Code review delay** | < 4h | GitHub PR metrics |

---

## 🚀 Scripts utiles

### **check-sync.sh** - Vérifier la synchro

```bash
#!/bin/bash
# À lancer chaque matin

echo "🔍 Vérification de la synchronisation..."

# Git
git fetch
if [ $(git rev-parse @) != $(git rev-parse @{u}) ]; then
    echo "⚠️  Commits à pull"
else
    echo "✅ À jour"
fi

# API Contract
if git diff origin/main -- API-CONTRACT.md > /dev/null 2>&1; then
    echo "⚠️  API-CONTRACT.md modifié"
else
    echo "✅ API-CONTRACT.md inchangé"
fi
```

---

### **quick-test.sh** - Tests rapides

```bash
#!/bin/bash
# Tests d'intégration rapides (< 1 min)

echo "🧪 Tests rapides..."

# API répond
curl -s http://localhost:30443/ | grep "ok" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ API répond"
else
    echo "❌ API ne répond pas"
    exit 1
fi

# Auth fonctionne
TOKEN=$(curl -s -X POST http://localhost:30443/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  | jq -r '.token')

if [ "$TOKEN" != "null" ]; then
    echo "✅ Auth OK"
else
    echo "❌ Auth KO"
    exit 1
fi

echo "🎉 Tests OK !"
```

---

## 💡 Bonnes pratiques récapitulatives

### **Communication**

✅ **DO :**
- Daily standup 10 min chaque matin
- Notifier immédiatement les changements API
- Répondre < 1h sur Slack/Discord
- Demander de l'aide après 30 min de blocage

❌ **DON'T :**
- Coder sans lire API-CONTRACT.md
- Modifier un endpoint sans prévenir
- Ignorer les messages > 2h
- Cacher un bug

---

### **Git**

✅ **DO :**
- Commits atomiques (1 feature = 1 commit)
- Messages clairs : `feat: Add groups` `fix: Correct key consumption`
- Pull avant de push
- Tester avant de commit

❌ **DON'T :**
- Push du code qui ne compile pas
- Commits avec 10 features différentes
- Force push sur main
- Oublier de pull

---

### **Code**

✅ **DO :**
- Suivre API-CONTRACT.md à la lettre
- Commenter les parties complexes
- Gérer les erreurs
- Tests unitaires

❌ **DON'T :**
- Laisser des console.log/println
- Hardcoder des valeurs
- Ignorer les erreurs
- Code non testé

---

## 🎉 Checklist : "Êtes-vous prêts ?"

### **Setup initial**

- [ ] Repo Git cloné (les 2)
- [ ] Backend installé et tourne (DEV 1)
- [ ] Android Studio configuré (DEV 2)
- [ ] API-CONTRACT.md lu (les 2)
- [ ] WORKFLOW-2-DEVS.md lu (les 2)
- [ ] Premier test d'intégration réussi (les 2 ensemble)

### **Organisation**

- [ ] Daily standup planifié (10 min, 8h00)
- [ ] Canal Slack/Discord créé
- [ ] GitHub repo configuré
- [ ] Templates GitHub en place

### **Compréhension**

- [ ] DEV 1 comprend l'architecture Android
- [ ] DEV 2 comprend l'architecture Backend
- [ ] Les 2 comprennent le flow E2EE
- [ ] Les 2 savent utiliser leur IA (Cursor/JetBrains)

---

## 📞 Support et questions

### **Questions sur le contrat API**

→ Discussion ensemble + mise à jour API-CONTRACT.md

### **Problème technique**

→ Debug ensemble (pair programming)

### **Conflit de priorités**

→ Réunion de 15 min pour décider

### **Besoin de formation**

→ Pair programming (1h)
→ L'expert forme l'autre sur sa techno

---

## 🚀 Objectif final

**Être une équipe ultra-productive où :**

✅ L'intégration fonctionne du premier coup  
✅ Aucun bug de communication  
✅ 5-10 features/semaine livrées  
✅ Code de qualité des 2 côtés  
✅ Communication fluide et agréable  

---

## 📚 Résumé : Les 3 fichiers à lire ABSOLUMENT

| Ordre | Fichier | Quand |
|-------|---------|-------|
| **1** | **API-CONTRACT.md** | Chaque matin + avant chaque feature |
| **2** | **QUICK-START-2-DEVS.md** | Chaque matin (refresh) |
| **3** | **WORKFLOW-2-DEVS.md** | Référence quand besoin |

---

**🤝 Avec cette organisation, vous êtes prêts à construire une app incroyable ensemble ! 🚀**

**Questions ? Lisez les fichiers ci-dessus, tout y est ! 📖**
