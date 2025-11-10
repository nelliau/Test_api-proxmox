# 📱 Guide Express - Intégration API dans Android

## 🎯 Ce dont vous avez besoin

### 1️⃣ URL de base pour Retrofit

```kotlin
private const val BASE_URL = "http://192.168.1.50:3000/"
```

**⚠️ Remplacez `192.168.1.50` par l'IP de votre serveur Proxmox**

---

### 2️⃣ Endpoint INSCRIPTION

**URL :** `http://votre-serveur:3000/register`  
**Méthode :** POST  
**Content-Type :** application/json

**Ce que vous envoyez :**
```json
{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```

**Ce que vous recevez (SUCCÈS) :**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "email": "user@example.com"
  }
}
```

**Code Kotlin :**
```kotlin
data class RegisterRequest(
    val email: String,
    val password: String
)

data class AuthResponse(
    val token: String,
    val user: UserInfo
)

data class UserInfo(
    val id: Int,
    val email: String
)

@POST("register")
suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>
```

---

### 3️⃣ Endpoint CONNEXION

**URL :** `http://votre-serveur:3000/login`  
**Méthode :** POST  
**Content-Type :** application/json

**Ce que vous envoyez :**
```json
{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```

**Ce que vous recevez (SUCCÈS) :**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "email": "user@example.com"
  }
}
```

**Code Kotlin :**
```kotlin
data class LoginRequest(
    val email: String,
    val password: String
)

@POST("login")
suspend fun login(@Body request: LoginRequest): Response<AuthResponse>
```

---

## 🚀 Code complet pour votre app Android

### Étape 1 : build.gradle.kts

```kotlin
dependencies {
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")
}
```

### Étape 2 : Data Classes

```kotlin
// Requêtes
data class RegisterRequest(val email: String, val password: String)
data class LoginRequest(val email: String, val password: String)

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
```

### Étape 3 : Interface API

```kotlin
interface MessagingApi {
    @POST("register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>
    
    @POST("login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>
}
```

### Étape 4 : RetrofitClient

```kotlin
object RetrofitClient {
    private const val BASE_URL = "http://192.168.1.50:3000/" // ⚠️ CHANGEZ ICI
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val api: MessagingApi = retrofit.create(MessagingApi::class.java)
}
```

### Étape 5 : Utilisation dans LoginScreen

```kotlin
class LoginViewModel : ViewModel() {
    private val api = RetrofitClient.api
    
    fun login(email: String, password: String, onSuccess: (String, Int) -> Unit) {
        viewModelScope.launch {
            try {
                val response = api.login(LoginRequest(email, password))
                
                if (response.isSuccessful && response.body() != null) {
                    val token = response.body()!!.token
                    val userId = response.body()!!.user.id
                    
                    // Sauvegarder le token
                    onSuccess(token, userId)
                } else {
                    // Afficher erreur
                    println("Erreur: ${response.code()}")
                }
            } catch (e: Exception) {
                println("Erreur réseau: ${e.message}")
            }
        }
    }
}
```

### Étape 6 : Utilisation dans RegistrationScreen

```kotlin
class RegistrationViewModel : ViewModel() {
    private val api = RetrofitClient.api
    
    fun register(email: String, password: String, onSuccess: (String, Int) -> Unit) {
        viewModelScope.launch {
            try {
                val response = api.register(RegisterRequest(email, password))
                
                if (response.isSuccessful && response.body() != null) {
                    val token = response.body()!!.token
                    val userId = response.body()!!.user.id
                    
                    onSuccess(token, userId)
                } else {
                    println("Erreur: ${response.code()}")
                }
            } catch (e: Exception) {
                println("Erreur: ${e.message}")
            }
        }
    }
}
```

### Étape 7 : AndroidManifest.xml

```xml
<manifest>
    <uses-permission android:name="android.permission.INTERNET" />
    
    <application
        android:usesCleartextTraffic="true"
        ...>
    </application>
</manifest>
```

---

## 📊 Codes de réponse HTTP

| Code | Signification | Action |
|------|---------------|--------|
| **200** | OK | Connexion réussie |
| **201** | Created | Inscription réussie |
| **400** | Bad Request | Données invalides (email/password manquant) |
| **401** | Unauthorized | Email ou mot de passe incorrect |
| **409** | Conflict | Email déjà utilisé |
| **500** | Server Error | Erreur serveur |

---

## ✅ Checklist d'intégration

- [ ] Ajouter les dépendances Retrofit dans `build.gradle`
- [ ] Créer les data classes (`RegisterRequest`, `LoginRequest`, `AuthResponse`, `UserInfo`)
- [ ] Créer l'interface `MessagingApi` avec les endpoints
- [ ] Créer `RetrofitClient` avec votre URL serveur
- [ ] Modifier `LoginViewModel` pour appeler l'API
- [ ] Modifier `RegistrationViewModel` pour appeler l'API
- [ ] Ajouter permission INTERNET dans `AndroidManifest.xml`
- [ ] Tester !

---

## 🧪 Test rapide

1. Démarrez votre serveur Node.js : `npm start`
2. Vérifiez qu'il est accessible : `curl http://192.168.1.50:3000/`
3. Lancez votre app Android
4. Essayez de créer un compte
5. Essayez de vous connecter

---

**Besoin de plus de détails ?** Consultez `INTEGRATION-ANDROID.md` pour le guide complet ! 🚀
