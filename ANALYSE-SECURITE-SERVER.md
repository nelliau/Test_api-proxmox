# 🔍 Analyse de Sécurité - server.js

## 📋 Informations Générales

### Langage
- **JavaScript (ES6 Modules)**
- **Node.js** : v22.21.1 (version du runtime)

### Versions des Frameworks

| Framework | Version | Description |
|-----------|---------|-------------|
| **express** | ^4.19.2 | Framework web |
| **socket.io** | ^4.7.5 | WebSocket pour temps réel |
| **sequelize** | ^6.37.3 | ORM pour MySQL |
| **jsonwebtoken** | ^9.0.2 | Gestion JWT |
| **bcryptjs** | ^2.4.3 | Hashage de mots de passe |
| **cors** | ^2.8.5 | Gestion CORS |
| **dotenv** | ^16.4.5 | Variables d'environnement |
| **mysql2** | ^3.10.3 | Driver MySQL |

---

## 🚨 Failles de Sécurité Identifiées

### 🔴 **CRITIQUES**

#### 1. **CORS Trop Permissif**
```javascript
// Ligne 48-52
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',  // ⚠️ PERMET TOUTES LES ORIGINES
    methods: ['GET', 'POST']
  }
});
```
**Risque** : Permet à n'importe quel site web d'accéder à votre API
**Impact** : Attaques CSRF, vol de données
**Solution** : Restreindre aux origines autorisées uniquement

#### 2. **JWT_SECRET Par Défaut Faible**
```javascript
// Ligne 50
const JWT_SECRET = process.env.JWT_SECRET || 'YEZUUKXlcujXfJH9x/8AoEb5BtBfULyjAZdc4cV6wtj9p8A3LMujw9Y+czGvF3vGIvlthfQxe37RBmi6ZsZT3w==';
```
**Risque** : Si la variable d'environnement n'est pas définie, utilisation d'une clé hardcodée
**Impact** : Tokens JWT prévisibles, compromission de l'authentification
**Solution** : Forcer l'utilisation d'une variable d'environnement, pas de valeur par défaut

#### 3. **Erreur de Code - Template Literal Mal Formé**
```javascript
// Ligne ~370 (dans le code fourni)
console.log(✉️ Message ${message.id} sent in real-time to user ${receiverId}`);
```
**Risque** : Erreur de syntaxe qui empêche le serveur de démarrer
**Impact** : Application non fonctionnelle
**Solution** : Corriger avec des backticks : `` console.log(`✉️ Message ${message.id}...`) ``

#### 4. **Bug dans DELETE /friends/:id**
```javascript
// Ligne ~1100
if (friendRequest.requesterId !== userId && friendRequest.receiverId !== userId) {
```
**Risque** : `requesterId` n'existe pas dans le modèle (devrait être `senderId`)
**Impact** : Erreur runtime, fonctionnalité cassée
**Solution** : Utiliser `senderId` au lieu de `requesterId`

---

### 🟠 **IMPORTANTES**

#### 5. **Absence de Rate Limiting**
**Risque** : Attaques par force brute sur `/login` et `/register`
**Impact** : 
- Épuisement des ressources serveur
- Tentatives de connexion illimitées
- DDoS potentiel
**Solution** : Implémenter `express-rate-limit` sur les endpoints sensibles

#### 6. **Pas de Protection Contre les Attaques de Timing**
```javascript
// Ligne ~280
const user = await User.findOne({ where: { email } });
if (!user) {
  return res.status(401).json({ ... });
}
const isPasswordValid = await bcrypt.compare(password, user.password);
```
**Risque** : Détection de l'existence d'un email par temps de réponse
**Impact** : Énumération d'utilisateurs
**Solution** : Toujours exécuter `bcrypt.compare` même si l'utilisateur n'existe pas

#### 7. **Validation de Mot de Passe Insuffisante**
```javascript
// Ligne ~220
if (password.length < 6) {
  return res.status(400).json({ ... });
}
```
**Risque** : Mots de passe trop faibles acceptés
**Impact** : Comptes vulnérables au brute force
**Solution** : Exiger majuscules, minuscules, chiffres, caractères spéciaux, minimum 8 caractères

#### 8. **Pas de Limite de Taille pour les Requêtes**
**Risque** : Attaques par payload volumineux
**Impact** : 
- Déni de service (DoS)
- Consommation mémoire excessive
**Solution** : Configurer `express.json({ limit: '10kb' })`

#### 9. **Validation Email Insuffisante**
```javascript
// Pas de validation stricte d'email dans certains endpoints
```
**Risque** : Emails invalides acceptés
**Impact** : Données corrompues, problèmes de communication
**Solution** : Utiliser une regex stricte ou une bibliothèque de validation

#### 10. **Recherche d'Utilisateurs Sans Protection SQL Injection**
```javascript
// Ligne ~470
email: {
  [Sequelize.Op.like]: `%${searchQuery}%`
}
```
**Risque** : Bien que Sequelize protège, les caractères spéciaux LIKE (`%`, `_`) peuvent causer des problèmes
**Impact** : Résultats de recherche inattendus
**Solution** : Échapper les caractères spéciaux LIKE avant la requête

---

### 🟡 **MOYENNES**

#### 11. **Absence de Gestion d'Erreur Globale**
**Risque** : Fuite d'informations sensibles dans les erreurs
**Impact** : Exposition de détails techniques aux attaquants
**Solution** : Middleware de gestion d'erreur global avec masquage en production

#### 12. **Logs Contenant des Informations Sensibles**
```javascript
// Ligne ~240
console.log('📝 Email:', email, '- PublicKey fournie:', publicKey ? `Oui (${publicKey.length} car)` : 'Non');
```
**Risque** : Emails et clés publiques dans les logs
**Impact** : Violation RGPD, exposition de données
**Solution** : Masquer les données sensibles dans les logs

#### 13. **Pas de Validation de Longueur pour le Contenu des Messages**
```javascript
// Ligne ~330
if (typeof content !== 'string' || content.trim().length === 0) {
```
**Risque** : Messages extrêmement longs
**Impact** : 
- Surcharge de la base de données
- Consommation mémoire
**Solution** : Limiter à 10000 caractères maximum

#### 14. **Pas de Validation de la Clé Publique**
```javascript
// Ligne ~500
publicKey: publicKey || null,
```
**Risque** : Clés publiques malformées acceptées
**Impact** : Problèmes de chiffrement/déchiffrement
**Solution** : Valider le format de la clé publique (PEM, base64, etc.)

#### 15. **Pas de Protection CSRF**
**Risque** : Attaques Cross-Site Request Forgery
**Impact** : Actions non autorisées effectuées au nom de l'utilisateur
**Solution** : Implémenter des tokens CSRF ou utiliser SameSite cookies

#### 16. **Pas de Headers de Sécurité HTTP**
**Risque** : Vulnérables aux attaques XSS, clickjacking, etc.
**Impact** : Diverses attaques web
**Solution** : Utiliser `helmet` pour ajouter les headers de sécurité

#### 17. **Timeout de Connexion Socket.IO Non Configuré**
**Risque** : Connexions zombies
**Impact** : Consommation de ressources
**Solution** : Configurer `pingTimeout` et `pingInterval`

---

### 🟢 **MINEURES**

#### 18. **Pas de Validation de Type Stricte pour receiverId**
```javascript
// Ligne ~330
const { receiverId, content } = req.body || {};
```
**Risque** : Types incorrects acceptés
**Impact** : Erreurs potentielles
**Solution** : Valider que `receiverId` est un nombre

#### 19. **Pas de Limite sur la Recherche d'Utilisateurs**
```javascript
// Ligne ~470
limit: searchLimit
```
**Risque** : Bien qu'il y ait une limite, elle pourrait être trop élevée
**Impact** : Performance dégradée
**Solution** : Réduire la limite par défaut (20 est acceptable)

#### 20. **Timezone Hardcodée**
```javascript
// Ligne ~70
timezone: '+01:00',
```
**Risque** : Problèmes avec le changement d'heure (CEST/CET)
**Impact** : Dates/heures incorrectes
**Solution** : Utiliser `'Europe/Paris'` ou une variable d'environnement

---

## 📊 Résumé des Risques

| Niveau | Nombre | Exemples |
|--------|--------|----------|
| 🔴 **Critique** | 4 | CORS permissif, JWT_SECRET par défaut, bugs |
| 🟠 **Importante** | 6 | Pas de rate limiting, timing attacks, validation faible |
| 🟡 **Moyenne** | 7 | Pas de gestion d'erreur, logs sensibles, pas de CSRF |
| 🟢 **Mineure** | 3 | Validation de types, timezone |

---

## ✅ Recommandations Prioritaires

1. **URGENT** : Corriger l'erreur de syntaxe (template literal)
2. **URGENT** : Corriger le bug `requesterId` → `senderId`
3. **URGENT** : Restreindre CORS aux origines autorisées
4. **URGENT** : Forcer JWT_SECRET via variable d'environnement
5. **IMPORTANT** : Ajouter rate limiting sur `/login` et `/register`
6. **IMPORTANT** : Protéger contre les attaques de timing
7. **IMPORTANT** : Renforcer la validation des mots de passe
8. **IMPORTANT** : Limiter la taille des requêtes
9. **RECOMMANDÉ** : Ajouter `helmet` pour les headers de sécurité
10. **RECOMMANDÉ** : Masquer les données sensibles dans les logs

---

## 🔧 Corrections Suggérées

### Correction 1 : CORS
```javascript
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST']
  }
});
```

### Correction 2 : JWT_SECRET
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ ERREUR: JWT_SECRET requis (min 32 caractères)');
  process.exit(1);
}
```

### Correction 3 : Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Trop de tentatives, réessayez plus tard'
});

app.post('/login', authLimiter, ...);
app.post('/register', authLimiter, ...);
```

### Correction 4 : Protection Timing Attack
```javascript
// Toujours exécuter bcrypt.compare
const dummyHash = '$2a$13$abcdefghijklmnopqrstuv';
const passwordHash = user?.password || dummyHash;
const isPasswordValid = await bcrypt.compare(password, passwordHash);

if (!user || !isPasswordValid) {
  return res.status(401).json({ ... });
}
```

---

**Date d'analyse** : $(date)
**Version analysée** : Code fourni dans la requête utilisateur
