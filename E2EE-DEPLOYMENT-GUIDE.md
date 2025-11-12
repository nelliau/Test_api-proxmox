# 🔐 Guide de déploiement - Serveur E2EE (End-to-End Encryption)

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Installation](#installation)
3. [Configuration de la base de données](#configuration-de-la-base-de-données)
4. [Démarrage du serveur](#démarrage-du-serveur)
5. [API Endpoints](#api-endpoints)
6. [Intégration Android](#intégration-android)
7. [Sécurité](#sécurité)
8. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

Ce serveur implémente le **chiffrement de bout en bout (E2EE)** basé sur le protocole **Double Ratchet** (même technologie que Signal).

### **Architecture**

```
┌─────────────┐                  ┌─────────────┐
│   Client A  │                  │   Client B  │
│  (Android)  │                  │  (Android)  │
└──────┬──────┘                  └──────┬──────┘
       │                                │
       │   Clés publiques               │
       ├───────────────┐    ┌───────────┤
       │               ▼    ▼           │
       │          ┌─────────────┐       │
       │          │   Serveur   │       │
       │          │   Node.js   │       │
       │          └─────────────┘       │
       │               │                │
       │   Message chiffré              │
       ├──────────────►│                │
       │               ├───────────────►│
       │               │                │
       │         Stocke en BDD          │
       │      (serveur ne peut pas      │
       │       déchiffrer !)            │
       │                                │
       └────────────────────────────────┘
```

### **Caractéristiques de sécurité**

✅ **Chiffrement de bout en bout** : Seuls expéditeur et destinataire peuvent lire les messages  
✅ **Forward Secrecy** : Même si une clé est compromise, les anciens messages restent sécurisés  
✅ **Authentification** : Vérification de l'identité des participants  
✅ **Protection MITM** : Signatures cryptographiques empêchent les attaques "man-in-the-middle"  
✅ **Serveur aveugle** : Le serveur stocke uniquement des données chiffrées illisibles  

---

## 📦 Installation

### **1. Prérequis**

- Node.js 18+ et npm
- MySQL 8.0+
- Git

### **2. Cloner ou copier les fichiers**

Vous avez maintenant ces fichiers :
- `server-e2ee.js` → Serveur Node.js avec E2EE
- `create-prekey-bundles-table.sql` → Script SQL pour la nouvelle table

### **3. Installer les dépendances**

```bash
npm install express cors socket.io dotenv sequelize mysql2 jsonwebtoken bcryptjs
```

Aucune nouvelle dépendance nécessaire - même `package.json` que le serveur sans E2EE !

---

## 🗄️ Configuration de la base de données

### **Étape 1 : Créer la nouvelle table `prekey_bundles`**

Connectez-vous à MySQL :

```bash
mysql -u API -p -h 192.168.105.3 -P 3306 Dashkey_test
```

Exécutez le script SQL :

```bash
source create-prekey-bundles-table.sql
```

OU exécutez directement :

```bash
mysql -u API -p -h 192.168.105.3 -P 3306 Dashkey_test < create-prekey-bundles-table.sql
```

### **Étape 2 : Vérifier la création**

```sql
SHOW TABLES LIKE 'prekey_bundles';

DESCRIBE prekey_bundles;
```

Vous devriez voir :

```
+-------------------------+--------------+
| Field                   | Type         |
+-------------------------+--------------+
| id                      | int          |
| user_id                 | int          |
| identity_key            | text         |
| signed_prekey_id        | int          |
| signed_prekey_public    | text         |
| signed_prekey_signature | text         |
| one_time_prekeys        | longtext     |
| created_at              | datetime     |
| updated_at              | datetime     |
+-------------------------+--------------+
```

---

## 🚀 Démarrage du serveur

### **Option 1 : Remplacer le serveur existant**

```bash
# Arrêter l'ancien serveur
pkill -f "node server.js"

# Sauvegarder l'ancien fichier
mv server.js server-old.js

# Utiliser le nouveau serveur E2EE
mv server-e2ee.js server.js

# Démarrer le nouveau serveur
node server.js
```

### **Option 2 : Tester en parallèle (port différent)**

Modifier `.env` pour utiliser un autre port :

```bash
PORT=30444  # Au lieu de 30443
```

Puis :

```bash
node server-e2ee.js
```

### **Logs de démarrage**

Si tout fonctionne, vous verrez :

```
✅ Database connection established
✅ Database models synced
============================================================
🚀 E2EE Messaging Server Started
============================================================
📡 Port: 30443
🔐 Protocol: Double Ratchet (Signal Protocol)
🔒 E2EE: Enabled (server cannot read messages)
💬 Messaging: REST API + Polling
🔔 Notifications: Socket.IO (friend requests only)
🔑 JWT: Enabled (7d expiration)
============================================================
```

---

## 🔌 API Endpoints

### **Nouveaux endpoints E2EE**

#### **1. Upload des clés publiques**

```http
POST /keys/upload
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "identityKey": "base64_encoded_public_key",
  "signedPreKeyId": 1,
  "signedPreKeyPublic": "base64_encoded_signed_prekey",
  "signedPreKeySignature": "base64_encoded_signature",
  "oneTimePreKeys": [
    { "keyId": 1, "publicKey": "base64_key_1" },
    { "keyId": 2, "publicKey": "base64_key_2" }
  ]
}
```

**Réponse :**
```json
{
  "message": "Clés publiques uploadées avec succès",
  "bundleId": 123,
  "oneTimePreKeysCount": 2
}
```

---

#### **2. Récupérer les clés publiques d'un utilisateur**

```http
GET /keys/:userId
Authorization: Bearer <JWT_TOKEN>
```

**Exemple :**
```bash
curl -X GET http://localhost:30443/keys/2 \
  -H "Authorization: Bearer eyJhbGc..."
```

**Réponse :**
```json
{
  "userId": 2,
  "identityKey": "base64_identity_key",
  "signedPreKey": {
    "keyId": 1,
    "publicKey": "base64_signed_prekey",
    "signature": "base64_signature"
  },
  "oneTimePreKey": {
    "keyId": 1,
    "publicKey": "base64_one_time_key"
  }
}
```

⚠️ **Note** : Les `oneTimePreKey` sont **consommées** (supprimées) après récupération pour garantir la forward secrecy.

---

#### **3. Vérifier son propre bundle de clés**

```http
GET /keys
Authorization: Bearer <JWT_TOKEN>
```

**Réponse :**
```json
{
  "bundleId": 123,
  "userId": 1,
  "signedPreKeyId": 1,
  "oneTimePreKeysCount": 15,
  "createdAt": "2025-11-11T10:00:00Z",
  "updatedAt": "2025-11-11T10:00:00Z"
}
```

---

### **Endpoints modifiés**

#### **POST /messages** (accepte maintenant du contenu chiffré)

```http
POST /messages
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "receiverId": 2,
  "content": "aF3x9mK7vP2qL8nR4jT6yW1zC5hD9eB0..."  ← Texte chiffré (base64)
}
```

🔒 Le serveur stocke le `content` **sans le lire ni le valider** (c'est du texte chiffré).

---

#### **GET /messages** (retourne des messages chiffrés)

```http
GET /messages?userId=2
Authorization: Bearer <JWT_TOKEN>
```

**Réponse :**
```json
[
  {
    "id": 1,
    "senderId": 1,
    "receiverId": 2,
    "content": "aF3x9mK7vP2qL8nR4jT6yW1zC5hD9eB0...",  ← Chiffré !
    "createdAt": "2025-11-11T10:00:00Z",
    "sender": { "id": 1, "email": "alice@test.com" },
    "receiver": { "id": 2, "email": "bob@test.com" }
  }
]
```

---

## 📱 Intégration Android

### **1. Ajouter la dépendance Signal Protocol**

Dans `app/build.gradle.kts` :

```kotlin
dependencies {
    // Signal Protocol pour E2EE
    implementation("org.signal:libsignal-client:0.42.2")
    
    // Autres dépendances existantes...
}
```

### **2. Flow d'initialisation**

```kotlin
// 1. Générer les clés localement (sur Android)
val identityKeyPair = IdentityKeyPair.generate()
val signedPreKey = SignedPreKey.generate(identityKeyPair, 1)
val oneTimePreKeys = (1..100).map { OneTimePreKey.generate(it) }

// 2. Extraire les clés publiques
val bundle = PreKeyBundle(
    identityKey = identityKeyPair.publicKey.serialize().toBase64(),
    signedPreKeyId = 1,
    signedPreKeyPublic = signedPreKey.publicKey.serialize().toBase64(),
    signedPreKeySignature = signedPreKey.signature.toBase64(),
    oneTimePreKeys = oneTimePreKeys.map {
        OneTimePreKeyDto(it.id, it.publicKey.serialize().toBase64())
    }
)

// 3. Uploader vers le serveur
apiService.uploadKeys(token, bundle)
```

### **3. Flow d'envoi de message**

```kotlin
// 1. Récupérer les clés publiques du destinataire
val recipientBundle = apiService.getKeys(token, recipientUserId)

// 2. Initialiser la session Double Ratchet
val sessionBuilder = SessionBuilder(store, recipientAddress)
sessionBuilder.process(recipientBundle)

// 3. Chiffrer le message
val cipher = SessionCipher(store, recipientAddress)
val ciphertext = cipher.encrypt("Bonjour !".toByteArray())

// 4. Envoyer le message chiffré
apiService.sendMessage(token, SendMessageRequest(
    receiverId = recipientUserId,
    content = ciphertext.serialize().toBase64()
))
```

### **4. Flow de réception de message**

```kotlin
// 1. Récupérer les nouveaux messages (polling)
val messages = apiService.getNewMessages(token, since)

// 2. Déchiffrer chaque message
messages.forEach { msg ->
    val cipher = SessionCipher(store, senderAddress)
    val plaintext = cipher.decrypt(msg.content.fromBase64())
    val decryptedText = String(plaintext)
    
    // Afficher le message déchiffré
    println("Message de ${msg.sender.email}: $decryptedText")
}
```

---

## 🔐 Sécurité

### **Ce qui est stocké sur le serveur**

✅ **Clés publiques** (dans `prekey_bundles`)  
✅ **Messages chiffrés** (dans `message.content`)  
✅ **Métadonnées** (expéditeur, destinataire, horodatage)  

❌ **Clés privées** → Jamais ! Restent sur Android  
❌ **Contenu des messages en clair** → Jamais !  

### **Vérification de l'intégrité**

Le serveur **ne peut pas** :
- Lire le contenu des messages
- Modifier les messages sans que les clients le détectent (signatures)
- Se faire passer pour un utilisateur (identité cryptographique)

### **Recommandations**

1. **Vérification des clés d'identité** : Implémenter un système de "Safety Numbers" comme Signal
2. **Rotation des clés** : Re-uploader les `signedPreKey` tous les 30 jours
3. **Régénération des OneTimePreKeys** : Quand il en reste moins de 10
4. **Backup des clés** : Stocker les clés privées de façon sécurisée sur Android (Keystore)

---

## 🐛 Dépannage

### **Erreur : "Clés publiques non trouvées"**

**Symptôme :**
```json
{ "error": "not_found", "message": "Clés publiques non trouvées pour cet utilisateur" }
```

**Cause :** L'utilisateur n'a pas encore uploadé ses clés publiques.

**Solution :** Le client doit d'abord appeler `POST /keys/upload` après l'inscription.

---

### **Erreur : "No one-time prekeys available"**

**Symptôme :** Dans les logs :
```
⚠️  No one-time prekeys available for user 2
```

**Cause :** Toutes les clés éphémères ont été consommées.

**Solution :** 
- Le protocole fonctionne toujours (fallback sur `signedPreKey`)
- Mais il faut régénérer des `oneTimePreKeys` côté Android
- Appeler à nouveau `POST /keys/upload` avec de nouvelles clés

---

### **Erreur : "Failed to decrypt message"**

**Cause possible :** Désynchronisation de la session Double Ratchet.

**Solution :**
1. Réinitialiser la session
2. Récupérer à nouveau les clés publiques (`GET /keys/:userId`)
3. Reconstruire la session Signal

---

### **Messages stockés en clair dans la BDD**

**Vérification :**
```sql
SELECT content FROM message LIMIT 1;
```

Si vous voyez du texte lisible (ex: "Bonjour"), le chiffrement **n'est pas actif** côté client.

Si vous voyez du texte illisible (ex: "aF3x9mK7vP2qL..."), le chiffrement **fonctionne** ✅

---

## 📊 Tests

### **Test 1 : Upload des clés**

```bash
curl -X POST http://localhost:30443/keys/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "identityKey": "test_identity_key_base64",
    "signedPreKeyId": 1,
    "signedPreKeyPublic": "test_signed_prekey_base64",
    "signedPreKeySignature": "test_signature_base64",
    "oneTimePreKeys": [
      {"keyId": 1, "publicKey": "test_otpk_1"},
      {"keyId": 2, "publicKey": "test_otpk_2"}
    ]
  }'
```

### **Test 2 : Récupération des clés**

```bash
curl -X GET http://localhost:30443/keys/2 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Test 3 : Envoi de message chiffré**

```bash
curl -X POST http://localhost:30443/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": 2,
    "content": "aF3x9mK7vP2qL8nR4jT6yW1zC5hD9eB0_ENCRYPTED_CONTENT"
  }'
```

---

## 🎉 Félicitations !

Vous avez maintenant un serveur de messagerie avec **chiffrement de bout en bout** utilisant le protocole **Double Ratchet** ! 🔐

### **Prochaines étapes**

1. ✅ Déployer le serveur sur votre machine API-EFRIE
2. ✅ Créer la table `prekey_bundles` en BDD
3. ✅ Intégrer libsignal dans votre app Android
4. ✅ Tester l'échange de messages chiffrés
5. ✅ Implémenter la vérification des "Safety Numbers"

---

## 📚 Ressources

- [Signal Protocol Documentation](https://signal.org/docs/)
- [libsignal-client Android](https://github.com/signalapp/libsignal)
- [Double Ratchet Algorithm](https://signal.org/docs/specifications/doubleratchet/)

---

**🔐 Vos messages sont maintenant protégés par le même niveau de sécurité que Signal, WhatsApp et Telegram Secret Chats !**
