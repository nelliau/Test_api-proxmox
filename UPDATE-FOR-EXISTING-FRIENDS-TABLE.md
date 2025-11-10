# 🔄 Mise à jour pour utiliser la table `friends` existante

## ✅ Votre table actuelle

Vous avez déjà une table `friends` dans votre base de données avec cette structure :

```sql
CREATE TABLE friends (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_friends_sender FOREIGN KEY (sender_id) REFERENCES user(id) ON DELETE CASCADE,
    CONSTRAINT fk_friends_receiver FOREIGN KEY (receiver_id) REFERENCES user(id) ON DELETE CASCADE,
    CONSTRAINT chk_not_self CHECK (sender_id <> receiver_id),
    CONSTRAINT uniq_friend_pair UNIQUE (sender_id, receiver_id)
);
```

---

## 🔧 VÉRIFIER LE CODE server.js SUR PROXMOX

Le modèle `FriendRequest` doit utiliser les bons noms de colonnes :

```javascript
const FriendRequest = sequelize.define(
  'FriendRequest',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    senderId: {              // ← Doit mapper à sender_id
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sender_id',
    },
    receiverId: {            // ← Doit mapper à receiver_id
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'receiver_id',
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'declined'),  // ← declined, pas rejected
      defaultValue: 'pending',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'friends',    // ← Doit être 'friends', pas 'friend_request'
    timestamps: false,
  }
);

// Associations
FriendRequest.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
FriendRequest.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });
```

---

## 🔍 VÉRIFICATIONS À FAIRE SUR PROXMOX

```bash
cd /root/Test_api-proxmox

# 1. Vérifier que le modèle utilise tableName: 'friends'
grep -A 2 "tableName:" server.js | grep -A 1 "FriendRequest" -B 5

# 2. Vérifier que le status inclut 'declined'
grep "ENUM.*declined" server.js

# 3. Vérifier les associations
grep "FriendRequest.belongsTo" server.js
```

---

## 🔄 CORRECTIONS NÉCESSAIRES

Si votre `server.js` sur Proxmox utilise encore `requester_id` ou `rejected`, appliquez ces corrections :

### Correction 1 : Changer requesterId → senderId

```bash
cd /root/Test_api-proxmox

# Chercher toutes les occurrences de requesterId
grep -n "requesterId" server.js

# Si vous en trouvez, remplacer manuellement par senderId
nano server.js
# Ou utiliser sed :
sed -i 's/requesterId/senderId/g' server.js
```

### Correction 2 : Changer 'rejected' → 'declined'

```bash
# Chercher 'rejected'
grep -n "rejected" server.js

# Remplacer par 'declined'
sed -i "s/'rejected'/'declined'/g" server.js
sed -i 's/"rejected"/"declined"/g' server.js
```

### Correction 3 : Changer 'requester' → 'sender' dans les associations

```bash
# Vérifier les associations
grep -n "as: 'requester'" server.js

# Si présent, corriger
sed -i "s/as: 'requester'/as: 'sender'/g" server.js
```

---

## ✅ VÉRIFIER LA TABLE EN BASE DE DONNÉES

```bash
mysql -h 192.168.105.3 -P 3306 -u API -p'G7!k9#vR2qX$u8LmZ4tPf3Y' Dashkey_test
```

```sql
-- Vérifier que la table friends existe
SHOW TABLES LIKE 'friends';

-- Voir la structure
DESCRIBE friends;

-- Voir les contraintes
SHOW CREATE TABLE friends\G

-- Tester un INSERT
INSERT INTO friends (sender_id, receiver_id, status) VALUES (1, 2, 'pending');
SELECT * FROM friends;
DELETE FROM friends WHERE id = LAST_INSERT_ID();

EXIT;
```

---

## 🚀 REDÉMARRER L'API

```bash
# Redémarrer
systemctl restart test-api

# Vérifier les logs
journalctl -u test-api -n 50 -f
```

Vous devriez voir :
```
✅ Database connected and models synced.
✅ Server listening on port 30443
```

---

## 🧪 TEST COMPLET

### 1. Créer deux utilisateurs

```bash
# Alice
curl -X POST http://localhost:30443/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"test123"}'

ALICE_TOKEN="<coller_token>"
ALICE_ID=1  # Remplacer par l'ID retourné

# Bob
curl -X POST http://localhost:30443/register \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@test.com","password":"test123"}'

BOB_TOKEN="<coller_token>"
BOB_ID=2  # Remplacer par l'ID retourné
```

### 2. Alice envoie une demande à Bob

```bash
curl -X POST http://localhost:30443/friends/request \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"receiverId\":$BOB_ID}"
```

**Résultat attendu :**
```json
{
  "message": "Demande d'ami envoyée",
  "request": {
    "id": 1,
    "senderId": 1,
    "receiverId": 2,
    "status": "pending",
    "createdAt": "..."
  }
}
```

### 3. Bob voit les demandes

```bash
curl http://localhost:30443/friends/requests \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Résultat attendu :**
```json
{
  "requests": [
    {
      "id": 1,
      "sender": {
        "id": 1,
        "email": "alice@test.com"
      },
      "status": "pending",
      "createdAt": "..."
    }
  ]
}
```

### 4. Bob accepte

```bash
curl -X PUT http://localhost:30443/friends/request/1 \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"accept"}'
```

### 5. Vérifier en base

```bash
mysql -h 192.168.105.3 -P 3306 -u API -p'G7!k9#vR2qX$u8LmZ4tPf3Y' Dashkey_test -e "
SELECT 
    f.id,
    u1.email AS sender_email,
    u2.email AS receiver_email,
    f.status
FROM friends f
JOIN user u1 ON f.sender_id = u1.id
JOIN user u2 ON f.receiver_id = u2.id;
"
```

---

## 📊 RÉSUMÉ DES CHANGEMENTS

| Ancien (friend_request) | Nouveau (friends) |
|-------------------------|-------------------|
| `requester_id` | `sender_id` |
| `'rejected'` | `'declined'` |
| `as: 'requester'` | `as: 'sender'` |
| `tableName: 'friend_request'` | `tableName: 'friends'` |

---

## ⚠️ ATTENTION

**NE PAS** exécuter `create-friends-table.sql` car votre table existe déjà !

Si vous l'avez déjà créée par erreur, supprimez-la :

```sql
DROP TABLE IF EXISTS friend_request;
```

---

**✅ Une fois ces vérifications faites, votre système d'amis fonctionnera avec votre table existante !**
