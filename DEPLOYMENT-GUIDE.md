# 🚀 Guide de Déploiement Production

## ⚙️ Configuration de votre serveur

### 1. Prérequis

Votre infrastructure :
- ✅ Serveur Node.js sur conteneur Proxmox
- ✅ Base de données MySQL externe
- ✅ Routeur pfSense avec port forwarding
- ✅ Port externe : `30443` → Port interne : `30443`

---

## 📝 Étape 1 : Configuration du serveur

### Fichier .env à créer sur le serveur

```bash
# Se connecter au conteneur Proxmox
ssh root@10.0.206.254

# Aller dans le dossier du projet
cd /chemin/vers/Test_api-proxmox

# Créer le fichier .env
nano .env
```

**Contenu du .env :**
```env
# Port sur lequel le serveur écoute
PORT=30443

# Votre base de données MySQL externe
DB_HOST=adresse_ip_mysql
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
DB_NAME=Dashkey_test

# Clé secrète JWT (générer une clé unique et forte)
JWT_SECRET=votre_cle_secrete_tres_longue_et_aleatoire
JWT_EXPIRES_IN=7d
```

**💡 Générer une clé JWT_SECRET forte :**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🔥 Étape 2 : Démarrage du serveur

### Option A : Service systemd (recommandé)

```bash
# Installer le service
sudo ./install-service.sh

# Modifier le service pour utiliser le bon port
sudo nano /etc/systemd/system/test-api.service

# S'assurer que le fichier contient :
# Environment="PORT=30443"

# Recharger systemd
sudo systemctl daemon-reload

# Démarrer le service
sudo systemctl start test-api

# Vérifier le statut
sudo systemctl status test-api

# Activer au démarrage
sudo systemctl enable test-api
```

### Option B : Démarrage manuel (test)

```bash
# Installer les dépendances
npm install

# Démarrer le serveur
PORT=30443 npm start
```

Vous devriez voir :
```
✅ Server listening on port 30443
📡 Socket.IO ready for real-time messaging
🔐 JWT authentication enabled
```

---

## 🌐 Étape 3 : Vérifier la configuration réseau

### Test depuis l'intérieur du réseau

```bash
# Depuis le serveur Proxmox
curl http://10.0.206.254:30443/

# Devrait retourner :
# {"status":"ok","message":"Realtime Messaging API"}
```

### Test depuis Internet (WAN)

```bash
# Depuis n'importe quel ordinateur sur Internet
curl http://VOTRE_IP_WAN:30443/

# Devrait retourner la même chose
```

**⚠️ Si ça ne marche pas :**
1. Vérifier le port forwarding sur pfSense
2. Vérifier le firewall du conteneur Proxmox
3. Vérifier que le serveur écoute sur `0.0.0.0` et non `localhost`

---

## 🔧 Étape 4 : Firewall (si nécessaire)

### Sur le conteneur Proxmox

```bash
# Autoriser le port 30443
sudo ufw allow 30443/tcp

# Vérifier le statut
sudo ufw status
```

### Sur pfSense

Vérifier que la règle de port forwarding est bien configurée :
- **Interface :** WAN
- **Protocol :** TCP
- **Destination port :** 30443
- **Redirect target IP :** 10.0.206.254
- **Redirect target port :** 30443

---

## 📱 Étape 5 : Configuration Android

### Dans votre app Android (RetrofitClient.kt)

```kotlin
object RetrofitClient {
    // URL de production (accessible depuis Internet)
    private const val BASE_URL = "http://VOTRE_IP_WAN:30443/"
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val api: MessagingApi = retrofit.create(MessagingApi::class.java)
}
```

### Socket.IO dans votre app

```kotlin
// Connexion Socket.IO
val socket = IO.socket("http://VOTRE_IP_WAN:30443")
socket.connect()
```

**⚠️ Note :** Remplacez `VOTRE_IP_WAN` par votre vraie IP WAN (voir votre fichier `CONFIG-PRODUCTION.md` local)

---

## 🧪 Étape 6 : Tests de production

### 1. Test Health Check

```bash
curl http://VOTRE_IP_WAN:30443/
```

### 2. Test Inscription

```bash
curl -X POST http://VOTRE_IP_WAN:30443/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Test depuis Android

Lancez votre application Android et essayez :
1. Créer un compte
2. Se connecter
3. Envoyer un message

---

## 🔒 Étape 7 : Sécurisation (recommandé)

### Option A : Nginx avec SSL (recommandé pour production)

```bash
# Installer Nginx
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# Configurer Nginx
sudo nano /etc/nginx/sites-available/messaging-api

# Contenu :
server {
    listen 30443 ssl http2;
    server_name VOTRE_IP_WAN;
    
    # Certificat SSL (à générer avec Let's Encrypt ou autre)
    ssl_certificate /chemin/vers/cert.crt;
    ssl_certificate_key /chemin/vers/cert.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}

# Activer la configuration
sudo ln -s /etc/nginx/sites-available/messaging-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option B : Rester en HTTP (moins sécurisé)

Si vous restez en HTTP :
1. ✅ Assurez-vous que `usesCleartextTraffic="true"` est dans AndroidManifest.xml
2. ⚠️ Les données (dont les mots de passe) transitent en clair
3. 💡 Recommandé uniquement pour les tests

---

## 📊 Étape 8 : Monitoring

### Voir les logs en temps réel

```bash
# Si service systemd
sudo journalctl -u test-api -f

# Si PM2
pm2 logs messaging-api

# Si démarrage manuel
# Les logs s'affichent directement dans le terminal
```

### Vérifier le statut du service

```bash
sudo systemctl status test-api
```

---

## 🆘 Dépannage

### Le serveur ne démarre pas sur le port 30443

```bash
# Vérifier si le port est déjà utilisé
sudo lsof -i :30443

# Vérifier les permissions
# Le serveur doit tourner en root pour écouter sur un port < 32768
# Ou configurer les capabilities :
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

### L'API n'est pas accessible depuis Internet

1. Tester depuis le serveur local :
   ```bash
   curl http://localhost:30443/
   ```

2. Tester depuis le réseau interne :
   ```bash
   curl http://10.0.206.254:30443/
   ```

3. Vérifier pfSense :
   - Rules > WAN > Vérifier la règle de port forwarding
   - Diagnostics > States > Vérifier les connexions actives

4. Vérifier le firewall :
   ```bash
   sudo ufw status
   sudo iptables -L -n
   ```

### Socket.IO ne fonctionne pas

1. Vérifier que le serveur tourne : `sudo systemctl status test-api`
2. Vérifier les logs : `sudo journalctl -u test-api -f`
3. Vérifier que le client s'authentifie bien avec JWT
4. Vérifier que CORS est bien configuré dans server.js

---

## ✅ Checklist de déploiement

- [ ] Fichier `.env` créé avec les bonnes valeurs
- [ ] JWT_SECRET généré et unique
- [ ] Base de données MySQL accessible depuis le serveur
- [ ] Port 30443 ouvert dans le firewall
- [ ] Service systemd installé et démarré
- [ ] Health check fonctionne depuis Internet
- [ ] Test d'inscription réussi
- [ ] Test de connexion réussi
- [ ] Application Android configurée avec la bonne URL
- [ ] Tests de messagerie temps réel OK
- [ ] (Optionnel) SSL/HTTPS configuré

---

## 📞 URLs finales

**Depuis Internet (Android) :**
- Base URL : `http://VOTRE_IP_WAN:30443/`
- Endpoints : `/register`, `/login`, `/me`, `/messages`
- Socket.IO : `http://VOTRE_IP_WAN:30443`

**⚠️ Remplacez `VOTRE_IP_WAN` par votre vraie IP (voir CONFIG-PRODUCTION.md)**

---

Votre API de messagerie est maintenant déployée en production ! 🎉
