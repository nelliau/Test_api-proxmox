# 📱 Configuration Android - Guide d'Intégration

## 🎯 Vue d'ensemble

Ce guide explique comment configurer votre application Android Kotlin pour communiquer avec l'API de messagerie.

---

## 📋 Prérequis

- Android Studio (dernière version)
- Kotlin configuré
- Projet Android existant
- Accès à votre serveur API (voir `DEPLOYMENT-GUIDE.md`)

---

## 🔧 Étape 1 : Ajouter les dépendances

### Fichier : `app/build.gradle.kts`

```kotlin
dependencies {
    // Retrofit pour les appels API
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    
    // OkHttp pour le logging et les intercepteurs
    implementation("com.squareup.okhttp3:okhttp:4.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")
    
    // Coroutines (si pas déjà présent)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // ViewModel et LiveData
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")
    
    // Socket.IO pour la messagerie temps réel
    implementation("io.socket:socket.io-client:2.1.0")
}
```

**Synchronisez le projet après avoir ajouté ces dépendances.**

---

## 📦 Étape 2 : Créer les modèles de données

### Fichier : `data/models/ApiModels.kt`

```kotlin
package com.example.votreapp.data.models

import com.google.gson.annotations.SerializedName

// Requêtes
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

// Réponses
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

data class ErrorResponse(
    val error: String,
    val message: String
)
```

---

## 🌐 Étape 3 : Configurer Retrofit

### Fichier : `data/api/MessagingApi.kt`

```kotlin
package com.example.votreapp.data.api

import com.example.votreapp.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface MessagingApi {
    
    @POST("register")
    suspend fun register(
        @Body request: RegisterRequest
    ): Response<AuthResponse>
    
    @POST("login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<AuthResponse>
    
    @GET("me")
    suspend fun getProfile(
        @Header("Authorization") token: String
    ): Response<UserInfo>
    
    @GET("messages")
    suspend fun getMessages(
        @Header("Authorization") token: String,
        @Query("userId") otherUserId: Int,
        @Query("limit") limit: Int = 50
    ): Response<List<Message>>
    
    @POST("messages")
    suspend fun sendMessage(
        @Header("Authorization") token: String,
        @Body request: SendMessageRequest
    ): Response<Message>
}
```

### Fichier : `data/api/RetrofitClient.kt`

```kotlin
package com.example.votreapp.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    
    // ⚠️ REMPLACEZ PAR VOTRE URL SERVEUR
    // Format : "http://IP:PORT/" ou "https://domaine.com/"
    private const val BASE_URL = "http://VOTRE_SERVEUR:PORT/"
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(httpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val api: MessagingApi = retrofit.create(MessagingApi::class.java)
}
```

**⚠️ Configuration de l'URL :**
- Remplacez `VOTRE_SERVEUR:PORT` par votre configuration réelle
- Voir votre fichier `CONFIG-PRODUCTION.md` (local uniquement, pas sur GitHub)
- Exemple : `http://192.168.1.50:3000/` ou `http://185.182.169.30:30443/`

---

## 💾 Étape 4 : Gestion du Token JWT

### Fichier : `utils/TokenManager.kt`

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
        private const val KEY_USER_EMAIL = "user_email"
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
    
    fun saveUserEmail(email: String) {
        prefs.edit().putString(KEY_USER_EMAIL, email).apply()
    }
    
    fun getUserEmail(): String? {
        return prefs.getString(KEY_USER_EMAIL, null)
    }
    
    fun clearAll() {
        prefs.edit().clear().apply()
    }
    
    fun isLoggedIn(): Boolean {
        return getToken() != null
    }
}
```

---

## 🏗️ Étape 5 : Repository Pattern

### Fichier : `data/repository/AuthRepository.kt`

```kotlin
package com.example.votreapp.data.repository

import com.example.votreapp.data.api.RetrofitClient
import com.example.votreapp.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AuthRepository {
    
    private val api = RetrofitClient.api
    
    suspend fun register(email: String, password: String): Result<AuthResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.register(RegisterRequest(email, password))
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    val errorMessage = when (response.code()) {
                        400 -> "Données invalides"
                        409 -> "Cet email est déjà utilisé"
                        else -> "Erreur lors de l'inscription"
                    }
                    Result.failure(Exception(errorMessage))
                }
            } catch (e: Exception) {
                Result.failure(Exception("Erreur réseau: ${e.message}"))
            }
        }
    }
    
    suspend fun login(email: String, password: String): Result<AuthResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.login(LoginRequest(email, password))
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    val errorMessage = when (response.code()) {
                        401 -> "Email ou mot de passe incorrect"
                        else -> "Erreur lors de la connexion"
                    }
                    Result.failure(Exception(errorMessage))
                }
            } catch (e: Exception) {
                Result.failure(Exception("Erreur réseau: ${e.message}"))
            }
        }
    }
}
```

---

## 🎨 Étape 6 : ViewModels

### Fichier : `ui/login/LoginViewModel.kt`

```kotlin
package com.example.votreapp.ui.login

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
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
    
    fun login(
        email: String,
        password: String,
        onSuccess: (token: String, userId: Int, email: String) -> Unit
    ) {
        if (email.isBlank() || password.isBlank()) {
            errorMessage = "Veuillez remplir tous les champs"
            return
        }
        
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            
            val result = authRepository.login(email, password)
            
            result.onSuccess { authResponse ->
                onSuccess(
                    authResponse.token,
                    authResponse.user.id,
                    authResponse.user.email
                )
            }
            
            result.onFailure { exception ->
                errorMessage = exception.message
            }
            
            isLoading = false
        }
    }
    
    fun clearError() {
        errorMessage = null
    }
}
```

### Fichier : `ui/registration/RegistrationViewModel.kt`

```kotlin
package com.example.votreapp.ui.registration

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.votreapp.data.repository.AuthRepository
import kotlinx.coroutines.launch

class RegistrationViewModel : ViewModel() {
    
    private val authRepository = AuthRepository()
    
    var isLoading by mutableStateOf(false)
        private set
    
    var errorMessage by mutableStateOf<String?>(null)
        private set
    
    fun register(
        email: String,
        password: String,
        confirmPassword: String,
        onSuccess: (token: String, userId: Int, email: String) -> Unit
    ) {
        // Validation
        if (email.isBlank() || password.isBlank()) {
            errorMessage = "Veuillez remplir tous les champs"
            return
        }
        
        if (password != confirmPassword) {
            errorMessage = "Les mots de passe ne correspondent pas"
            return
        }
        
        if (password.length < 6) {
            errorMessage = "Le mot de passe doit contenir au moins 6 caractères"
            return
        }
        
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            
            val result = authRepository.register(email, password)
            
            result.onSuccess { authResponse ->
                onSuccess(
                    authResponse.token,
                    authResponse.user.id,
                    authResponse.user.email
                )
            }
            
            result.onFailure { exception ->
                errorMessage = exception.message
            }
            
            isLoading = false
        }
    }
}
```

---

## 🎭 Étape 7 : Écrans Compose (exemple)

### LoginScreen

```kotlin
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit,
    viewModel: LoginViewModel = viewModel(),
    context: Context = LocalContext.current
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val tokenManager = remember { TokenManager(context) }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text("Connexion", style = MaterialTheme.typography.h4)
        
        Spacer(modifier = Modifier.height(32.dp))
        
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Mot de passe") },
            modifier = Modifier.fillMaxWidth(),
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
        )
        
        if (viewModel.errorMessage != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = viewModel.errorMessage!!,
                color = MaterialTheme.colors.error,
                style = MaterialTheme.typography.body2
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(
            onClick = {
                viewModel.login(email, password) { token, userId, userEmail ->
                    tokenManager.saveToken(token)
                    tokenManager.saveUserId(userId)
                    tokenManager.saveUserEmail(userEmail)
                    onLoginSuccess()
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !viewModel.isLoading
        ) {
            if (viewModel.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Color.White
                )
            } else {
                Text("Se connecter")
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        TextButton(
            onClick = onNavigateToRegister,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Créer un compte")
        }
    }
}
```

---

## 📱 Étape 8 : Permissions AndroidManifest

### Fichier : `AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.votreapp">

    <!-- Permissions réseau -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:name=".MyApplication"
        android:allowBackup="true"
        android:usesCleartextTraffic="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.VotreApp">
        
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

**⚠️ Note :** `android:usesCleartextTraffic="true"` est nécessaire pour HTTP. En production avec HTTPS, vous pouvez le retirer.

---

## 🧪 Étape 9 : Tester l'intégration

### Test 1 : Inscription

1. Lancez votre application
2. Allez sur l'écran d'inscription
3. Entrez un email et un mot de passe (min 6 caractères)
4. Cliquez sur "S'inscrire"
5. Si succès : vous êtes redirigé et le token est sauvegardé

### Test 2 : Connexion

1. Allez sur l'écran de connexion
2. Entrez vos identifiants
3. Cliquez sur "Se connecter"
4. Si succès : vous êtes connecté

### Débogage

Activez les logs Logcat pour voir les requêtes Retrofit :
- Filtre : `okhttp` ou `Retrofit`
- Vous verrez les requêtes et réponses complètes

---

## 📊 Codes de réponse HTTP

| Code | Signification | Action dans l'app |
|------|---------------|-------------------|
| 200 | OK | Connexion réussie |
| 201 | Created | Inscription réussie |
| 400 | Bad Request | Afficher "Données invalides" |
| 401 | Unauthorized | Afficher "Identifiants incorrects" |
| 409 | Conflict | Afficher "Email déjà utilisé" |
| 500 | Server Error | Afficher "Erreur serveur" |

---

## 🔒 Sécurité

### Bonnes pratiques

1. **Ne jamais stocker le token en clair dans le code**
   - Utilisez SharedPreferences (comme TokenManager)
   - Ou mieux : EncryptedSharedPreferences pour chiffrer

2. **Toujours utiliser HTTPS en production**
   - HTTP uniquement pour les tests

3. **Gérer l'expiration du token**
   - Le token expire après 7 jours
   - Intercepter les 401 et demander une reconnexion

4. **Valider les entrées utilisateur**
   - Email valide
   - Mot de passe minimum 6 caractères

---

## 📚 Documentation complète

- **QUICK-API-REFERENCE.md** : Résumé rapide des endpoints
- **INTEGRATION-ANDROID.md** : Guide complet (tous les endpoints)
- **DEPLOYMENT-GUIDE.md** : Déploiement serveur
- **README.md** : Documentation complète de l'API

---

## 🆘 Problèmes courants

### "Unable to resolve host"
- Vérifiez l'URL dans `RetrofitClient`
- Vérifiez que le serveur est accessible
- Testez avec `curl` depuis un terminal

### "Network Security Configuration"
- Ajoutez `android:usesCleartextTraffic="true"` dans AndroidManifest

### "401 Unauthorized"
- Vérifiez que le token est bien sauvegardé
- Vérifiez le format : `Bearer TOKEN`
- Le token a peut-être expiré (reconnectez-vous)

### "Connect timeout"
- Augmentez le timeout dans RetrofitClient
- Vérifiez votre connexion réseau

---

Votre application Android est maintenant prête à communiquer avec l'API ! 🚀
