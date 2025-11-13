# 🔒 Analyse de Sécurité et Optimisation - server.js

**Date:** 2025-11-13  
**Fichier analysé:** `server.js`  
**Statut:** ⚠️ Plusieurs vulnérabilités critiques identifiées

---

## 🚨 VULNÉRABILITÉS DE SÉCURITÉ CRITIQUES

### 1. ⛔ CORS mal configuré (CRITIQUE)
**Ligne:** 15, 21-24  
**Problème:**
```javascript
app.use(cors());  // Accepte TOUTES les origines
io: { cors: { origin: '*' } }  // Pareil pour Socket.IO
```

**Impact:** N'importe quel site web peut faire des requêtes à votre API et voler les tokens JWT.

**Solution:**
```javascript
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400
}));

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true
  }
});
```

---

### 2. 🔑 JWT_SECRET avec valeur par défaut (CRITIQUE)
**Ligne:** 34  
**Problème:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

**Impact:** Si l'utilisateur oublie de définir JWT_SECRET, tous les tokens peuvent être forgés.

**Solution:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be defined and at least 32 characters long');
  process.exit(1);
}
```

---

### 3. 🚀 Pas de Rate Limiting (CRITIQUE)
**Problème:** Aucune limite sur les tentatives de login/register.

**Impact:**
- Attaques par force brute sur `/login`
- Spam d'inscriptions sur `/register`
- DoS par épuisement des ressources

**Solution:** Utiliser `express-rate-limit`

```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

// Rate limiter général
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: { error: 'too_many_requests', message: 'Trop de requêtes, réessayez plus tard' }
});

// Rate limiter strict pour auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentatives par 15 min
  skipSuccessfulRequests: true,
  message: { error: 'too_many_requests', message: 'Trop de tentatives de connexion' }
});

// Appliquer
app.use('/api/', generalLimiter);
app.post('/register', authLimiter, async (req, res) => { ... });
app.post('/login', authLimiter, async (req, res) => { ... });
```

---

### 4. 💉 Injection SQL via LIKE (HAUTE)
**Ligne:** 436  
**Problème:**
```javascript
email: { [Sequelize.Op.like]: `%${searchQuery}%` }
```

**Impact:** Un attaquant peut injecter des wildcards `%` et `_` pour extraire tous les emails.

**Solution:**
```javascript
// Échapper les caractères spéciaux LIKE
function escapeLike(str) {
  return str.replace(/[%_\\]/g, '\\$&');
}

// Dans la requête
const sanitizedQuery = escapeLike(searchQuery.trim());
email: { [Sequelize.Op.like]: `%${sanitizedQuery}%` }
```

---

### 5. 📧 Pas de validation d'email (MOYENNE)
**Ligne:** 204-210  
**Problème:** N'importe quelle chaîne est acceptée comme email.

**Solution:**
```javascript
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 180;
}

if (!email || !isValidEmail(email)) {
  return res.status(400).json({ 
    error: 'bad_request', 
    message: 'Email invalide' 
  });
}
```

---

### 6. 🔒 Mot de passe trop faible (MOYENNE)
**Ligne:** 213-215  
**Problème:** Minimum 6 caractères seulement.

**Solution:**
```javascript
function validatePassword(password) {
  if (password.length < 12) {
    return 'Le mot de passe doit contenir au moins 12 caractères';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une majuscule';
  }
  if (!/[a-z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une minuscule';
  }
  if (!/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un caractère spécial';
  }
  return null;
}

const passwordError = validatePassword(password);
if (passwordError) {
  return res.status(400).json({ error: 'bad_request', message: passwordError });
}
```

---

### 7. 🛡️ Pas de protection Headers HTTP (MOYENNE)
**Problème:** Aucun header de sécurité (CSP, X-Frame-Options, etc.)

**Solution:**
```bash
npm install helmet
```

```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

### 8. 📝 Logs exposent des données sensibles (MOYENNE)
**Lignes:** 205-207, 261-262  
**Problème:**
```javascript
console.log('📝 Email:', email);
console.log('🔐 Email:', email);
```

**Impact:** Les emails sont loggés en clair dans les fichiers de log.

**Solution:**
```javascript
// Masquer les données sensibles
function maskEmail(email) {
  if (!email) return 'null';
  const [local, domain] = email.split('@');
  return `${local.substring(0, 2)}***@${domain}`;
}

console.log('📝 Email:', maskEmail(email));
```

---

### 9. 📦 Pas de limite de taille des requêtes (MOYENNE)
**Ligne:** 16  
**Problème:**
```javascript
app.use(express.json());  // Pas de limite
```

**Impact:** Un attaquant peut envoyer des payloads géants et crasher le serveur.

**Solution:**
```javascript
app.use(express.json({ 
  limit: '10kb',  // Limite à 10KB
  strict: true 
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10kb' 
}));
```

---

### 10. 🔐 Pas de vérification du mot de passe lors de la suppression (BASSE)
**Problème:** Un utilisateur peut supprimer des amis sans confirmation de mot de passe.

**Solution:** Ajouter une étape de confirmation pour les actions sensibles.

---

### 11. ⏱️ Timing Attack sur bcrypt.compare (BASSE)
**Ligne:** 276  
**Problème:** Différence de temps selon si l'utilisateur existe ou non.

**Solution:**
```javascript
// Toujours faire bcrypt.compare même si user n'existe pas
const user = await User.findOne({ where: { email } });
const passwordHash = user?.password || '$2a$13$dummy.hash.to.prevent.timing.attack.xyz';

const isPasswordValid = await bcrypt.compare(password, passwordHash);

if (!user || !isPasswordValid) {
  return res.status(401).json({ 
    error: 'unauthorized', 
    message: 'Email ou mot de passe incorrect' 
  });
}
```

---

## ⚡ PROBLÈMES D'OPTIMISATION

### 1. 🗄️ Configuration Sequelize non optimale (HAUTE)
**Ligne:** 38-46  
**Problème:** Pas de configuration du pool de connexions.

**Solution:**
```javascript
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  
  // Configuration du pool
  pool: {
    max: 20,          // Max connexions
    min: 5,           // Min connexions
    acquire: 30000,   // Timeout acquisition (30s)
    idle: 10000       // Fermeture après inactivité (10s)
  },
  
  // Optimisations
  define: {
    freezeTableName: true,
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  
  // Retry logic
  retry: {
    max: 3
  },
  
  dialectOptions: {
    connectTimeout: 10000,
    // Pour production avec SSL
    // ssl: {
    //   require: true,
    //   rejectUnauthorized: true
    // }
  }
});
```

---

### 2. 📇 Manque d'index sur les colonnes fréquentes (HAUTE)
**Problème:** Les requêtes sur `email`, `senderId`, `receiverId` sont lentes sans index.

**Solution:** Créer un fichier de migration SQL

```sql
-- migrations/001_add_indexes.sql

-- Index sur User.email (déjà unique, mais s'assurer)
CREATE UNIQUE INDEX idx_user_email ON user(email);

-- Index composites pour Message
CREATE INDEX idx_message_sender_receiver ON message(sender_id, receiver_id);
CREATE INDEX idx_message_receiver_created ON message(receiver_id, created_at DESC);
CREATE INDEX idx_message_created_at ON message(created_at DESC);

-- Index composites pour FriendRequest
CREATE INDEX idx_friends_sender_receiver ON friends(sender_id, receiver_id);
CREATE INDEX idx_friends_receiver_status ON friends(receiver_id, status);
CREATE INDEX idx_friends_status ON friends(status);

-- Index pour recherche rapide des amis
CREATE INDEX idx_friends_sender_status ON friends(sender_id, status);

-- Performance boost sur jointures
ANALYZE TABLE user;
ANALYZE TABLE message;
ANALYZE TABLE friends;
```

---

### 3. 🔄 Requêtes N+1 potentielles (MOYENNE)
**Lignes:** 355-358, 702-713  
**Problème:** Les includes peuvent générer des requêtes multiples.

**Solution:** Utiliser eager loading et optimiser

```javascript
// Avant
const messages = await Message.findAll({
  include: [
    { model: User, as: 'sender', attributes: ['id', 'email'] },
    { model: User, as: 'receiver', attributes: ['id', 'email'] }
  ]
});

// Après - avec subQuery pour éviter N+1
const messages = await Message.findAll({
  include: [
    { 
      model: User, 
      as: 'sender', 
      attributes: ['id', 'email'],
      required: false  // LEFT JOIN au lieu de INNER JOIN
    },
    { 
      model: User, 
      as: 'receiver', 
      attributes: ['id', 'email'],
      required: false
    }
  ],
  subQuery: false,  // Évite les requêtes multiples
  distinct: true
});
```

---

### 4. 💾 Pas de système de cache (MOYENNE)
**Problème:** Les mêmes requêtes sont refaites à chaque fois.

**Solution:** Utiliser Redis

```bash
npm install redis
```

```javascript
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

await redis.connect();

// Middleware de cache
async function cacheMiddleware(key, ttl = 60) {
  return async (req, res, next) => {
    const cacheKey = `${key}:${req.user?.userId || 'anon'}:${JSON.stringify(req.query)}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Wrapper pour capturer la réponse
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        redis.setEx(cacheKey, ttl, JSON.stringify(data)).catch(console.error);
        return originalJson(data);
      };
      
      next();
    } catch (err) {
      console.error('Cache error:', err);
      next();
    }
  };
}

// Utilisation
app.get('/friends', 
  authenticateJWT, 
  cacheMiddleware('friends', 300),  // Cache 5 min
  async (req, res) => { ... }
);
```

---

### 5. 🗜️ Pas de compression des réponses (MOYENNE)
**Problème:** Les réponses JSON ne sont pas compressées.

**Solution:**
```bash
npm install compression
```

```javascript
import compression from 'compression';

app.use(compression({
  level: 6,  // Niveau de compression (0-9)
  threshold: 1024,  // Compresser seulement si > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

---

### 6. 📊 connectedUsers en mémoire (HAUTE)
**Ligne:** 870  
**Problème:** Pas scalable avec plusieurs instances du serveur.

**Solution:** Utiliser Redis pour partager l'état

```javascript
// Stocker dans Redis au lieu de Map
async function setUserSocket(userId, socketId) {
  await redis.setEx(`socket:${userId}`, 3600, socketId);
}

async function getUserSocket(userId) {
  return await redis.get(`socket:${userId}`);
}

async function deleteUserSocket(userId) {
  await redis.del(`socket:${userId}`);
}

// Dans Socket.IO
socket.on('authenticate', async (data) => {
  // ...
  await setUserSocket(userId, socket.id);
  // ...
});

socket.on('disconnect', async () => {
  if (socket.userId) {
    await deleteUserSocket(socket.userId);
  }
});
```

---

### 7. 📄 Pagination inconsistante (MOYENNE)
**Problème:** Certains endpoints ont limit, d'autres non.

**Solution:** Standardiser la pagination

```javascript
function getPagination(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Utilisation
app.get('/messages', authenticateJWT, async (req, res) => {
  const { page, limit, offset } = getPagination(req);
  
  const { count, rows } = await Message.findAndCountAll({
    where: { ... },
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });
  
  res.json({
    data: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
});
```

---

### 8. 🚫 Pas de gestion des erreurs centralisée (MOYENNE)
**Problème:** Code dupliqué pour gérer les erreurs.

**Solution:**
```javascript
// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'validation_error',
      message: err.errors.map(e => e.message).join(', ')
    });
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'conflict',
      message: 'Cette ressource existe déjà'
    });
  }
  
  res.status(500).json({
    error: 'internal_error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Erreur interne du serveur' 
      : err.message
  });
});

// Wrapper async pour éviter try/catch partout
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Utilisation
app.post('/messages', authenticateJWT, asyncHandler(async (req, res) => {
  // Plus besoin de try/catch !
  const message = await Message.create({ ... });
  res.status(201).json(message);
}));
```

---

### 9. 📈 Pas de monitoring (BASSE)
**Problème:** Aucune métrique sur les performances.

**Solution:**
```bash
npm install prom-client
```

```javascript
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Middleware de monitoring
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Endpoint de métriques
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## 🎯 PLAN D'ACTION PRIORITAIRE

### Phase 1 - URGENT (< 1 jour)
1. ✅ Corriger CORS
2. ✅ Retirer valeur par défaut JWT_SECRET
3. ✅ Ajouter rate limiting
4. ✅ Ajouter helmet
5. ✅ Limiter taille des requêtes

### Phase 2 - IMPORTANT (< 1 semaine)
1. ✅ Ajouter validation d'email
2. ✅ Renforcer politique de mots de passe
3. ✅ Corriger injection SQL dans LIKE
4. ✅ Configurer pool Sequelize
5. ✅ Ajouter index MySQL

### Phase 3 - AMÉLIORATION (< 1 mois)
1. ✅ Implémenter cache Redis
2. ✅ Ajouter compression
3. ✅ Migrer connectedUsers vers Redis
4. ✅ Standardiser pagination
5. ✅ Centraliser gestion d'erreurs

### Phase 4 - ÉVOLUTION (backlog)
1. Ajouter monitoring/métriques
2. Implémenter clustering
3. Ajouter tests automatisés
4. Documentation API (OpenAPI/Swagger)
5. CI/CD pipeline

---

## 📋 CHECKLIST PRÉ-PRODUCTION

- [ ] Variables d'environnement définies (JWT_SECRET, ALLOWED_ORIGINS)
- [ ] HTTPS activé via reverse proxy (Nginx/Traefik)
- [ ] `app.set('trust proxy', 1)` activé dans Express
- [ ] Rate limiting configuré avec vraie IP client
- [ ] ALLOWED_ORIGINS en HTTPS uniquement
- [ ] Logs centralisés (ex: Winston + ELK)
- [ ] Monitoring actif (Prometheus + Grafana)
- [ ] Backups automatiques de la DB
- [ ] Index MySQL créés
- [ ] Redis configuré
- [ ] Tests de charge effectués
- [ ] Documentation à jour
- [ ] Certificat SSL valide (Let's Encrypt)
- [ ] Headers de sécurité (HSTS, CSP, etc.)
- [ ] Socket.IO fonctionne en WSS

---

## 🔗 RESSOURCES

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Sequelize Best Practices](https://sequelize.org/docs/v6/other-topics/optimistic-locking/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**⚠️ AVERTISSEMENT:** Ce serveur ne doit PAS être mis en production sans corriger au minimum les vulnérabilités critiques (Phase 1).
