# 🧪 Guide de Test - Système d'Amis avec Email

## ✅ Nouvelles Fonctionnalités

L'endpoint `/friends/request` accepte maintenant **2 façons** d'envoyer une demande :

### Option 1 : Par ID (comme avant)
```json
{
  "receiverId": 2
}
```

### Option 2 : Par Email (NOUVEAU !)
```json
{
  "receiverEmail": "bob@example.com"
}
```

---

## 🧪 TESTS COMPLETS

### Test 1 : Créer deux utilisateurs

```bash
# Alice
curl -X POST http://localhost:30443/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"test123"}'

# Sauvegarder le token
ALICE_TOKEN="eyJ..."

# Bob
curl -X POST http://localhost:30443/register \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@test.com","password":"test123"}'

BOB_TOKEN="eyJ..."
```

---

### Test 2 : Alice recherche Bob par email

```bash
curl "http://localhost:30443/users/search?q=bob" \
  -H "Authorization: Bearer $ALICE_TOKEN"

# Résultat : {"users":[{"id":2,"email":"bob@test.com"}]}
```

---

### Test 3A : Envoyer une demande avec ID (méthode classique)

```bash
curl -X POST http://localhost:30443/friends/request \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverId":2}'

# ✅ Résultat : {"message":"Demande d'ami envoyée",...}
```

---

### Test 3B : Envoyer une demande avec EMAIL (NOUVEAU !)

```bash
curl -X POST http://localhost:30443/friends/request \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverEmail":"bob@test.com"}'

# ✅ Résultat : {"message":"Demande d'ami envoyée",...}
```

---

### Test 4 : Bob voit la demande reçue

```bash
curl http://localhost:30443/friends/requests \
  -H "Authorization: Bearer $BOB_TOKEN"

# Résultat :
# {
#   "requests": [
#     {
#       "id": 1,
#       "sender": {"id": 1, "email": "alice@test.com"},
#       "status": "pending",
#       "createdAt": "..."
#     }
#   ]
# }
```

---

### Test 5 : Bob accepte la demande

```bash
curl -X PUT http://localhost:30443/friends/request/1 \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"accept"}'

# Résultat : {"message":"Demande acceptée",...}
```

---

### Test 6 : Voir la liste des amis

```bash
# Alice voit Bob
curl http://localhost:30443/friends \
  -H "Authorization: Bearer $ALICE_TOKEN"

# Bob voit Alice
curl http://localhost:30443/friends \
  -H "Authorization: Bearer $BOB_TOKEN"

# Résultat pour les deux :
# {
#   "friends": [
#     {
#       "friendshipId": 1,
#       "friend": {"id": ..., "email": "..."},
#       "since": "..."
#     }
#   ]
# }
```

---

### Test 7 : Cas d'erreur - Email inexistant

```bash
curl -X POST http://localhost:30443/friends/request \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverEmail":"unknown@test.com"}'

# ❌ Résultat : 404 {"error":"not_found","message":"Utilisateur introuvable"}
```

---

### Test 8 : Cas d'erreur - Demande à soi-même

```bash
curl -X POST http://localhost:30443/friends/request \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverEmail":"alice@test.com"}'

# ❌ Résultat : 400 {"error":"bad_request","message":"Vous ne pouvez pas vous ajouter vous-même"}
```

---

### Test 9 : Cas d'erreur - Demande dupliquée

```bash
# Envoyer deux fois la même demande
curl -X POST http://localhost:30443/friends/request \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverEmail":"bob@test.com"}'

# Puis la même :
curl -X POST http://localhost:30443/friends/request \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverEmail":"bob@test.com"}'

# ❌ Résultat : 409 {"error":"conflict","message":"Demande déjà envoyée"}
```

---

## 📱 UTILISATION ANDROID

### Méthode 1 : Avec ID

```kotlin
lifecycleScope.launch {
    val result = repository.sendFriendRequest(
        token = authToken,
        receiverId = 2
    )
    
    result.onSuccess { response ->
        Toast.makeText(this@MainActivity, response.message, Toast.LENGTH_SHORT).show()
    }
}
```

### Méthode 2 : Avec Email (NOUVEAU !)

```kotlin
lifecycleScope.launch {
    val result = repository.sendFriendRequestByEmail(
        token = authToken,
        receiverEmail = "bob@example.com"
    )
    
    result.onSuccess { response ->
        Toast.makeText(this@MainActivity, response.message, Toast.LENGTH_SHORT).show()
    }
}
```

### Exemple complet : Recherche + Ajout

```kotlin
// 1. L'utilisateur tape "bob" dans la barre de recherche
val searchQuery = "bob"

// 2. Rechercher les utilisateurs
val searchResult = repository.searchUsers(authToken, searchQuery)

searchResult.onSuccess { users ->
    // 3. Afficher les résultats dans un RecyclerView
    usersAdapter.submitList(users)
    
    // 4. Quand l'utilisateur clique sur "Ajouter"
    usersAdapter.setOnAddClickListener { user ->
        // Envoyer la demande avec l'EMAIL directement !
        sendFriendRequest(user.email)
    }
}

// Fonction d'envoi
private fun sendFriendRequest(email: String) {
    lifecycleScope.launch {
        val result = repository.sendFriendRequestByEmail(authToken, email)
        
        result.onSuccess {
            Toast.makeText(this@MainActivity, "Demande envoyée !", Toast.LENGTH_SHORT).show()
        }
        
        result.onFailure { error ->
            Toast.makeText(this@MainActivity, error.message, Toast.LENGTH_SHORT).show()
        }
    }
}
```

---

## 🔍 AVANTAGES DE LA MÉTHODE EMAIL

✅ Plus simple pour l'utilisateur (pas besoin de stocker les IDs)  
✅ Plus intuitif ("Ajouter bob@example.com")  
✅ Fonctionne même si l'ID change  
✅ Pas besoin de faire une requête supplémentaire pour obtenir l'ID  

---

## 📊 COMPARAISON

### Avant (uniquement ID)
```
1. Rechercher "bob" → GET /users/search?q=bob
2. Récupérer l'ID : 2
3. Envoyer demande → POST /friends/request {"receiverId": 2}
```

### Maintenant (avec email) ⚡
```
1. Rechercher "bob" → GET /users/search?q=bob
2. Envoyer demande → POST /friends/request {"receiverEmail": "bob@test.com"}
```

**🚀 Une étape en moins !**

---

## ✅ VALIDATION DES DONNÉES

Le serveur vérifie automatiquement :

- ✅ Email valide (string non vide)
- ✅ Utilisateur existe
- ✅ Pas d'auto-demande
- ✅ Pas de demande dupliquée
- ✅ Sensible à la casse (trim automatique)

---

## 🔒 SÉCURITÉ

Les deux méthodes sont **également sécurisées** :

- ✅ JWT requis
- ✅ Recherche en base de données
- ✅ Validation stricte
- ✅ Protection contre les duplicatas

---

**🎉 Vous pouvez maintenant utiliser l'email ou l'ID, selon votre préférence !**
