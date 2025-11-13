# 🚀 Corrections Rapides - Sécurité

**Temps estimé:** 30 minutes  
**Impact:** Critique → Moyen

---

## 📦 Étape 1: Installer les packages de sécurité

```bash
npm install express-rate-limit helmet compression redis
```

---

## 🔧 Étape 2: Appliquer les correctifs critiques

### 1. Variables d'environnement OBLIGATOIRES

Créer/éditer `.env`:

```bash
# Générer un JWT_SECRET fort
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copier le résultat dans .env
JWT_SECRET=votre_secret_genere_ici_minimum_64_caracteres
ALLOWED_ORIGINS=http://localhost:3000,https://votredomaine.com
```

### 2. Modifications à faire dans `server.js`

**A. Import des nouveaux packages** (ligne ~8)

```javascript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
```

**B. Vérifier JWT_SECRET au démarrage** (ligne ~34)

```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ ERREUR: JWT_SECRET doit être défini et faire au moins 32 caractères');
  console.error('💡 Générez-en un avec: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}
```

**C. Activer Trust Proxy** (ligne ~14, juste après `const app = express();`)

```javascript
const app = express();

// IMPORTANT: Trust proxy si derrière Nginx/Traefik/CloudFlare
// Permet de récupérer la vraie IP du client via X-Forwarded-For
app.set('trust proxy', 1); // 1 si un seul proxy, 2 si deux proxies, etc.
```

**D. Configurer CORS** (ligne ~15)

```javascript
// Pour HTTPS en production, utiliser https:// dans ALLOWED_ORIGINS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400  // Cache preflight 24h
}));
```

**E. Ajouter les middlewares de sécurité** (après ligne ~16)

```javascript
// Helmet pour headers de sécurité
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// Compression des réponses
app.use(compression());

// Limiter taille des requêtes
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting général
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { error: 'too_many_requests', message: 'Trop de requêtes, réessayez plus tard' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting strict pour auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { error: 'too_many_requests', message: 'Trop de tentatives, réessayez dans 15 minutes' }
});

// Appliquer rate limiting
app.use('/api/', generalLimiter);
```

**F. Appliquer authLimiter sur /register et /login**

```javascript
// Ligne ~204
app.post('/register', authLimiter, async (req, res) => {
  // ... reste du code
});

// Ligne ~260
app.post('/login', authLimiter, async (req, res) => {
  // ... reste du code
});
```

**G. Ajouter validation d'email** (nouvelle fonction avant les routes)

```javascript
// Ligne ~193, avant les routes
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length >= 5 && email.length <= 180;
}

function escapeLike(str) {
  return str.replace(/[%_\\]/g, '\\$&');
}
```

**H. Utiliser la validation d'email** (dans /register et /login)

```javascript
// Dans /register (ligne ~209)
if (!email || !isValidEmail(email)) {
  return res.status(400).json({ 
    error: 'bad_request', 
    message: 'Email invalide' 
  });
}

// Dans /login (ligne ~265)
if (!email || !isValidEmail(email)) {
  return res.status(400).json({ 
    error: 'bad_request', 
    message: 'Email invalide' 
  });
}
```

**I. Corriger l'injection SQL dans /users/search** (ligne ~436)

```javascript
// Avant:
// email: { [Sequelize.Op.like]: `%${searchQuery}%` }

// Après:
const sanitizedQuery = escapeLike(searchQuery.trim());
const users = await User.findAll({
  where: {
    email: {
      [Sequelize.Op.like]: `%${sanitizedQuery}%`
    },
    id: {
      [Sequelize.Op.ne]: currentUserId
    }
  },
  attributes: ['id', 'email', 'roles', 'publicKey'],
  limit: searchLimit
});
```

**J. Améliorer Socket.IO CORS** (ligne ~20)

```javascript
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});
```

**K. Optimiser Sequelize** (ligne ~38)

```javascript
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  },
  
  define: {
    freezeTableName: true,
    underscored: true
  },
  
  dialectOptions: {
    connectTimeout: 10000
  }
});
```

---

## 🗄️ Étape 3: Optimiser la base de données

```bash
# Éditer create-indexes.sql et remplacer 'your_database_name'
# Puis exécuter:
mysql -u root -p < create-indexes.sql
```

---

## ✅ Étape 4: Vérification

### Checklist de sécurité minimale:

```bash
# 1. Vérifier que JWT_SECRET est défini et fort
grep JWT_SECRET .env

# 2. Vérifier que ALLOWED_ORIGINS est défini
grep ALLOWED_ORIGINS .env

# 3. Redémarrer le serveur
npm start

# 4. Le serveur doit crasher SI JWT_SECRET n'est pas défini
# 5. Tester avec curl (doit être bloqué)
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123"}'

# Devrait retourner erreur rate limit après 5 tentatives
```

---

## 🎯 Résultat attendu

Après ces corrections:

✅ CORS limité aux origines autorisées  
✅ JWT_SECRET obligatoire  
✅ Rate limiting actif (5 tentatives auth / 15 min)  
✅ Headers de sécurité (helmet)  
✅ Compression activée  
✅ Limite de taille des requêtes (10KB)  
✅ Validation d'email  
✅ Protection contre injection SQL  
✅ Pool de connexions optimisé  

---

## 🚨 IMPORTANT

**Avant de mettre en production:**

1. ✅ Créer un `.env` avec les vraies valeurs
2. ✅ Générer un JWT_SECRET fort (64+ caractères)
3. ✅ Définir ALLOWED_ORIGINS avec vos vrais domaines
4. ✅ Créer les index MySQL
5. ✅ Activer HTTPS (certificat SSL)
6. ✅ Tester tous les endpoints

---

## 📞 Besoin d'aide?

Consultez le rapport complet: `SERVER-SECURITY-AUDIT.md`
