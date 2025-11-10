# 📱 Guide d'Intégration Android - API Messagerie

## 🎯 Informations essentielles pour Retrofit

### 1️⃣ URL de base (Base URL)

```
http://votre-serveur-proxmox:3000/
```

**Exemple concret :**
- Si votre serveur Proxmox a l'IP `192.168.1.50` et le port `3000` :
  ```
  http://192.168.1.50:3000/
  ```

**⚠️ Important :** 
- Pas de `/api/` dans l'URL (les endpoints sont directement à la racine)
- En production avec SSL : `https://votre-domaine.com/`

---

## 2️⃣ Endpoints de l'API

### 📝 Inscription (Register)

**URL complète :** `http://votre-serveur:3000/register`

**Méthode :** `POST`

**Headers requis :**
```
Content-Type: application/json
```

**Données à envoyer (Request Body) :**
```json
{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```

**Réponse en cas de SUCCÈS (201 Created) :**
```json
{
  "message": "Utilisateur créé avec succès",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGVzIjpbIlJPTEVfVVNFUiJdLCJpYXQiOjE2OTk5OTk5OTksImV4cCI6MTcwMDYwNDc5OX0.xxxxxxxxxxxxx",
  "user": {
    "id": 5,
    "email": "user@example.com",
    "roles": ["ROLE_USER"]
  }
}
```

**Réponses en cas d'ERREUR :**

**400 Bad Request** (Données invalides) :
```json
{
  "error": "bad_request",
  "message": "Email et mot de passe requis"
}
```
ou
```json
{
  "error": "bad_request",
  "message": "Le mot de passe doit contenir au moins 6 caractères"
}
```

**409 Conflict** (Email déjà utilisé) :
```json
{
  "error": "conflict",
  "message": "Cet email est déjà utilisé"
}
```

**500 Internal Server Error** :
```json
{
  "error": "internal_error",
  "message": "Erreur lors de la création du compte"
}
```

---

### 🔑 Connexion (Login)

**URL complète :** `http://votre-serveur:3000/login`

**Méthode :** `POST`

**Headers requis :**
```
Content-Type: application/json
```

**Données à envoyer (Request Body) :**
```json
{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```

**Réponse en cas de SUCCÈS (200 OK) :**
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGVzIjpbIlJPTEVfVVNFUiJdLCJpYXQiOjE2OTk5OTk5OTksImV4cCI6MTcwMDYwNDc5OX0.xxxxxxxxxxxxx",
  "user": {
    "id": 5,
    "email": "user@example.com",
    "roles": ["ROLE_USER"]
  }
}
```

**Réponses en cas d'ERREUR :**

**400 Bad Request** (Données manquantes) :
```json
{
  "error": "bad_request",
  "message": "Email et mot de passe requis"
}
```

**401 Unauthorized** (Identifiants incorrects) :
```json
{
  "error": "unauthorized",
  "message": "Email ou mot de passe incorrect"
}
```

**500 Internal Server Error** :
```json
{
  "error": "internal_error",
  "message": "Erreur lors de la connexion"
}
```

---

### 👤 Profil Utilisateur (Get Me)

**URL complète :** `http://votre-serveur:3000/me`

**Méthode :** `GET`

**Headers requis :**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Réponse SUCCÈS (200 OK) :**
```json
{
  "id": 5,
  "email": "user@example.com",
  "roles": ["ROLE_USER"]
}
```

**Réponses ERREUR :**

**401 Unauthorized** (Token invalide/manquant) :
```json
{
  "error": "unauthorized",
  "message": "Token manquant ou invalide"
}
```

---

### 💬 Historique Messages

**URL complète :** `http://votre-serveur:3000/messages?userId=2&limit=50`

**Méthode :** `GET`

**Headers requis :**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters :**
- `userId` (requis) : ID de l'autre utilisateur
- `limit` (optionnel) : Nombre max de messages (défaut: 50, max: 200)

**Réponse SUCCÈS (200 OK) :**
```json
[
  {
    "id": 1,
    "senderId": 5,
    "receiverId": 2,
    "content": "Salut, comment ça va ?",
    "createdAt": "2025-11-07T10:30:00.000Z",
    "sender": {
      "id": 5,
      "email": "user@example.com"
    },
    "receiver": {
      "id": 2,
      "email": "autre@example.com"
    }
  },
  {
    "id": 2,
    "senderId": 2,
    "receiverId": 5,
    "content": "Très bien merci !",
    "createdAt": "2025-11-07T10:31:00.000Z",
    "sender": {
      "id": 2,
      "email": "autre@example.com"
    },
    "receiver": {
      "id": 5,
      "email": "user@example.com"
    }
  }
]
```

**Réponses ERREUR :**

**400 Bad Request** (userId manquant) :
```json
{
  "error": "bad_request",
  "message": "userId requis en query parameter"
}
```

**401 Unauthorized** :
```json
{
  "error": "unauthorized",
  "message": "Token invalide ou expiré"
}
```

---

### 📤 Envoyer un Message

**URL complète :** `http://votre-serveur:3000/messages`

**Méthode :** `POST`

**Headers requis :**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Données à envoyer :**
```json
{
  "receiverId": 2,
  "content": "Bonjour, comment allez-vous ?"
}
```

**Réponse SUCCÈS (201 Created) :**
```json
{
  "id": 3,
  "senderId": 5,
  "receiverId": 2,
  "content": "Bonjour, comment allez-vous ?",
  "createdAt": "2025-11-07T10:35:00.000Z"
}
```

**Réponses ERREUR :**

**400 Bad Request** :
```json
{
  "error": "bad_request",
  "message": "receiverId et content requis"
}
```

**404 Not Found** (Destinataire inexistant) :
```json
{
  "error": "not_found",
  "message": "Destinataire introuvable"
}
```

---

## 3️⃣ Code Kotlin pour Retrofit

### Étape 1 : Dépendances Gradle

**Fichier :** `app/build.gradle.kts` ou `app/build.gradle`

```kotlin
dependencies {
    // Retrofit
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    
    // OkHttp (pour les intercepteurs)
    implementation("com.squareup.okhttp3:okhttp:4.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")
    
    // Coroutines (si pas déjà présent)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")
}
```

### Étape 2 : Modèles de données (Data Classes)

**Fichier :** `data/models/ApiModels.kt`

```kotlin
package com.example.votreapp.data.models

import com.google.gson.annotations.SerializedName

// ===== REQUÊTES =====

data class RegisterRequest(
    val email: String,
    val password: String
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class SendMessageRequest(
    val receiverId: Int,
    val content: String
)

// ===== RÉPONSES =====

data class AuthResponse(
    val message: String,
    val token: String,
    val user: UserInfo
)

data class UserInfo(
    val id: Int,
    val email: String,
    val roles: List<String>
)

data class ErrorResponse(
    val error: String,
    val message: String
)

data class Message(
    val id: Int,
    val senderId: Int,
    val receiverId: Int,
    val content: String,
    val createdAt: String,
    val sender: UserBasic? = null,
    val receiver: UserBasic? = null
)

data class UserBasic(
    val id: Int,
    val email: String
)
```

### Étape 3 : Interface Retrofit

**Fichier :** `data/api/MessagingApi.kt`

```kotlin
package com.example.votreapp.data.api

import com.example.votreapp.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface MessagingApi {
    
    // Inscription
    @POST("register")
    suspend fun register(
        @Body request: RegisterRequest
    ): Response<AuthResponse>
    
    // Connexion
    @POST("login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<AuthResponse>
    
    // Profil utilisateur
    @GET("me")
    suspend fun getProfile(
        @Header("Authorization") token: String
    ): Response<UserInfo>
    
    // Historique messages
    @GET("messages")
    suspend fun getMessages(
        @Header("Authorization") token: String,
        @Query("userId") otherUserId: Int,
        @Query("limit") limit: Int = 50
    ): Response<List<Message>>
    
    // Envoyer un message
    @POST("messages")
    suspend fun sendMessage(
        @Header("Authorization") token: String,
        @Body request: SendMessageRequest
    ): Response<Message>
}
```

### Étape 4 : Configuration Retrofit

**Fichier :** `data/api/RetrofitClient.kt`

```kotlin
package com.example.votreapp.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    
    // ⚠️ CHANGEZ CETTE URL PAR VOTRE SERVEUR
    private const val BASE_URL = "http://192.168.1.50:3000/"
    
    // Intercepteur pour logger les requêtes (utile pour debug)
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    // Client HTTP
    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    // Instance Retrofit
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(httpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    // API
    val api: MessagingApi = retrofit.create(MessagingApi::class.java)
}
```

### Étape 5 : Repository

**Fichier :** `data/repository/AuthRepository.kt`

```kotlin
package com.example.votreapp.data.repository

import com.example.votreapp.data.api.RetrofitClient
import com.example.votreapp.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AuthRepository {
    
    private val api = RetrofitClient.api
    
    // Inscription
    suspend fun register(email: String, password: String): Result<AuthResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val request = RegisterRequest(email, password)
                val response = api.register(request)
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Erreur ${response.code()}: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    // Connexion
    suspend fun login(email: String, password: String): Result<AuthResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val request = LoginRequest(email, password)
                val response = api.login(request)
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Email ou mot de passe incorrect"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    // Récupérer profil
    suspend fun getProfile(token: String): Result<UserInfo> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.getProfile("Bearer $token")
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Token invalide"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}
```

### Étape 6 : Utilisation dans LoginScreen

**Exemple d'utilisation :**

```kotlin
import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.votreapp.data.repository.AuthRepository
import kotlinx.coroutines.launch

class LoginViewModel : ViewModel() {
    
    private val authRepository = AuthRepository()
    
    var isLoading by mutableStateOf(false)
        private set
    
    var errorMessage by mutableStateOf<String?>(null)
        private set
    
    fun login(email: String, password: String, onSuccess: (String, Int) -> Unit) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            
            val result = authRepository.login(email, password)
            
            result.onSuccess { authResponse ->
                // Sauvegarder le token (SharedPreferences ou DataStore)
                // Sauvegarder l'userId
                val token = authResponse.token
                val userId = authResponse.user.id
                
                onSuccess(token, userId)
            }
            
            result.onFailure { exception ->
                errorMessage = exception.message ?: "Erreur de connexion"
            }
            
            isLoading = false
        }
    }
}

@Composable
fun LoginScreen(
    onLoginSuccess: (String, Int) -> Unit,
    viewModel: LoginViewModel = viewModel()
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    
    Column {
        TextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") }
        )
        
        TextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation()
        )
        
        if (viewModel.errorMessage != null) {
            Text(
                text = viewModel.errorMessage!!,
                color = Color.Red
            )
        }
        
        Button(
            onClick = { viewModel.login(email, password, onLoginSuccess) },
            enabled = !viewModel.isLoading
        ) {
            if (viewModel.isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp))
            } else {
                Text("Se connecter")
            }
        }
    }
}
```

### Étape 7 : Utilisation dans RegistrationScreen

```kotlin
class RegistrationViewModel : ViewModel() {
    
    private val authRepository = AuthRepository()
    
    var isLoading by mutableStateOf(false)
        private set
    
    var errorMessage by mutableStateOf<String?>(null)
        private set
    
    fun register(email: String, password: String, onSuccess: (String, Int) -> Unit) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            
            val result = authRepository.register(email, password)
            
            result.onSuccess { authResponse ->
                val token = authResponse.token
                val userId = authResponse.user.id
                
                onSuccess(token, userId)
            }
            
            result.onFailure { exception ->
                errorMessage = exception.message ?: "Erreur lors de l'inscription"
            }
            
            isLoading = false
        }
    }
}
```

---

## 4️⃣ Gestion du Token JWT

### Sauvegarder le token (SharedPreferences)

**Fichier :** `utils/TokenManager.kt`

```kotlin
package com.example.votreapp.utils

import android.content.Context
import android.content.SharedPreferences

class TokenManager(context: Context) {
    
    private val prefs: SharedPreferences = 
        context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
    
    companion object {
        private const val KEY_TOKEN = "jwt_token"
        private const val KEY_USER_ID = "user_id"
    }
    
    fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }
    
    fun getToken(): String? {
        return prefs.getString(KEY_TOKEN, null)
    }
    
    fun saveUserId(userId: Int) {
        prefs.edit().putInt(KEY_USER_ID, userId).apply()
    }
    
    fun getUserId(): Int {
        return prefs.getInt(KEY_USER_ID, -1)
    }
    
    fun clearToken() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_USER_ID)
            .apply()
    }
    
    fun isLoggedIn(): Boolean {
        return getToken() != null
    }
}
```

**Utilisation :**

```kotlin
// Après login réussi
val tokenManager = TokenManager(context)
tokenManager.saveToken(authResponse.token)
tokenManager.saveUserId(authResponse.user.id)

// Pour les requêtes suivantes
val token = tokenManager.getToken()
val messages = api.getMessages("Bearer $token", userId = 2)
```

---

## 5️⃣ Permissions Android

**Fichier :** `AndroidManifest.xml`

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Permissions Internet -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:usesCleartextTraffic="true"
        ...>
        
    </application>
</manifest>
```

**⚠️ Important :** `android:usesCleartextTraffic="true"` est nécessaire pour HTTP (non-HTTPS). En production avec HTTPS, vous pouvez le retirer.

---

## 6️⃣ Résumé des étapes

✅ **1.** Ajouter les dépendances Retrofit dans `build.gradle`  
✅ **2.** Créer les data classes (RegisterRequest, LoginRequest, AuthResponse, etc.)  
✅ **3.** Créer l'interface `MessagingApi` avec les endpoints  
✅ **4.** Configurer RetrofitClient avec votre URL serveur  
✅ **5.** Créer un Repository pour gérer les appels API  
✅ **6.** Créer un ViewModel pour LoginScreen et RegistrationScreen  
✅ **7.** Mettre à jour les Composables pour utiliser le ViewModel  
✅ **8.** Créer TokenManager pour sauvegarder le JWT  
✅ **9.** Ajouter les permissions Internet dans AndroidManifest  

---

## 🧪 Tester l'intégration

### Test 1 : Inscription

```kotlin
// Dans votre app Android
viewModel.register("test@example.com", "password123") { token, userId ->
    println("Token: $token")
    println("User ID: $userId")
    // Naviguer vers l'écran suivant
}
```

### Test 2 : Connexion

```kotlin
viewModel.login("test@example.com", "password123") { token, userId ->
    tokenManager.saveToken(token)
    tokenManager.saveUserId(userId)
    // Naviguer vers HomeScreen
}
```

---

## 📞 Informations de contact API

**Base URL :** `http://votre-ip-proxmox:3000/`

**Endpoints disponibles :**
- `POST /register` - Inscription
- `POST /login` - Connexion
- `GET /me` - Profil (protégé)
- `GET /messages?userId=X` - Historique (protégé)
- `POST /messages` - Envoyer message (protégé)

**Authentification :** JWT Bearer Token dans le header `Authorization`

**Format des données :** JSON

**Token expiration :** 7 jours (configurable sur le serveur)

---

Avec ces informations, vous avez **TOUT** ce qu'il faut pour intégrer l'API dans votre application Android ! 🚀
