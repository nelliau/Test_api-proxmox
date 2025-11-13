# 📋 Contrat API - DashKey E2EE Messaging

> **⚠️ CE FICHIER EST LA SOURCE DE VÉRITÉ UNIQUE**
> 
> Toute modification DOIT être validée par les 2 développeurs.
> Ne jamais implémenter un endpoint qui n'est pas documenté ici.

---

## 📌 Informations générales

| Info | Valeur |
|------|--------|
| **Version API** | 2.0 (E2EE - Chiffrement asymétrique RSA) |
| **Base URL** | `http://localhost:30443` (dev) / `https://api.dashkey.com` (prod) |
| **Dernière mise à jour** | 2025-11-11 (E2EE simplifié) |
| **Format** | JSON |
| **Encoding** | UTF-8 |
| **Timezone** | UTC (ISO 8601) |
| **Type de chiffrement** | RSA asymétrique (clé publique/privée) |

---

## 🔐 Authentification

### **Format du token JWT**

```
Authorization: Bearer <JWT_TOKEN>
```

**Structure du payload JWT :**
```json
{
  "userId": 123,
  "email": "user@example.com",
  "roles": ["ROLE_USER"],
  "iat": 1699999999,
  "exp": 1700604799
}
```

**Durée de vie :** 7 jours

---

## ⚠️ Format standard des erreurs

**Toutes les erreurs suivent ce format :**

```json
{
  "error": "error_code",
  "message": "Description en français"
}
```

### **Codes HTTP utilisés**

| Code | Signification | Quand l'utiliser |
|------|---------------|------------------|
| **200** | OK | GET réussi |
| **201** | Created | POST réussi (création) |
| **400** | Bad Request | Paramètres invalides |
| **401** | Unauthorized | Token manquant/invalide |
| **403** | Forbidden | Action non autorisée |
| **404** | Not Found | Ressource introuvable |
| **409** | Conflict | Doublon (email, demande ami) |
| **500** | Internal Error | Erreur serveur |

### **Codes d'erreur standards**

| error | message | HTTP Code |
|-------|---------|-----------|
| `bad_request` | Paramètres manquants ou invalides | 400 |
| `unauthorized` | Token manquant ou invalide | 401 |
| `forbidden` | Action non autorisée | 403 |
| `not_found` | Ressource introuvable | 404 |
| `conflict` | Ressource déjà existante | 409 |
| `internal_error` | Erreur serveur | 500 |

---

## 📱 ENDPOINTS

---

## 1️⃣ Authentification

### **POST /register**

**Description :** Créer un nouveau compte utilisateur.

**Headers :** Aucun (endpoint public)

**Request Body :**
```json
{
  "email": "alice@example.com",
  "password": "password123"
}
```

**Règles de validation :**
- `email` : Format email valide (RFC 5322)
- `password` : Minimum 6 caractères

**Response 201 (Success) :**
```json
{
  "message": "Utilisateur créé avec succès",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "alice@example.com",
    "roles": ["ROLE_USER"],
    "publicKey": null
  }
}
```

**Note :** `publicKey` est `null` à l'inscription. Utilisez `PUT /users/public-key` pour l'ajouter.

**Response 400 (Validation Error) :**
```json
{
  "error": "bad_request",
  "message": "Le mot de passe doit contenir au moins 6 caractères"
}
```

**Response 409 (Email déjà utilisé) :**
```json
{
  "error": "conflict",
  "message": "Cet email est déjà utilisé"
}
```

---

### **POST /login**

**Description :** Se connecter avec un compte existant.

**Headers :** Aucun (endpoint public)

**Request Body :**
```json
{
  "email": "alice@example.com",
  "password": "password123"
}
```

**Response 200 (Success) :**
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "alice@example.com",
    "roles": ["ROLE_USER"],
    "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..." 
  }
}
```

**Note :** `publicKey` peut être `null` si l'utilisateur ne l'a pas encore définie.

**Response 401 (Invalid Credentials) :**
```json
{
  "error": "unauthorized",
  "message": "Email ou mot de passe incorrect"
}
```

---

### **GET /me**

**Description :** Récupérer les informations du user authentifié.

**Headers :**
```
Authorization: Bearer <token>
```

**Response 200 :**
```json
{
  "id": 1,
  "email": "alice@example.com",
  "roles": ["ROLE_USER"],
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

**Note :** `publicKey` peut être `null` si pas encore définie.

**Response 401 :**
```json
{
  "error": "unauthorized",
  "message": "Token invalide ou expiré"
}
```

---

## 2️⃣ Gestion des clés E2EE (RSA asymétrique)

> ⚠️ **IMPORTANT :** 
> - Le serveur stocke UNIQUEMENT les clés publiques RSA
> - Les clés privées NE DOIVENT JAMAIS quitter le client Android
> - Format : Clé publique encodée en **base64**
> - Le chiffrement/déchiffrement = **responsabilité du client**

---

### **PUT /users/public-key**

**Description :** Mettre à jour sa clé publique RSA (appelé après inscription ou pour renouveler).

**Headers :**
```
Authorization: Bearer <token>
```

**Request Body :**
```json
{
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

**Format :**
- `publicKey` : String base64 (clé publique RSA 2048 bits ou plus)

**Règles de validation :**
- `publicKey` : Requis, non vide

**Response 200 (Success) :**
```json
{
  "message": "Clé publique mise à jour avec succès",
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

**Response 400 (Validation Error) :**
```json
{
  "error": "bad_request",
  "message": "Clé publique requise"
}
```

**Response 404 (User not found) :**
```json
{
  "error": "not_found",
  "message": "Utilisateur introuvable"
}
```

**Notes :**
- Peut être appelé plusieurs fois pour renouveler la clé
- La clé privée correspondante ne doit JAMAIS être envoyée au serveur
- Recommandation : Clé RSA 2048 bits minimum

---

### **GET /users/:id/public-key**

**Description :** Récupérer la clé publique RSA d'un autre utilisateur (pour chiffrer un message).

**Headers :**
```
Authorization: Bearer <token>
```

**URL Parameters :**
- `id` : Integer (ID de l'utilisateur cible)

**Exemple :**
```
GET /users/2/public-key
```

**Response 200 (Success) :**
```json
{
  "userId": 2,
  "email": "bob@example.com",
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

**Response 404 (User not found) :**
```json
{
  "error": "not_found",
  "message": "Utilisateur introuvable"
}
```

**Response 404 (No public key) :**
```json
{
  "error": "not_found",
  "message": "Clé publique non disponible"
}
```

**Notes importantes :**
- Utilisez cette clé pour chiffrer les messages destinés à cet utilisateur
- La clé est persistante (pas consommée)

---

## 3️⃣ Messages

> ⚠️ **IMPORTANT E2EE :**
> - Le champ `content` contient du texte **CHIFFRÉ** (base64)
> - Le serveur **NE PEUT PAS** lire le contenu
> - Le chiffrement/déchiffrement est la **responsabilité du client Android**

---

### **POST /messages**

**Description :** Envoyer un message chiffré à un utilisateur.

**Headers :**
```
Authorization: Bearer <token>
```

**Request Body :**
```json
{
  "receiverId": 2,
  "content": "PREKEY:aF3x9mK7vP2qL8nR4jT6yW1zC5hD9eB0..."
}
```

**Format du content :**
```
"TYPE:base64_encrypted_data"

Où TYPE peut être :
- PREKEY  : Premier message (contient le prekey bundle)
- WHISPER : Messages suivants (session établie)
```

**Règles de validation :**
- `receiverId` : Requis, integer
- `content` : Requis, string non vide

**Response 201 (Success) :**
```json
{
  "id": 123,
  "senderId": 1,
  "receiverId": 2,
  "content": "PREKEY:aF3x9mK7vP2qL8nR4jT6yW1zC5hD9eB0...",
  "createdAt": "2025-11-11T16:45:30.000Z"
}
```

**Response 404 (Receiver not found) :**
```json
{
  "error": "not_found",
  "message": "Destinataire introuvable"
}
```

**Notes :**
- Le serveur stocke le `content` **tel quel**, sans validation ni modification
- **NE PAS utiliser `.trim()`** côté serveur (casserait le chiffrement)

---

### **GET /messages**

**Description :** Récupérer l'historique de conversation avec un utilisateur.

**Headers :**
```
Authorization: Bearer <token>
```

**Query Parameters :**
- `userId` : Integer (requis) - ID de l'autre utilisateur
- `limit` : Integer (optionnel) - Nombre de messages (défaut: 50, max: 200)

**Exemple :**
```
GET /messages?userId=2&limit=100
```

**Response 200 (Success) :**
```json
[
  {
    "id": 123,
    "senderId": 1,
    "receiverId": 2,
    "content": "PREKEY:aF3x9mK7...",
    "createdAt": "2025-11-11T16:45:30.000Z",
    "sender": {
      "id": 1,
      "email": "alice@example.com"
    },
    "receiver": {
      "id": 2,
      "email": "bob@example.com"
    }
  },
  {
    "id": 124,
    "senderId": 2,
    "receiverId": 1,
    "content": "WHISPER:bG4y8nL3...",
    "createdAt": "2025-11-11T16:46:15.000Z",
    "sender": {
      "id": 2,
      "email": "bob@example.com"
    },
    "receiver": {
      "id": 1,
      "email": "alice@example.com"
    }
  }
]
```

**Response 400 (Missing parameter) :**
```json
{
  "error": "bad_request",
  "message": "userId requis en query parameter"
}
```

**Notes :**
- Les messages sont triés par `createdAt` ASC (plus ancien en premier)
- Inclut les messages dans les 2 sens (envoyés + reçus)
- Le `content` est chiffré, à déchiffrer côté client

---

### **GET /messages/new**

**Description :** Polling - Récupérer les nouveaux messages depuis un timestamp (pour rafraîchissement).

**Headers :**
```
Authorization: Bearer <token>
```

**Query Parameters :**
- `since` : String (requis) - ISO 8601 timestamp
- `userId` : Integer (optionnel) - Filtrer par utilisateur

**Exemple :**
```
GET /messages/new?since=2025-11-11T16:00:00.000Z&userId=2
```

**Response 200 (Success) :**
```json
{
  "messages": [
    {
      "id": 125,
      "senderId": 2,
      "receiverId": 1,
      "content": "WHISPER:cH5z9oM4...",
      "createdAt": "2025-11-11T16:47:00.000Z",
      "sender": {
        "id": 2,
        "email": "bob@example.com"
      },
      "receiver": {
        "id": 1,
        "email": "alice@example.com"
      }
    }
  ],
  "timestamp": "2025-11-11T16:50:00.000Z"
}
```

**Response 400 (Missing parameter) :**
```json
{
  "error": "bad_request",
  "message": "Paramètre \"since\" requis (ISO 8601 timestamp)"
}
```

**Notes :**
- Utilisé pour le polling (appeler toutes les 3-5 secondes)
- Si `userId` non fourni, retourne tous les nouveaux messages de l'utilisateur
- Limite : 100 messages maximum par requête

---

### **GET /messages/unread-count**

**Description :** Récupérer le nombre de messages non lus par conversation.

**Headers :**
```
Authorization: Bearer <token>
```

**Query Parameters :**
- `since` : String (optionnel) - ISO 8601 timestamp

**Exemple :**
```
GET /messages/unread-count?since=2025-11-11T10:00:00.000Z
```

**Response 200 (Success) :**
```json
{
  "unreadCounts": [
    {
      "senderId": 2,
      "senderEmail": "bob@example.com",
      "unreadCount": 5,
      "lastMessageAt": "2025-11-11T16:47:00.000Z"
    },
    {
      "senderId": 3,
      "senderEmail": "charlie@example.com",
      "unreadCount": 2,
      "lastMessageAt": "2025-11-11T15:30:00.000Z"
    }
  ],
  "timestamp": "2025-11-11T16:50:00.000Z"
}
```

**Notes :**
- Compte uniquement les messages **reçus** par l'utilisateur
- Utile pour afficher des badges de notification

---

## 4️⃣ Recherche d'utilisateurs

### **GET /users/search**

**Description :** Rechercher des utilisateurs par email (pour trouver des amis).

**Headers :**
```
Authorization: Bearer <token>
```

**Query Parameters :**
- `q` ou `email` : String (requis) - Email à rechercher
- `limit` : Integer (optionnel) - Nombre de résultats (défaut: 20, max: 50)

**Exemple :**
```
GET /users/search?q=alice&limit=10
```

**Response 200 (Success) :**
```json
{
  "users": [
    {
      "id": 1,
      "email": "alice@example.com",
      "roles": ["ROLE_USER"],
      "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
    },
    {
      "id": 5,
      "email": "alice.smith@gmail.com",
      "roles": ["ROLE_USER"],
      "publicKey": null
    }
  ]
}
```

**Note :** `publicKey` peut être `null` si l'utilisateur ne l'a pas définie. Utilisez `GET /users/:id/public-key` pour obtenir uniquement la clé.

**Response 400 (Missing parameter) :**
```json
{
  "error": "bad_request",
  "message": "Paramètre \"q\" ou \"email\" requis pour la recherche"
}
```

**Notes :**
- Recherche partielle (LIKE %query%)
- N'inclut pas l'utilisateur courant dans les résultats
- Insensible à la casse (selon config MySQL)

---

### **GET /users/:id**

**Description :** Récupérer les informations publiques d'un utilisateur.

**Headers :**
```
Authorization: Bearer <token>
```

**URL Parameters :**
- `id` : Integer (ID de l'utilisateur)

**Exemple :**
```
GET /users/2
```

**Response 200 (Success) :**
```json
{
  "id": 2,
  "email": "bob@example.com",
  "roles": ["ROLE_USER"],
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

**Note :** `publicKey` peut être `null`.

**Response 404 (User not found) :**
```json
{
  "error": "not_found",
  "message": "Utilisateur introuvable"
}
```

---

## 5️⃣ Système d'amis

> **Statuts possibles :**
> - `pending` : Demande en attente
> - `accepted` : Demande acceptée (amis)
> - `declined` : Demande refusée

---

### **POST /friends/request**

**Description :** Envoyer une demande d'ami.

**Headers :**
```
Authorization: Bearer <token>
```

**Request Body :**
```json
{
  "receiverId": 2
}
```

OU

```json
{
  "receiverEmail": "bob@example.com"
}
```

**Règles de validation :**
- Un seul de `receiverId` ou `receiverEmail` requis
- Ne peut pas s'envoyer une demande à soi-même

**Response 201 (Success) :**
```json
{
  "message": "Demande d'ami envoyée",
  "request": {
    "id": 42,
    "senderId": 1,
    "receiverId": 2,
    "status": "pending",
    "createdAt": "2025-11-11T17:00:00.000Z"
  }
}
```

**Response 404 (Receiver not found) :**
```json
{
  "error": "not_found",
  "message": "Utilisateur introuvable"
}
```

**Response 409 (Already friends) :**
```json
{
  "error": "conflict",
  "message": "Vous êtes déjà amis"
}
```

**Response 409 (Request already sent) :**
```json
{
  "error": "conflict",
  "message": "Demande déjà envoyée"
}
```

**Notes :**
- Une notification Socket.IO est envoyée au destinataire (event: `friend_request`)

---

### **GET /friends/requests**

**Description :** Récupérer les demandes d'ami reçues (pending).

**Headers :**
```
Authorization: Bearer <token>
```

**Response 200 (Success) :**
```json
{
  "requests": [
    {
      "id": 42,
      "sender": {
        "id": 2,
        "email": "bob@example.com"
      },
      "status": "pending",
      "createdAt": "2025-11-11T17:00:00.000Z"
    },
    {
      "id": 43,
      "sender": {
        "id": 3,
        "email": "charlie@example.com"
      },
      "status": "pending",
      "createdAt": "2025-11-11T16:30:00.000Z"
    }
  ]
}
```

**Notes :**
- Retourne uniquement les demandes en statut `pending`
- Triées par `createdAt` DESC (plus récentes en premier)

---

### **PUT /friends/request/:id**

**Description :** Accepter ou refuser une demande d'ami.

**Headers :**
```
Authorization: Bearer <token>
```

**URL Parameters :**
- `id` : Integer (ID de la demande d'ami)

**Request Body :**
```json
{
  "action": "accept"
}
```

OU

```json
{
  "action": "decline"
}
```

**Valeurs possibles pour `action` :**
- `accept` : Accepter la demande
- `decline` : Refuser la demande

**Response 200 (Success - Accept) :**
```json
{
  "message": "Demande acceptée",
  "request": {
    "id": 42,
    "status": "accepted"
  }
}
```

**Response 200 (Success - Decline) :**
```json
{
  "message": "Demande refusée",
  "request": {
    "id": 42,
    "status": "declined"
  }
}
```

**Response 400 (Invalid action) :**
```json
{
  "error": "bad_request",
  "message": "action doit être \"accept\" ou \"decline\""
}
```

**Response 403 (Not your request) :**
```json
{
  "error": "forbidden",
  "message": "Vous ne pouvez pas modifier cette demande"
}
```

**Response 404 (Request not found) :**
```json
{
  "error": "not_found",
  "message": "Demande introuvable"
}
```

**Notes :**
- Une notification Socket.IO est envoyée à l'expéditeur (event: `friend_request_response`)

---

### **GET /friends**

**Description :** Récupérer la liste de ses amis (demandes acceptées).

**Headers :**
```
Authorization: Bearer <token>
```

**Response 200 (Success) :**
```json
{
  "friends": [
    {
      "friendshipId": 42,
      "friend": {
        "id": 2,
        "email": "bob@example.com"
      },
      "since": "2025-11-11T17:05:00.000Z"
    },
    {
      "friendshipId": 45,
      "friend": {
        "id": 5,
        "email": "alice.smith@gmail.com"
      },
      "since": "2025-11-10T14:20:00.000Z"
    }
  ]
}
```

**Notes :**
- Retourne uniquement les demandes en statut `accepted`
- `since` correspond à la date de mise à jour de la demande (= date d'acceptation)
- Triées par `since` DESC (plus récentes en premier)

---

### **DELETE /friends/:id**

**Description :** Supprimer un ami (termine l'amitié).

**Headers :**
```
Authorization: Bearer <token>
```

**URL Parameters :**
- `id` : Integer (ID de la relation d'amitié, pas l'ID du user)

**Exemple :**
```
DELETE /friends/42
```

**Response 200 (Success) :**
```json
{
  "message": "Ami supprimé avec succès"
}
```

**Response 403 (Not your friendship) :**
```json
{
  "error": "forbidden",
  "message": "Vous ne pouvez pas supprimer cette amitié"
}
```

**Response 404 (Friendship not found) :**
```json
{
  "error": "not_found",
  "message": "Amitié introuvable"
}
```

---

## 6️⃣ Socket.IO (Temps réel)

> ⚠️ **Socket.IO est utilisé UNIQUEMENT pour les notifications d'amis**
> Les messages utilisent le polling (GET /messages/new)

### **Connexion**

```javascript
const socket = io('http://localhost:30443');
```

### **Authentification**

**Event à envoyer :** `authenticate`

```javascript
socket.emit('authenticate', {
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
});
```

**Event reçu en cas de succès :** `authenticated`

```javascript
socket.on('authenticated', (data) => {
  console.log(data);
  // {
  //   "userId": 1,
  //   "message": "Authentification réussie"
  // }
});
```

**Event reçu en cas d'erreur :** `error`

```javascript
socket.on('error', (data) => {
  console.error(data);
  // {
  //   "message": "Token invalide"
  // }
});
```

---

### **Notifications de demandes d'ami**

**Event reçu :** `friend_request`

**Déclenché quand :** Quelqu'un vous envoie une demande d'ami

```javascript
socket.on('friend_request', (data) => {
  console.log(data);
  // {
  //   "id": 42,
  //   "sender": {
  //     "id": 2,
  //     "email": "bob@example.com"
  //   },
  //   "status": "pending",
  //   "createdAt": "2025-11-11T17:00:00.000Z"
  // }
  
  // Afficher notification Android
  showNotification("Demande d'ami de " + data.sender.email);
});
```

---

### **Notifications de réponse à une demande**

**Event reçu :** `friend_request_response`

**Déclenché quand :** Quelqu'un accepte/refuse votre demande

```javascript
socket.on('friend_request_response', (data) => {
  console.log(data);
  // {
  //   "requestId": 42,
  //   "status": "accepted",
  //   "responder": {
  //     "id": 2,
  //     "email": "bob@example.com"
  //   },
  //   "updatedAt": "2025-11-11T17:05:00.000Z"
  // }
  
  if (data.status === 'accepted') {
    showNotification(data.responder.email + " a accepté votre demande !");
  }
});
```

---

### **Déconnexion**

**Event à envoyer :** `disconnect`

```javascript
socket.disconnect();
```

---

## 📐 Règles métier importantes

### **1. E2EE - Chiffrement RSA asymétrique**

- ✅ Le chiffrement/déchiffrement est **toujours** fait côté client (Android)
- ✅ Le serveur **ne peut jamais** lire le contenu des messages
- ✅ Le client utilise la clé publique du destinataire pour chiffrer
- ✅ Le destinataire utilise sa clé privée pour déchiffrer
- ❌ Le serveur **ne doit JAMAIS** valider ni modifier le `content` (pas de `.trim()`, pas de regex)
- ✅ Format du content : Texte chiffré encodé en base64

### **2. Clés publiques RSA**

- ✅ Générées côté Android (paire clé publique/privée)
- ✅ La clé publique est uploadée au serveur via `PUT /users/public-key`
- ✅ La clé privée **NE DOIT JAMAIS** quitter l'appareil Android
- ✅ Recommandation : RSA 2048 bits ou 4096 bits

### **3. Demandes d'ami**

- ✅ Une seule demande active possible entre 2 users (dans n'importe quel sens)
- ✅ Si A a déjà envoyé une demande à B, B ne peut pas en envoyer une à A
- ✅ Une fois acceptée/refusée, une nouvelle demande peut être créée

### **4. Polling des messages**

- ✅ Recommandation : Polling toutes les 3-5 secondes avec `GET /messages/new`
- ✅ Utiliser le `timestamp` retourné comme `since` pour le prochain appel
- ✅ Gérer le cas où le réseau est indisponible (retry avec backoff)

### **5. Tokens JWT**

- ✅ Durée de vie : 7 jours
- ✅ Stockage Android : SharedPreferences (chiffré)
- ✅ Si token expiré (401), rediriger vers login

---

## 🧪 Exemples de flows complets

### **Flow 1 : Inscription + Upload clé publique**

```
1. POST /register
   → Reçoit token JWT
   → publicKey = null au départ

2. Génération locale (Android) :
   → Générer paire RSA (clé publique + clé privée)
   → Stocker clé privée en sécurité (Keystore Android)

3. PUT /users/public-key (avec token)
   → Upload clé publique RSA en base64

4. GET /me (avec token)
   → Confirme que publicKey est bien enregistrée
```

---

### **Flow 2 : Envoi de message chiffré (E2EE RSA)**

```
1. GET /users/search?q=bob
   → Trouve Bob (userId=2, publicKey: "MIIBIj...")

2. OU GET /users/2/public-key (avec token)
   → Récupère uniquement la clé publique de Bob

3. Chiffrement local (Android) :
   plaintext = "Salut Bob !"
   → Chiffrer avec la clé publique de Bob (RSA)
   → ciphertext = "aF3x9mK7vP2qL8nR4jT6yW1z..." (base64)

4. POST /messages (avec token)
   { "receiverId": 2, "content": "aF3x9mK7vP2qL8nR4jT6yW1z..." }
   → Message chiffré stocké en BDD (serveur ne peut pas lire)

5. Bob récupère le message :
   GET /messages/new?since=...
   → Reçoit { "content": "aF3x9mK7vP2qL8nR4jT6yW1z..." }

6. Déchiffrement local (Android) :
   ciphertext = "aF3x9mK7vP2qL8nR4jT6yW1z..."
   → Déchiffrer avec sa clé privée RSA
   → plaintext = "Salut Bob !"
```

---

### **Flow 3 : Demande d'ami + Notification**

```
Alice (userId=1)                    Serveur                    Bob (userId=2)
      |                                |                              |
      | POST /friends/request          |                              |
      | { receiverId: 2 }              |                              |
      |─────────────────────────────────>                              |
      |                                |                              |
      | 201 Created                    |                              |
      |<─────────────────────────────────                              |
      |                                |                              |
      |                                | Socket.IO emit               |
      |                                | 'friend_request'             |
      |                                |─────────────────────────────>|
      |                                |                              |
      |                                |          🔔 Notification !   |
      |                                |                              |
      |                                |        PUT /friends/request/42
      |                                |        { action: "accept" }  |
      |                                |<─────────────────────────────|
      |                                |                              |
      |                                | 200 OK                       |
      |                                |─────────────────────────────>|
      |                                |                              |
      | Socket.IO emit                 |                              |
      | 'friend_request_response'      |                              |
      |<─────────────────────────────────                              |
      |                                |                              |
🔔 Notification !                     |                              |
```

---

## 🔄 Changelog

| Version | Date | Modifications |
|---------|------|---------------|
| **2.0** | 2025-11-11 | E2EE avec chiffrement asymétrique RSA |
| **2.0-beta** | 2025-11-11 | E2EE Double Ratchet (abandonné) |
| **1.0** | 2025-11-01 | Version initiale (sans E2EE) |

### **Détails version 2.0 :**
- Ajout champ `publicKey` dans le modèle User
- Endpoint `PUT /users/public-key` : Upload/mise à jour clé publique
- Endpoint `GET /users/:id/public-key` : Récupération clé publique
- `publicKey` incluse dans register, login, /me, /users/search, /users/:id
- Messages chiffrés avec RSA (le serveur ne peut pas lire)

---

## 📝 Notes pour les développeurs

### **Backend (Node.js) :**

- ✅ Utiliser `server-e2ee.js` comme base
- ✅ Ne JAMAIS valider le format du `content` des messages (c'est chiffré)
- ✅ Ne JAMAIS utiliser `.trim()` sur le `content`
- ✅ Toujours retourner les timestamps en ISO 8601 UTC
- ✅ Consommer les oneTimePreKeys dans `GET /keys/:userId`

### **Android (Kotlin) :**

- ✅ Utiliser les APIs Java/Kotlin natives pour RSA (KeyPairGenerator, Cipher)
- ✅ Générer paire de clés RSA 2048 bits minimum
- ✅ Stocker clé privée dans Android Keystore (sécurisé)
- ✅ Encoder clé publique en base64 pour l'upload
- ✅ Chiffrer AVANT d'envoyer (avec clé publique destinataire)
- ✅ Déchiffrer APRÈS réception (avec sa clé privée)
- ✅ Polling toutes les 3-5 secondes avec `GET /messages/new`
- ✅ Gérer le cas où publicKey est null (utilisateur n'a pas encore de clé)

---

## ⚠️ Points d'attention critiques

### **🔒 Sécurité**

1. **Ne JAMAIS logger le `content` des messages** (chiffré mais sensible)
2. **Ne JAMAIS stocker de clés privées côté serveur**
3. **Valider que `receiverId` existe** avant de créer un message
4. **Vérifier que le JWT est valide** sur tous les endpoints protégés

### **🐛 Bugs à éviter**

1. **`.trim()` sur content chiffré** → Casse le chiffrement ❌
2. **Oublier de consommer les oneTimePreKeys** → Perte de forward secrecy
3. **Polling trop rapide** (< 2 sec) → Surcharge serveur
4. **Mauvais format de timestamp** (pas ISO 8601) → Erreurs de parsing

### **📈 Performance**

1. **Limiter les requêtes `GET /messages`** à 200 max
2. **Indexer les colonnes** `sender_id`, `receiver_id`, `created_at` en BDD
3. **Utiliser le polling intelligent** (augmenter interval si pas de messages)

---

## 📞 Support

**Questions/Clarifications :** Les 2 développeurs doivent se sync quotidiennement (15 min).

**Modifications du contrat :** Proposer la modification, discuter ensemble, mettre à jour ce fichier, commit Git.

---

**🔐 Ce contrat garantit que l'API et l'app Android fonctionnent ensemble parfaitement ! 🚀**
