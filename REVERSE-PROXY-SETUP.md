# 🔒 Configuration HTTPS avec Reverse Proxy

**Contexte:** Votre API Node.js sera derrière un reverse proxy (Nginx, Apache, Traefik, Caddy...) qui gère le SSL/TLS.

---

## 🎯 Architecture

```
Internet (HTTPS) 
    ↓
[Reverse Proxy] (443) → Gère SSL/TLS
    ↓
[Node.js API] (3000) → HTTP uniquement
```

---

## ⚙️ Configuration Express pour Reverse Proxy

### 1. Activer Trust Proxy

**Dans `server.js`, après la création de l'app Express (ligne ~14):**

```javascript
const app = express();

// IMPORTANT: Trust proxy pour récupérer la vraie IP du client
// Si vous utilisez plusieurs proxies (ex: CloudFlare + Nginx), mettre le nombre
app.set('trust proxy', 1); // 1 si un seul proxy
// app.set('trust proxy', 2); // Si 2 proxies (ex: CDN + nginx)
// app.set('trust proxy', true); // Trust all (déconseillé en prod)

app.use(cors());
// ... reste du code
```

### 2. Variables d'environnement (`.env`)

```bash
# Indiquer qu'on est derrière un proxy
TRUST_PROXY=1

# Origines HTTPS autorisées
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com

# Mode production
NODE_ENV=production
```

### 3. Mise à jour du CORS

```javascript
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://yourdomain.com'  // Défaut en HTTPS
];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser requests sans origin (mobile apps, Postman)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400
}));
```

### 4. Mise à jour Socket.IO

```javascript
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST']
  },
  
  // Configuration pour reverse proxy
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  
  // Timeouts adaptés
  pingTimeout: 60000,
  pingInterval: 25000,
  
  // Important pour sticky sessions si load balancer
  cookie: {
    name: 'io',
    path: '/',
    httpOnly: true,
    sameSite: 'lax'
  }
});
```

### 5. Rate Limiting avec vraie IP

```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  
  // IMPORTANT: Utiliser la vraie IP du client (pas celle du proxy)
  keyGenerator: (req) => {
    // req.ip prendra automatiquement X-Forwarded-For si trust proxy activé
    return req.ip;
  },
  
  message: { 
    error: 'too_many_requests', 
    message: 'Trop de tentatives, réessayez dans 15 minutes' 
  },
  
  // Headers standards
  standardHeaders: true,
  legacyHeaders: false,
  
  // Handler personnalisé
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'too_many_requests',
      message: 'Trop de requêtes, réessayez plus tard',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});
```

### 6. Headers de sécurité adaptés

```javascript
import helmet from 'helmet';

app.use(helmet({
  // HSTS - Force HTTPS (géré par le proxy)
  hsts: {
    maxAge: 31536000, // 1 an
    includeSubDomains: true,
    preload: true
  },
  
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...ALLOWED_ORIGINS],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  },
  
  // Autres protections
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
```

---

## 🌐 Configuration Nginx (Exemple)

### Configuration complète `/etc/nginx/sites-available/api.yourdomain.com`

```nginx
# Upstream vers votre API Node.js
upstream nodejs_api {
    # Plusieurs instances pour load balancing (optionnel)
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    # server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    
    # Sticky sessions pour Socket.IO (important !)
    ip_hash;
}

# Redirection HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;
    
    # Rediriger tout vers HTTPS
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;
    
    # Logs
    access_log /var/log/nginx/api_access.log;
    error_log /var/log/nginx/api_error.log;
    
    # ============================================================================
    # SSL/TLS Configuration
    # ============================================================================
    
    # Certificats (Let's Encrypt recommandé)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # Protocoles et ciphers modernes
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    
    # SSL Session Cache
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/api.yourdomain.com/chain.pem;
    
    # ============================================================================
    # Headers de sécurité
    # ============================================================================
    
    # HSTS - Force HTTPS pour 1 an
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Protection contre clickjacking
    add_header X-Frame-Options "DENY" always;
    
    # Protection XSS
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Référence policy
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Permissions policy
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # ============================================================================
    # Configuration Proxy
    # ============================================================================
    
    # Taille max des uploads
    client_max_body_size 10M;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # Buffers
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    proxy_busy_buffers_size 8k;
    
    # ============================================================================
    # WebSocket pour Socket.IO
    # ============================================================================
    
    location /socket.io/ {
        proxy_pass http://nodejs_api;
        
        # Headers essentiels pour WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers standards
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Timeouts adaptés pour WebSocket
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # ============================================================================
    # API REST
    # ============================================================================
    
    location / {
        proxy_pass http://nodejs_api;
        
        # Headers pour identifier le client
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Désactiver buffering pour les réponses en streaming
        proxy_buffering off;
    }
    
    # ============================================================================
    # Healthcheck endpoint (optionnel)
    # ============================================================================
    
    location /health {
        access_log off;
        proxy_pass http://nodejs_api;
        proxy_set_header Host $host;
    }
}
```

### Tester la configuration Nginx

```bash
# Vérifier la syntaxe
sudo nginx -t

# Recharger sans downtime
sudo nginx -s reload

# Voir les logs en temps réel
sudo tail -f /var/log/nginx/api_error.log
```

---

## 🔐 Certificat SSL avec Let's Encrypt (Certbot)

### Installation Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

### Obtenir un certificat

```bash
# Automatique (recommandé)
sudo certbot --nginx -d api.yourdomain.com

# Manuel (si Nginx déjà configuré)
sudo certbot certonly --nginx -d api.yourdomain.com

# Renouvellement automatique (cron job)
sudo certbot renew --dry-run  # Test
echo "0 0,12 * * * root certbot renew --quiet" | sudo tee -a /etc/crontab
```

---

## 🧪 Tests de configuration

### 1. Tester SSL/TLS

```bash
# Test avec curl
curl -I https://api.yourdomain.com

# Test SSL (doit avoir A+)
# https://www.ssllabs.com/ssltest/analyze.html?d=api.yourdomain.com
```

### 2. Vérifier les headers

```bash
curl -I https://api.yourdomain.com | grep -E "(Strict-Transport|X-Frame|X-Content)"
```

**Attendu:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

### 3. Tester Socket.IO avec HTTPS

```bash
# Installer wscat
npm install -g wscat

# Tester WebSocket
wscat -c "wss://api.yourdomain.com/socket.io/?EIO=4&transport=websocket"
```

### 4. Vérifier la vraie IP

Créer un endpoint de debug temporaire:

```javascript
// Dans server.js (à retirer en prod !)
app.get('/debug/ip', (req, res) => {
  res.json({
    ip: req.ip,
    ips: req.ips,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip']
    }
  });
});
```

```bash
curl https://api.yourdomain.com/debug/ip
# Doit retourner votre vraie IP publique
```

---

## 🚀 Configuration Traefik (Alternative à Nginx)

Si vous utilisez Docker + Traefik:

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  api:
    build: .
    environment:
      - NODE_ENV=production
      - TRUST_PROXY=1
      - JWT_SECRET=${JWT_SECRET}
      - ALLOWED_ORIGINS=https://yourdomain.com
    labels:
      # Activer Traefik
      - "traefik.enable=true"
      
      # Router HTTP → HTTPS redirect
      - "traefik.http.routers.api-http.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.api-http.entrypoints=web"
      - "traefik.http.routers.api-http.middlewares=redirect-to-https"
      
      # Router HTTPS
      - "traefik.http.routers.api-https.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.api-https.entrypoints=websecure"
      - "traefik.http.routers.api-https.tls=true"
      - "traefik.http.routers.api-https.tls.certresolver=letsencrypt"
      
      # Service
      - "traefik.http.services.api.loadbalancer.server.port=3000"
      
      # Middlewares
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.permanent=true"
    networks:
      - traefik

networks:
  traefik:
    external: true
```

---

## 📋 Checklist finale

- [ ] `app.set('trust proxy', 1)` dans server.js
- [ ] `ALLOWED_ORIGINS` contient les URLs en HTTPS
- [ ] Rate limiting utilise `req.ip` (pas `req.connection.remoteAddress`)
- [ ] Nginx configuré avec `X-Forwarded-*` headers
- [ ] Certificat SSL installé et valide
- [ ] Redirection HTTP → HTTPS active
- [ ] Socket.IO fonctionne en WSS (WebSocket Secure)
- [ ] Test SSL obtient A+ sur SSLLabs
- [ ] Headers de sécurité présents
- [ ] HSTS activé
- [ ] La vraie IP du client est bien détectée

---

## ⚠️ Pièges courants

### 1. Rate limiting bloque le proxy au lieu du client
**Symptôme:** Tous les clients sont bloqués ensemble  
**Cause:** `trust proxy` pas activé  
**Solution:** `app.set('trust proxy', 1)`

### 2. Socket.IO ne se connecte pas
**Symptôme:** Erreur 400 Bad Request  
**Cause:** Nginx ne passe pas les headers WebSocket  
**Solution:** Ajouter `proxy_set_header Upgrade` et `Connection "upgrade"`

### 3. CORS bloque les requêtes
**Symptôme:** Erreur CORS malgré bonne config  
**Cause:** `ALLOWED_ORIGINS` contient `http://` au lieu de `https://`  
**Solution:** Vérifier que toutes les origines sont en HTTPS

### 4. Sticky sessions cassées
**Symptôme:** Socket.IO se déconnecte aléatoirement  
**Cause:** Load balancer sans sticky sessions  
**Solution:** Ajouter `ip_hash;` dans Nginx ou utiliser Redis adapter

---

## 🔗 Ressources

- [Nginx Best Practices](https://www.nginx.com/resources/wiki/start/topics/tutorials/config_pitfalls/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Socket.IO Behind Nginx](https://socket.io/docs/v4/reverse-proxy/)
- [Express Behind Proxies](https://expressjs.com/en/guide/behind-proxies.html)

---

**✅ Une fois configuré, votre API sera accessible en HTTPS avec un grade A+ en sécurité !**
