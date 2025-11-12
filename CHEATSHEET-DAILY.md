# 📋 Aide-mémoire quotidien - À afficher sur votre bureau !

## ⏰ Planning de la journée

```
08h00 - 08h15 : ☕ Daily standup (10 min)
08h15 - 12h00 : 💻 Dev parallèle
12h00 - 13h00 : 🍽️  Pause déjeuner
13h00 - 15h00 : 💻 Dev parallèle
15h00 - 15h15 : 🔄 Point sync rapide
15h15 - 16h30 : 💻 Dev parallèle
16h30 - 17h30 : 🧪 Tests d'intégration (ensemble)
17h30 - 17h45 : 📝 Recap + docs
```

---

## 🔥 Règle d'or

> **Avant TOUTE modification, lire `API-CONTRACT.md` !**

---

## ✅ Checklist matin (5 min)

```bash
□ git pull origin main
□ Lire API-CONTRACT.md (vérifier "Dernière mise à jour")
□ Lire les commits de l'autre (git log --oneline -5)
□ Vérifier Slack/Discord
□ Daily standup (10 min)
```

---

## 🎯 Workflow nouvelle feature

```
1. Discussion ensemble (30 min)
   → Mettre à jour API-CONTRACT.md
   → Commit API-CONTRACT.md

2. Dev parallèle
   DEV 1: feature/xxx-api
   DEV 2: feature/xxx-android

3. Tests ensemble (1h)
   → Merge → Test → Fix → Push
```

---

## 💻 Commandes essentielles

### **DEV 1 (Backend)**

```bash
# Lancer serveur
node server-e2ee.js

# Test rapide
curl http://localhost:30443/

# Logs BDD
mysql -u API -p Dashkey_test
```

### **DEV 2 (Android)**

```bash
# Build + install
./gradlew installDebug

# Logs temps réel
adb logcat | grep "DashKey"

# Reset app
adb shell pm clear com.example.dashkey
```

---

## 📝 Message à l'IA

### **Cursor (DEV 1)**

```
"Lis API-CONTRACT.md avant de coder.
 Implémente EXACTEMENT ce qui est décrit.
 Si tu veux modifier, demande-moi d'abord."
```

### **JetBrains (DEV 2)**

```
"Lis API-CONTRACT.md avant de coder.
 Utilise EXACTEMENT les formats spécifiés.
 Si l'API ne répond pas comme attendu, signale-le."
```

---

## 🚨 En cas de problème

| Problème | Action |
|----------|--------|
| API ne répond pas | DEV 2 → Demander à DEV 1 de lancer |
| 401 Unauthorized | Se reconnecter (POST /login) |
| 404 Not Found | Vérifier URL dans API-CONTRACT.md |
| Message ne déchiffre pas | Debug ensemble |
| Conflit Git | Résoudre ensemble |

---

## 💬 Communication

```
Slack/Discord : Réponse < 1h
Blocage > 30 min : Appel vocal
Bug critique : Réunion immédiate
```

---

## ✅ Avant chaque commit

**DEV 1 :**
```
□ Code testé (Postman/curl)
□ API-CONTRACT.md à jour si modif
□ Pas de console.log oubliés
□ Message commit clair
```

**DEV 2 :**
```
□ App build sans erreurs
□ Testée sur émulateur/device
□ Gestion erreurs API OK
□ Pas de println oubliés
□ Message commit clair
```

---

## 🎯 Objectifs

```
Par jour   : 1-2 features OU 5-10 bugs
Par semaine : 5-10 features complètes
Bugs intégration : < 2 par semaine
Tests : 100% passent
```

---

## 📚 Fichiers clés

```
1. API-CONTRACT.md       → Source de vérité
2. QUICK-START-2-DEVS.md → Guide rapide
3. WORKFLOW-2-DEVS.md    → Workflow complet
```

---

## 💡 Tips

✅ Communiquer tôt et souvent  
✅ Tester avant de commit  
✅ Demander de l'aide rapidement  
✅ Lire le code de l'autre  

❌ Modifier l'API sans prévenir  
❌ Push du code qui ne compile pas  
❌ Ignorer les messages > 2h  
❌ Cacher un bug  

---

## 🎉 Mantra de l'équipe

> **"1 contrat, 2 devs, 0 surprise !"**

---

**📌 Imprimer et afficher à côté de votre écran ! 🖥️**
