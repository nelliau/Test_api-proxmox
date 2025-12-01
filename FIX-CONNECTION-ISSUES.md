# 🔧 Résolution des problèmes de connexion API Dashkey

## 🎯 Problème actuel

✅ Le serveur HTTPS fonctionne (accessible via l'URL)  
❌ L'API ne communique plus avec le proxy  
❌ L'API ne communique plus avec la base de données

---

## 🔍 Causes probables

### 1. **HOST=127.0.0.1 (Problème principal)**

Si votre `.env` contient `HOST=127.0.0.1` ou si cette variable n'est pas définie, votre API **écoute uniquement sur localhost**.

**Conséquences :**
- ✅ Accessible localement (`curl https://localhost:3000`)
- ❌ **PAS accessible depuis le proxy/reverse proxy**
- ❌ **PAS accessible depuis d'autres machines du réseau**

**Solution :** Utiliser `HOST=0.0.0.0` pour écouter sur toutes les interfaces réseau.

### 2. **Problème de connectivité réseau avec la BDD**

Votre base de données est sur `192.168.105.3`. Si l'API ne peut pas s'y connecter :
- Problème de pare-feu
- Problème de routage réseau
- Base de données non démarrée

### 3. **Configuration CORS incorrecte**

Votre CORS contient `https://dashkey.fr:30443` mais peut-être manque-t-il d'autres origines.

---

## ✅ SOLUTION COMPLÈTE

### Étape 1 : Mettre à jour le fichier .env

Sur votre VM, éditez le fichier `.env` :

```bash
nano .env
```

**Modifiez ou ajoutez cette ligne critique :**

```env
# ⚠️ CHANGEMENT IMPORTANT : Écouter sur toutes les interfaces
HOST=0.0.0.0
```

**Configuration complète recommandée :**

```env
# ============================================================================
# SERVER CONFIGURATION
# ============================================================================
PORT=3000
HOST=0.0.0.0          # ← IMPORTANT : 0.0.0.0 pour être accessible par le proxy
NODE_ENV=production
DOMAIN=dashkey.fr

# ============================================================================
# SSL/TLS CONFIGURATION
# ============================================================================
SSL_KEY_PATH=/etc/ssl/private/API.Dashkey.key
SSL_CERT_PATH=/home/API.Dashkey.Sign.crt
SSL_CA_PATH=/home/CA_DASHKEY.crt

# ============================================================================
# CORS CONFIGURATION
# ============================================================================
# Ajoutez toutes vos origines (avec et sans port)
ALLOWED_ORIGINS=https://dashkey.fr:30443,https://dashkey.fr,https://www.dashkey.fr

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
DB_HOST=192.168.105.3
DB_PORT=3306
DB_USER=API
DB_PASSWORD='G7!k9#vR2qX$u8LmZ4tPf3Y'
DB_NAME=Dashkey_test

# ============================================================================
# JWT CONFIGURATION
# ============================================================================
JWT_SECRET='YEZUUKXlcujXfJH9x/8AoEb5BtBfULyjAZdc4cV6wtj9p8A3LMujw9Y+czGvF3vGIvlthfQxe37RBmi6ZsZT3w=='
JWT_EXPIRES_IN=30d

# ============================================================================
# SECURITY
# ============================================================================
# Important si derrière un proxy pour récupérer la vraie IP des clients
TRUST_PROXY=1
```

### Étape 2 : Redémarrer le serveur

```bash
# Si vous utilisez PM2
pm2 restart dashkey-api

# Si vous utilisez systemd
sudo systemctl restart test-api

# Ou si vous l'avez lancé manuellement
# Ctrl+C pour arrêter, puis relancer :
node server.js
```

### Étape 3 : Vérifier les logs

```bash
# Avec PM2
pm2 logs dashkey-api --lines 50

# Avec systemd
sudo journalctl -u test-api -f

# Vous devriez voir :
# ✅ Database connected
# ✅ Server running on HTTPS://0.0.0.0:3000
```

### Étape 4 : Tester les connexions

```bash
# Lancer le script de diagnostic
./diagnose-connection.sh
```

---

## 🧪 Tests manuels

### Test 1 : Vérifier que l'API écoute sur la bonne interface

```bash
# Vérifier que le port 3000 écoute sur 0.0.0.0 (ou votre IP)
sudo ss -tlnp | grep :3000

# Vous devriez voir quelque chose comme :
# LISTEN 0 511 0.0.0.0:3000 0.0.0.0:* users:(("node",pid=1234,fd=18))
#             ^^^^^^^ Important : pas 127.0.0.1 mais 0.0.0.0
```

### Test 2 : Tester la connexion depuis la VM

```bash
# Test local (doit fonctionner)
curl -k https://localhost:3000/health

# Test via l'IP de la VM (doit aussi fonctionner maintenant)
curl -k https://192.168.105.X:3000/health  # Remplacez X par votre IP
```

### Test 3 : Tester la connexion à la base de données

```bash
# Test de connectivité réseau
ping -c 3 192.168.105.3

# Test du port MySQL
timeout 3 bash -c "echo > /dev/tcp/192.168.105.3/3306" && echo "✅ MySQL accessible" || echo "❌ MySQL inaccessible"

# Test avec le client MySQL (si installé)
mysql -h 192.168.105.3 -P 3306 -u API -p'G7!k9#vR2qX$u8LmZ4tPf3Y' -e "SELECT 1;"
```

### Test 4 : Vérifier les logs de l'application

```bash
# Rechercher les erreurs de connexion
pm2 logs dashkey-api | grep -i "error\|failed\|econnrefused"

# Ou avec systemd
sudo journalctl -u test-api | grep -i "error\|failed"
```

---

## 🔥 Problèmes courants et solutions

### Problème : "ECONNREFUSED" lors de la connexion à la BDD

**Symptôme :**
```
Error: connect ECONNREFUSED 192.168.105.3:3306
```

**Solutions possibles :**

1. **Vérifier que MySQL est démarré sur 192.168.105.3**
   ```bash
   # Depuis la machine BDD
   sudo systemctl status mysql
   ```

2. **Vérifier le pare-feu sur la machine BDD**
   ```bash
   # Sur la machine BDD, autoriser le port MySQL
   sudo ufw allow 3306/tcp
   # Ou
   sudo firewall-cmd --add-port=3306/tcp --permanent
   sudo firewall-cmd --reload
   ```

3. **Vérifier que MySQL écoute sur toutes les interfaces**
   ```bash
   # Sur la machine BDD
   sudo ss -tlnp | grep 3306
   
   # Doit afficher : 0.0.0.0:3306 (pas 127.0.0.1:3306)
   # Si c'est 127.0.0.1, éditer /etc/mysql/mysql.conf.d/mysqld.cnf
   # Commenter la ligne : # bind-address = 127.0.0.1
   # Ou mettre : bind-address = 0.0.0.0
   ```

4. **Vérifier les permissions utilisateur MySQL**
   ```sql
   -- Sur la machine BDD, se connecter à MySQL
   mysql -u root -p
   
   -- Vérifier les permissions de l'utilisateur API
   SELECT host, user FROM mysql.user WHERE user='API';
   
   -- L'utilisateur doit avoir accès depuis votre IP
   -- Si nécessaire, créer/mettre à jour :
   GRANT ALL PRIVILEGES ON Dashkey_test.* TO 'API'@'192.168.105.%' IDENTIFIED BY 'G7!k9#vR2qX$u8LmZ4tPf3Y';
   FLUSH PRIVILEGES;
   ```

### Problème : Le proxy ne peut pas accéder à l'API

**Symptôme :**
```
502 Bad Gateway
ou
Connection refused
```

**Causes :**
- `HOST=127.0.0.1` dans le .env (l'API n'écoute que sur localhost)
- L'API n'est pas démarrée
- Pare-feu qui bloque le port 3000

**Solutions :**

1. **Vérifier HOST dans .env**
   ```bash
   grep "^HOST=" .env
   # Doit afficher : HOST=0.0.0.0
   ```

2. **Vérifier que l'API écoute bien**
   ```bash
   sudo ss -tlnp | grep :3000
   # Doit montrer : 0.0.0.0:3000 (pas 127.0.0.1:3000)
   ```

3. **Tester depuis le serveur proxy**
   ```bash
   # Depuis la machine qui héberge le proxy
   curl -k https://IP_DE_LAPI:3000/health
   ```

4. **Vérifier le pare-feu**
   ```bash
   # Autoriser le port 3000 si nécessaire
   sudo ufw allow 3000/tcp
   # Ou
   sudo firewall-cmd --add-port=3000/tcp --permanent
   sudo firewall-cmd --reload
   ```

### Problème : Erreurs CORS

**Symptôme :**
```
Access to fetch at 'https://dashkey.fr:30443' has been blocked by CORS policy
```

**Solution :**

Ajouter toutes les origines nécessaires dans `ALLOWED_ORIGINS` :

```env
ALLOWED_ORIGINS=https://dashkey.fr:30443,https://dashkey.fr,https://www.dashkey.fr,https://api.dashkey.fr,http://localhost:3000
```

N'oubliez pas de redémarrer l'API après modification.

---

## 📊 Architecture réseau

Voici votre architecture actuelle :

```
Internet
    ↓
[Proxy - Port :30443 HTTPS]
    ↓
[API Node.js - Port :3000 HTTPS - IP: 192.168.105.X]
    ↓
[MySQL - Port :3306 - IP: 192.168.105.3]
```

**Points importants :**
1. Le **proxy** doit pouvoir accéder à l'**API** sur `https://192.168.105.X:3000`
2. L'**API** doit pouvoir accéder à **MySQL** sur `192.168.105.3:3306`
3. L'API doit écouter sur `0.0.0.0:3000` (pas `127.0.0.1:3000`)

---

## 📋 Checklist complète

- [ ] `.env` contient `HOST=0.0.0.0`
- [ ] `.env` contient `TRUST_PROXY=1`
- [ ] `ALLOWED_ORIGINS` contient toutes les origines nécessaires (avec :30443)
- [ ] Certificats SSL accessibles et valides
- [ ] API redémarrée après modification du .env
- [ ] `sudo ss -tlnp | grep :3000` montre `0.0.0.0:3000` (pas `127.0.0.1:3000`)
- [ ] Test local réussi : `curl -k https://localhost:3000/health`
- [ ] Test IP réussi : `curl -k https://192.168.105.X:3000/health`
- [ ] Logs montrent : `✅ Database connected`
- [ ] Logs montrent : `✅ Server running on HTTPS://0.0.0.0:3000`
- [ ] MySQL accessible depuis l'API : `ping 192.168.105.3` OK
- [ ] Port MySQL ouvert : test telnet ou bash tcp OK
- [ ] Pare-feu autorise le port 3000 si nécessaire
- [ ] Le proxy peut accéder à l'API
- [ ] Test depuis l'extérieur via le proxy fonctionne

---

## 🚀 Commande rapide pour tout vérifier

```bash
# Lancer le diagnostic complet
./diagnose-connection.sh

# Afficher la configuration actuelle
echo "=== Configuration actuelle ==="
grep -E "^(HOST|PORT|DB_HOST|ALLOWED_ORIGINS|TRUST_PROXY)=" .env
echo ""
echo "=== Port 3000 ==="
sudo ss -tlnp | grep :3000
echo ""
echo "=== Test MySQL ==="
timeout 3 bash -c "echo > /dev/tcp/192.168.105.3/3306" && echo "✅ MySQL OK" || echo "❌ MySQL KO"
echo ""
echo "=== Test API locale ==="
curl -sk https://localhost:3000/health | head -1
```

---

## 📞 Si ça ne fonctionne toujours pas

Envoyez-moi les sorties de ces commandes :

```bash
# Configuration
cat .env | grep -v PASSWORD | grep -v SECRET

# Ports
sudo ss -tlnp | grep -E ":(3000|30443|3306)"

# Logs récents
pm2 logs dashkey-api --lines 30 --nostream

# Interfaces réseau
ip addr show | grep -E "inet |^[0-9]:"

# Test connectivité
ping -c 2 192.168.105.3
timeout 3 bash -c "echo > /dev/tcp/192.168.105.3/3306" && echo "MySQL OK" || echo "MySQL KO"
```

---

**🎯 Le changement principal : `HOST=0.0.0.0` dans votre .env !**
