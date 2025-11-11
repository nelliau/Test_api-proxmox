# 🚀 Déploiement du Système d'Amis sur Proxmox

## 📋 Ce qui a été ajouté

### ✅ Nouveau modèle : FriendRequest
- Table `friend_request` avec gestion des statuts (pending, accepted, rejected)
- Relations avec la table `user`

### ✅ 5 nouveaux endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/friends/request` | Envoyer une demande d'ami |
| GET | `/friends/requests` | Récupérer les demandes reçues (pending) |
| PUT | `/friends/request/:id` | Accepter/Refuser une demande |
| GET | `/friends` | Liste des amis acceptés |
| DELETE | `/friends/:id` | Supprimer un ami |

---

## 🔧 ÉTAPES D'INSTALLATION SUR PROXMOX

### 1. Se connecter au conteneur

```bash
ssh root@192.168.104.2
cd /root/Test_api-proxmox
```

---

### 2. Sauvegarder l'ancien server.js

```bash
cp server.js server.js.backup.before-friends
```

---

### 3. Récupérer les nouveaux fichiers depuis GitHub

```bash
# Pull les dernières modifications
git pull origin cursor/backend-chat-server-setup-with-authentication-1ef0

# Vérifier que les nouveaux fichiers sont présents
ls -la create-friends-table.sql
```

---

### 4. Créer la table friend_request dans MySQL

```bash
# Se connecter à MySQL
mysql -h 192.168.105.3 -P 3306 -u API -p Dashkey_test

# Puis exécuter le SQL
```

```sql
-- Créer la table
CREATE TABLE IF NOT EXISTS friend_request (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  receiver_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES user(id) ON DELETE CASCADE,
  UNIQUE KEY unique_friendship (requester_id, receiver_id)
);

-- Index pour les performances
CREATE INDEX idx_receiver_status ON friend_request(receiver_id, status);
CREATE INDEX idx_requester_status ON friend_request(requester_id, status);

-- Vérifier que la table existe
SHOW TABLES;
DESCRIBE friend_request;
EXIT;
```

**Ou avec le fichier SQL directement :**

```bash
mysql -h 192.168.105.3 -P 3306 -u API -p Dashkey_test < create-friends-table.sql
```

---

### 5. Redémarrer l'API

```bash
# Si vous utilisez le service systemd
systemctl restart test-api
systemctl status test-api

# Voir les logs
journalctl -u test-api -n 50 -f

# Si vous démarrez manuellement
cd /root/Test_api-proxmox
npm start
```

---

## 🧪 TESTS DES NOUVEAUX ENDPOINTS

### Test 1 : Créer deux utilisateurs

```bash
# Utilisateur Alice
curl -X POST http://192.168.104.2:30443/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}'

# Sauvegarder le token d'Alice
ALICE_TOKEN="<coller_le_token_ici>"
ALICE_ID=1  # Remplacer par l'ID retourné

# Utilisateur Bob
curl -X POST http://192.168.104.2:30443/register \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@test.com","password":"password123"}'

BOB_TOKEN="<coller_le_token_ici>"
BOB_ID=2  # Remplacer par l'ID retourné
```

---

### Test 2 : Alice envoie une demande d'ami à Bob

```bash
curl -X POST http://192.168.104.2:30443/friends/request \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"receiverId\":$BOB_ID}"

# Résultat attendu :
# {"message":"Demande d'ami envoyée","request":{...}}
```

---

### Test 3 : Bob voit les demandes reçues

```bash
curl http://192.168.104.2:30443/friends/requests \
  -H "Authorization: Bearer $BOB_TOKEN"

# Résultat : Liste avec la demande d'Alice
# {"requests":[{"id":1,"requester":{"id":1,"email":"alice@test.com"},...}]}
```

---

### Test 4 : Bob accepte la demande

```bash
# Remplacer REQUEST_ID par l'ID reçu dans le test 3
curl -X PUT http://192.168.104.2:30443/friends/request/1 \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"accept"}'

# Résultat : {"message":"Demande acceptée",...}
```

---

### Test 5 : Alice voit ses amis

```bash
curl http://192.168.104.2:30443/friends \
  -H "Authorization: Bearer $ALICE_TOKEN"

# Résultat : {"friends":[{"friendshipId":1,"friend":{"id":2,"email":"bob@test.com"},...}]}
```

---

### Test 6 : Bob voit aussi Alice dans ses amis

```bash
curl http://192.168.104.2:30443/friends \
  -H "Authorization: Bearer $BOB_TOKEN"

# Résultat : {"friends":[{"friendshipId":1,"friend":{"id":1,"email":"alice@test.com"},...}]}
```

---

### Test 7 : Supprimer l'amitié

```bash
# Alice supprime Bob (friendshipId=1)
curl -X DELETE http://192.168.104.2:30443/friends/1 \
  -H "Authorization: Bearer $ALICE_TOKEN"

# Résultat : {"message":"Ami supprimé avec succès"}
```

---

## 📊 VÉRIFIER EN BASE DE DONNÉES

```bash
mysql -h 192.168.105.3 -P 3306 -u API -p Dashkey_test
```

```sql
-- Voir tous les utilisateurs
SELECT id, email FROM user;

-- Voir toutes les demandes d'amis
SELECT * FROM friend_request;

-- Voir les amis d'un utilisateur (ex: user_id = 1)
SELECT * FROM friend_request 
WHERE (requester_id = 1 OR receiver_id = 1) 
AND status = 'accepted';
```

---

## 🔒 SÉCURITÉ

✅ Tous les endpoints nécessitent un JWT valide  
✅ Validation des données d'entrée  
✅ Vérification que l'utilisateur existe  
✅ Empêche de s'ajouter soi-même  
✅ Empêche les demandes dupliquées  
✅ Seul le receveur peut accepter/refuser  
✅ Seuls les membres de l'amitié peuvent la supprimer  

---

## 📱 INTÉGRATION ANDROID (Kotlin)

### Interface Retrofit

```kotlin
interface MessagingApi {
    // Envoyer une demande d'ami
    @POST("friends/request")
    suspend fun sendFriendRequest(
        @Header("Authorization") token: String,
        @Body request: FriendRequestBody
    ): Response<FriendRequestResponse>
    
    // Récupérer les demandes reçues
    @GET("friends/requests")
    suspend fun getFriendRequests(
        @Header("Authorization") token: String
    ): Response<FriendRequestsResponse>
    
    // Accepter/Refuser
    @PUT("friends/request/{id}")
    suspend fun respondToRequest(
        @Path("id") requestId: Int,
        @Header("Authorization") token: String,
        @Body action: FriendActionBody
    ): Response<FriendActionResponse>
    
    // Liste des amis
    @GET("friends")
    suspend fun getFriends(
        @Header("Authorization") token: String
    ): Response<FriendsListResponse>
    
    // Supprimer un ami
    @DELETE("friends/{id}")
    suspend fun removeFriend(
        @Path("id") friendshipId: Int,
        @Header("Authorization") token: String
    ): Response<MessageResponse>
}

// Data classes
data class FriendRequestBody(val receiverId: Int)
data class FriendActionBody(val action: String) // "accept" ou "reject"
```

---

## ✅ CHECKLIST DE DÉPLOIEMENT

- [ ] Server.js mis à jour avec le nouveau code
- [ ] Table `friend_request` créée dans MySQL
- [ ] API redémarrée
- [ ] Test : Envoyer une demande d'ami
- [ ] Test : Voir les demandes reçues
- [ ] Test : Accepter une demande
- [ ] Test : Voir la liste des amis
- [ ] Test : Supprimer un ami
- [ ] Vérification en base de données

---

**🎉 Le système d'amis est maintenant opérationnel !**
