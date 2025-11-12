// ============================================================================
// EXEMPLE : Intégration E2EE (Signal Protocol) dans Android
// ============================================================================
// Ce fichier montre comment utiliser libsignal-client avec le serveur E2EE
// ⚠️ Ceci est un EXEMPLE simplifié à adapter à votre architecture
// ============================================================================

package com.example.dashkey.e2ee

import android.content.Context
import org.signal.libsignal.protocol.*
import org.signal.libsignal.protocol.state.*
import org.signal.libsignal.protocol.util.KeyHelper
import java.util.*
import android.util.Base64

// ============================================================================
// 1. DATA CLASSES pour les API Requests/Responses
// ============================================================================

data class PreKeyBundleUploadRequest(
    val identityKey: String,
    val signedPreKeyId: Int,
    val signedPreKeyPublic: String,
    val signedPreKeySignature: String,
    val oneTimePreKeys: List<OneTimePreKeyDto>
)

data class OneTimePreKeyDto(
    val keyId: Int,
    val publicKey: String
)

data class PreKeyBundleResponse(
    val userId: Int,
    val identityKey: String,
    val signedPreKey: SignedPreKeyDto,
    val oneTimePreKey: OneTimePreKeyDto?
)

data class SignedPreKeyDto(
    val keyId: Int,
    val publicKey: String,
    val signature: String
)

// ============================================================================
// 2. SIGNAL PROTOCOL STORE (stockage des clés et sessions)
// ============================================================================

class SignalProtocolStoreImpl(
    private val context: Context,
    private val userId: Int
) : SignalProtocolStore {
    
    private val prefs = context.getSharedPreferences("signal_store_$userId", Context.MODE_PRIVATE)
    
    // Identity Key Pair (clé principale de l'utilisateur)
    private var identityKeyPair: IdentityKeyPair
    private val registrationId: Int
    
    init {
        // Charger ou générer l'identity key
        val savedIdentity = prefs.getString("identity_key_pair", null)
        identityKeyPair = if (savedIdentity != null) {
            deserializeIdentityKeyPair(savedIdentity)
        } else {
            val newPair = KeyHelper.generateIdentityKeyPair()
            prefs.edit()
                .putString("identity_key_pair", serializeIdentityKeyPair(newPair))
                .apply()
            newPair
        }
        
        // Registration ID (unique ID pour ce device)
        registrationId = prefs.getInt("registration_id", 0).let {
            if (it == 0) {
                val newId = KeyHelper.generateRegistrationId(false)
                prefs.edit().putInt("registration_id", newId).apply()
                newId
            } else it
        }
    }
    
    // IdentityKeyStore implementation
    override fun getIdentityKeyPair(): IdentityKeyPair = identityKeyPair
    
    override fun getLocalRegistrationId(): Int = registrationId
    
    override fun saveIdentity(address: SignalProtocolAddress, identityKey: IdentityKey): Boolean {
        val key = "identity_${address.name}_${address.deviceId}"
        val saved = prefs.getString(key, null)
        
        if (saved == null) {
            prefs.edit().putString(key, identityKey.serialize().toBase64()).apply()
            return false // First time seeing this identity
        }
        
        val savedKey = IdentityKey(saved.fromBase64(), 0)
        return savedKey == identityKey
    }
    
    override fun isTrustedIdentity(
        address: SignalProtocolAddress,
        identityKey: IdentityKey,
        direction: IdentityKeyStore.Direction
    ): Boolean {
        val key = "identity_${address.name}_${address.deviceId}"
        val saved = prefs.getString(key, null) ?: return true
        
        val savedKey = IdentityKey(saved.fromBase64(), 0)
        return savedKey == identityKey
    }
    
    override fun getIdentity(address: SignalProtocolAddress): IdentityKey? {
        val key = "identity_${address.name}_${address.deviceId}"
        val saved = prefs.getString(key, null) ?: return null
        return IdentityKey(saved.fromBase64(), 0)
    }
    
    // PreKeyStore implementation (simplified)
    override fun loadPreKey(preKeyId: Int): PreKeyRecord {
        val key = "prekey_$preKeyId"
        val saved = prefs.getString(key, null) 
            ?: throw InvalidKeyIdException("PreKey $preKeyId not found")
        return PreKeyRecord(saved.fromBase64())
    }
    
    override fun storePreKey(preKeyId: Int, record: PreKeyRecord) {
        prefs.edit().putString("prekey_$preKeyId", record.serialize().toBase64()).apply()
    }
    
    override fun containsPreKey(preKeyId: Int): Boolean {
        return prefs.contains("prekey_$preKeyId")
    }
    
    override fun removePreKey(preKeyId: Int) {
        prefs.edit().remove("prekey_$preKeyId").apply()
    }
    
    // SignedPreKeyStore implementation
    override fun loadSignedPreKey(signedPreKeyId: Int): SignedPreKeyRecord {
        val key = "signed_prekey_$signedPreKeyId"
        val saved = prefs.getString(key, null)
            ?: throw InvalidKeyIdException("SignedPreKey $signedPreKeyId not found")
        return SignedPreKeyRecord(saved.fromBase64())
    }
    
    override fun loadSignedPreKeys(): List<SignedPreKeyRecord> {
        return prefs.all.entries
            .filter { it.key.startsWith("signed_prekey_") }
            .map { SignedPreKeyRecord((it.value as String).fromBase64()) }
    }
    
    override fun storeSignedPreKey(signedPreKeyId: Int, record: SignedPreKeyRecord) {
        prefs.edit()
            .putString("signed_prekey_$signedPreKeyId", record.serialize().toBase64())
            .apply()
    }
    
    override fun containsSignedPreKey(signedPreKeyId: Int): Boolean {
        return prefs.contains("signed_prekey_$signedPreKeyId")
    }
    
    override fun removeSignedPreKey(signedPreKeyId: Int) {
        prefs.edit().remove("signed_prekey_$signedPreKeyId").apply()
    }
    
    // SessionStore implementation (simplified)
    override fun loadSession(address: SignalProtocolAddress): SessionRecord {
        val key = "session_${address.name}_${address.deviceId}"
        val saved = prefs.getString(key, null) 
            ?: return SessionRecord()
        return SessionRecord(saved.fromBase64())
    }
    
    override fun getSubDeviceSessions(name: String): List<Int> {
        return prefs.all.keys
            .filter { it.startsWith("session_${name}_") }
            .map { it.substringAfterLast("_").toInt() }
    }
    
    override fun storeSession(address: SignalProtocolAddress, record: SessionRecord) {
        val key = "session_${address.name}_${address.deviceId}"
        prefs.edit().putString(key, record.serialize().toBase64()).apply()
    }
    
    override fun containsSession(address: SignalProtocolAddress): Boolean {
        val key = "session_${address.name}_${address.deviceId}"
        return prefs.contains(key)
    }
    
    override fun deleteSession(address: SignalProtocolAddress) {
        val key = "session_${address.name}_${address.deviceId}"
        prefs.edit().remove(key).apply()
    }
    
    override fun deleteAllSessions(name: String) {
        val toRemove = prefs.all.keys.filter { it.startsWith("session_${name}_") }
        prefs.edit().apply {
            toRemove.forEach { remove(it) }
        }.apply()
    }
    
    // Helper functions
    private fun serializeIdentityKeyPair(pair: IdentityKeyPair): String {
        return pair.serialize().toBase64()
    }
    
    private fun deserializeIdentityKeyPair(serialized: String): IdentityKeyPair {
        return IdentityKeyPair(serialized.fromBase64())
    }
}

// ============================================================================
// 3. E2EE MANAGER (gestionnaire principal du chiffrement)
// ============================================================================

class E2EEManager(
    context: Context,
    private val userId: Int,
    private val apiService: MessagingApi
) {
    private val store = SignalProtocolStoreImpl(context, userId)
    
    // ========================================================================
    // Initialisation : Générer et uploader les clés
    // ========================================================================
    
    suspend fun initializeKeys(token: String) {
        // 1. Générer un SignedPreKey
        val signedPreKey = KeyHelper.generateSignedPreKey(
            store.identityKeyPair,
            signedPreKeyId = 1
        )
        store.storeSignedPreKey(1, signedPreKey)
        
        // 2. Générer 100 OneTimePreKeys
        val oneTimePreKeys = KeyHelper.generatePreKeys(
            startId = 1,
            count = 100
        )
        oneTimePreKeys.forEach { store.storePreKey(it.id, it) }
        
        // 3. Préparer le bundle à uploader
        val bundle = PreKeyBundleUploadRequest(
            identityKey = store.identityKeyPair.publicKey.serialize().toBase64(),
            signedPreKeyId = 1,
            signedPreKeyPublic = signedPreKey.keyPair.publicKey.serialize().toBase64(),
            signedPreKeySignature = signedPreKey.signature.toBase64(),
            oneTimePreKeys = oneTimePreKeys.map { preKey ->
                OneTimePreKeyDto(
                    keyId = preKey.id,
                    publicKey = preKey.keyPair.publicKey.serialize().toBase64()
                )
            }
        )
        
        // 4. Uploader vers le serveur
        val response = apiService.uploadKeys("Bearer $token", bundle)
        
        if (!response.isSuccessful) {
            throw Exception("Failed to upload keys: ${response.errorBody()?.string()}")
        }
        
        println("✅ Keys uploaded successfully!")
    }
    
    // ========================================================================
    // Envoi de message chiffré
    // ========================================================================
    
    suspend fun sendEncryptedMessage(
        token: String,
        receiverId: Int,
        plaintext: String
    ): Int {
        val address = SignalProtocolAddress(receiverId.toString(), 1)
        
        // 1. Vérifier si une session existe
        if (!store.containsSession(address)) {
            // Créer une nouvelle session
            initializeSession(token, receiverId)
        }
        
        // 2. Chiffrer le message
        val cipher = SessionCipher(store, address)
        val ciphertext = cipher.encrypt(plaintext.toByteArray())
        
        // 3. Sérialiser le ciphertext
        val encryptedContent = when (ciphertext.type) {
            CiphertextMessage.PREKEY_TYPE -> {
                "PREKEY:" + ciphertext.serialize().toBase64()
            }
            CiphertextMessage.WHISPER_TYPE -> {
                "WHISPER:" + ciphertext.serialize().toBase64()
            }
            else -> throw Exception("Unknown ciphertext type")
        }
        
        // 4. Envoyer au serveur
        val response = apiService.sendMessage(
            token = "Bearer $token",
            request = SendMessageRequest(
                receiverId = receiverId,
                content = encryptedContent
            )
        )
        
        if (!response.isSuccessful) {
            throw Exception("Failed to send message: ${response.errorBody()?.string()}")
        }
        
        return response.body()?.id ?: throw Exception("No message ID returned")
    }
    
    // ========================================================================
    // Réception et déchiffrement de message
    // ========================================================================
    
    fun decryptMessage(senderId: Int, encryptedContent: String): String {
        val address = SignalProtocolAddress(senderId.toString(), 1)
        val cipher = SessionCipher(store, address)
        
        return try {
            // Extraire le type et les données
            val (type, data) = encryptedContent.split(":", limit = 2)
            
            val plaintext = when (type) {
                "PREKEY" -> {
                    val message = PreKeySignalMessage(data.fromBase64())
                    cipher.decrypt(message)
                }
                "WHISPER" -> {
                    val message = SignalMessage(data.fromBase64())
                    cipher.decrypt(message)
                }
                else -> throw Exception("Unknown message type: $type")
            }
            
            String(plaintext)
        } catch (e: Exception) {
            println("❌ Decryption failed: ${e.message}")
            "⚠️ [Message chiffré - erreur de déchiffrement]"
        }
    }
    
    // ========================================================================
    // Initialisation de session avec un contact
    // ========================================================================
    
    private suspend fun initializeSession(token: String, receiverId: Int) {
        println("🔑 Fetching prekey bundle for user $receiverId...")
        
        // 1. Récupérer le bundle de clés du destinataire
        val response = apiService.getKeys("Bearer $token", receiverId)
        
        if (!response.isSuccessful) {
            throw Exception("Failed to get keys: ${response.errorBody()?.string()}")
        }
        
        val bundle = response.body() ?: throw Exception("Empty response")
        
        // 2. Convertir en PreKeyBundle Signal
        val signalBundle = PreKeyBundle(
            registrationId = 0, // Not used in our case
            deviceId = 1,
            preKeyId = bundle.oneTimePreKey?.keyId ?: 0,
            preKey = bundle.oneTimePreKey?.publicKey?.fromBase64()?.let { 
                ECPublicKey(it) 
            },
            signedPreKeyId = bundle.signedPreKey.keyId,
            signedPreKey = ECPublicKey(bundle.signedPreKey.publicKey.fromBase64()),
            signedPreKeySignature = bundle.signedPreKey.signature.fromBase64(),
            identityKey = IdentityKey(bundle.identityKey.fromBase64(), 0)
        )
        
        // 3. Créer la session
        val address = SignalProtocolAddress(receiverId.toString(), 1)
        val sessionBuilder = SessionBuilder(store, address)
        sessionBuilder.process(signalBundle)
        
        println("✅ Session initialized with user $receiverId")
    }
}

// ============================================================================
// 4. EXTENSION FUNCTIONS (helpers)
// ============================================================================

fun ByteArray.toBase64(): String {
    return Base64.encodeToString(this, Base64.NO_WRAP)
}

fun String.fromBase64(): ByteArray {
    return Base64.decode(this, Base64.NO_WRAP)
}

// ============================================================================
// 5. EXEMPLE D'UTILISATION
// ============================================================================

class MessagingViewModel(
    private val context: Context,
    private val apiService: MessagingApi,
    private val tokenManager: TokenManager
) : ViewModel() {
    
    private lateinit var e2eeManager: E2EEManager
    
    // Initialiser après login
    suspend fun initializeE2EE(userId: Int) {
        e2eeManager = E2EEManager(context, userId, apiService)
        
        val token = tokenManager.getToken() ?: throw Exception("No token")
        
        // Générer et uploader les clés (une fois au premier lancement)
        e2eeManager.initializeKeys(token)
    }
    
    // Envoyer un message chiffré
    suspend fun sendMessage(receiverId: Int, message: String) {
        val token = tokenManager.getToken() ?: throw Exception("No token")
        
        try {
            val messageId = e2eeManager.sendEncryptedMessage(
                token = token,
                receiverId = receiverId,
                plaintext = message
            )
            println("✅ Encrypted message sent (ID: $messageId)")
        } catch (e: Exception) {
            println("❌ Failed to send message: ${e.message}")
        }
    }
    
    // Récupérer et déchiffrer les messages
    suspend fun fetchMessages(otherUserId: Int) {
        val token = tokenManager.getToken() ?: throw Exception("No token")
        
        val response = apiService.getMessages("Bearer $token", otherUserId)
        
        if (response.isSuccessful) {
            val encryptedMessages = response.body() ?: emptyList()
            
            val decryptedMessages = encryptedMessages.map { msg ->
                val decrypted = e2eeManager.decryptMessage(
                    senderId = msg.senderId,
                    encryptedContent = msg.content
                )
                
                msg.copy(content = decrypted)
            }
            
            // Afficher les messages déchiffrés
            decryptedMessages.forEach { msg ->
                println("💬 ${msg.sender.email}: ${msg.content}")
            }
        }
    }
}

// ============================================================================
// 6. AJOUT À L'API SERVICE (Retrofit)
// ============================================================================

interface MessagingApi {
    // ... endpoints existants ...
    
    // Nouveaux endpoints E2EE
    @POST("keys/upload")
    suspend fun uploadKeys(
        @Header("Authorization") token: String,
        @Body bundle: PreKeyBundleUploadRequest
    ): Response<UploadKeysResponse>
    
    @GET("keys/{userId}")
    suspend fun getKeys(
        @Header("Authorization") token: String,
        @Path("userId") userId: Int
    ): Response<PreKeyBundleResponse>
}

data class UploadKeysResponse(
    val message: String,
    val bundleId: Int,
    val oneTimePreKeysCount: Int
)

// ============================================================================
// 7. FLOW COMPLET : Inscription → Chiffrement → Déchiffrement
// ============================================================================

/*

1. ALICE S'INSCRIT
==================
POST /register { email: "alice@test.com", password: "..." }
→ Reçoit JWT token

2. ALICE INITIALISE E2EE
========================
e2eeManager.initializeKeys(token)
→ Génère identityKey, signedPreKey, oneTimePreKeys
→ POST /keys/upload (clés publiques uniquement)

3. BOB S'INSCRIT ET INITIALISE E2EE
====================================
POST /register { email: "bob@test.com", password: "..." }
e2eeManager.initializeKeys(token)

4. ALICE ENVOIE MESSAGE À BOB
==============================
e2eeManager.sendEncryptedMessage(bobId, "Salut Bob !")
→ GET /keys/bob_id (récupère clés publiques de Bob)
→ Crée session Double Ratchet
→ Chiffre "Salut Bob !" → "aF3x9mK7..."
→ POST /messages { receiverId: bobId, content: "aF3x9mK7..." }

5. BOB RÉCUPÈRE ET DÉCHIFFRE
=============================
GET /messages?userId=aliceId
→ Reçoit { content: "aF3x9mK7..." }
e2eeManager.decryptMessage(aliceId, "aF3x9mK7...")
→ Déchiffre → "Salut Bob !"

6. CONVERSATION CONTINUE
========================
Chaque message utilise la session établie
Double Ratchet rotate les clés automatiquement
Forward secrecy garantie

*/

// ============================================================================
// FIN DE L'EXEMPLE
// ============================================================================
