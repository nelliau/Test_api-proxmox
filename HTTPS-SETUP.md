# Configuration HTTPS pour l'API

Ce guide explique comment configurer HTTPS sur votre serveur API.

## Méthode 1 : Certificat Let's Encrypt (Production - Recommandé)

### Étape 1 : Installer Certbot

```bash
# Sur Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot

# Sur CentOS/RHEL
sudo yum install certbot
```

### Étape 2 : Obtenir un certificat

```bash
# Pour un domaine avec validation HTTP
sudo certbot certonly --standalone -d votre-domaine.com -d www.votre-domaine.com

# Ou avec validation DNS (si vous ne pouvez pas exposer le port 80)
sudo certbot certonly --manual --preferred-challenges dns -d votre-domaine.com
```

Les certificats seront générés dans :
- **Clé privée** : `/etc/letsencrypt/live/votre-domaine.com/privkey.pem`
- **Certificat** : `/etc/letsencrypt/live/votre-domaine.com/fullchain.pem`

### Étape 3 : Configurer le fichier .env

```env
SSL_KEY_PATH=/etc/letsencrypt/live/votre-domaine.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/votre-domaine.com/fullchain.pem
PORT=3000
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com
```

### Étape 4 : Renouvellement automatique

Les certificats Let's Encrypt expirent après 90 jours. Configurez un renouvellement automatique :

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Ajouter une tâche cron (renouvellement automatique)
sudo crontab -e
# Ajouter cette ligne :
0 0 * * * certbot renew --quiet && systemctl reload votre-service
```

## Méthode 2 : Certificat auto-signé (Développement/Test)

⚠️ **Attention** : Les certificats auto-signés ne sont pas sécurisés pour la production. Ils génèrent des avertissements dans les navigateurs.

### Étape 1 : Générer un certificat auto-signé

```bash
# Créer un répertoire pour les certificats
mkdir -p ssl

# Générer la clé privée et le certificat
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout ssl/private.key \
  -out ssl/certificate.crt \
  -days 365 \
  -subj "/C=FR/ST=State/L=City/O=Organization/CN=localhost"

# Sécuriser les permissions
chmod 600 ssl/private.key
chmod 644 ssl/certificate.crt
```

### Étape 2 : Configurer le fichier .env

```env
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
PORT=3000
ALLOWED_ORIGINS=https://localhost:3000,http://localhost:3000
```

## Méthode 3 : Certificat d'un fournisseur commercial

Si vous avez acheté un certificat SSL :

1. **Téléchargez les fichiers** de votre fournisseur :
   - Clé privée (`.key` ou `.pem`)
   - Certificat (`.crt` ou `.pem`)
   - Chaîne de certificats (optionnel, `.ca-bundle` ou `.chain`)

2. **Placez-les dans un répertoire sécurisé** :
   ```bash
   mkdir -p /etc/ssl/your-domain
   chmod 700 /etc/ssl/your-domain
   # Copiez vos fichiers ici
   ```

3. **Configurez le fichier .env** :
   ```env
   SSL_KEY_PATH=/etc/ssl/your-domain/private.key
   SSL_CERT_PATH=/etc/ssl/your-domain/certificate.crt
   SSL_CA_PATH=/etc/ssl/your-domain/ca_bundle.crt  # Optionnel
   ```

## Vérification

Une fois configuré, redémarrez votre serveur. Vous devriez voir :

```
🔒 HTTPS server configured
 - SSL Key: /chemin/vers/votre/private.key
 - SSL Cert: /chemin/vers/votre/certificate.crt
✅ Server running on HTTPS://127.0.0.1:3000 (internal only)
```

## Utilisation avec un Reverse Proxy (Nginx/Apache)

Si vous utilisez Nginx ou Apache comme reverse proxy :

1. **Configurez HTTPS sur le reverse proxy** (pas sur Node.js)
2. **Laissez Node.js en HTTP** (sur localhost)
3. **Le reverse proxy gère SSL/TLS** et transmet les requêtes en HTTP à Node.js

Dans ce cas, **ne configurez pas SSL_KEY_PATH et SSL_CERT_PATH** dans votre `.env`.

### Exemple Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Dépannage

### Erreur : "ENOENT: no such file or directory"
- Vérifiez que les chemins dans `.env` sont corrects
- Vérifiez que les fichiers existent et sont lisibles

### Erreur : "EACCES: permission denied"
- Vérifiez les permissions des fichiers :
  ```bash
  chmod 600 ssl/private.key
  chmod 644 ssl/certificate.crt
  ```

### Le serveur démarre en HTTP au lieu de HTTPS
- Vérifiez que `SSL_KEY_PATH` et `SSL_CERT_PATH` sont définis dans `.env`
- Vérifiez que les fichiers existent aux chemins spécifiés
- Redémarrez le serveur après modification de `.env`

### Certificat expiré
- Pour Let's Encrypt : `sudo certbot renew`
- Pour certificats commerciaux : renouvelez auprès de votre fournisseur
