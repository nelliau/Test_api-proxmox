# 📱 Guide d'Intégration Android - Système d'Amis

## 🎯 Endpoints Disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/users/search?q=text` | GET | Rechercher des utilisateurs |
| `/users/:id` | GET | Obtenir un utilisateur par ID |
| `/friends/request` | POST | Envoyer une demande d'ami |
| `/friends/requests` | GET | Voir les demandes reçues |
| `/friends/request/:id` | PUT | Accepter/Refuser une demande |
| `/friends` | GET | Liste des amis |
| `/friends/:id` | DELETE | Supprimer un ami |

---

## 📦 Dépendances Gradle

```gradle
dependencies {
    // Retrofit
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    
    // OkHttp (logging)
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    
    // ViewModel & LiveData
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2'
    implementation 'androidx.lifecycle:lifecycle-livedata-ktx:2.6.2'
}
```

---

## 🔧 1. DATA CLASSES

```kotlin
// models/UserModels.kt
package com.example.yourapp.models

import com.google.gson.annotations.SerializedName

// ========== USER SEARCH ==========

data class UserSearchResponse(
    @SerializedName("users")
    val users: List<UserInfo>
)

data class UserInfo(
    @SerializedName("id")
    val id: Int,
    @SerializedName("email")
    val email: String
)

data class UserProfileResponse(
    @SerializedName("id")
    val id: Int,
    @SerializedName("email")
    val email: String,
    @SerializedName("roles")
    val roles: List<String>
)

// ========== FRIENDS ==========

data class FriendRequestBody(
    @SerializedName("receiverId")
    val receiverId: Int? = null,  // Optionnel si receiverEmail est fourni
    
    @SerializedName("receiverEmail")
    val receiverEmail: String? = null  // Optionnel si receiverId est fourni
    
    // ⚠️ Au moins un des deux doit être fourni !
)

data class FriendActionBody(
    @SerializedName("action")
    val action: String  // "accept" ou "reject"
)

data class FriendRequestResponse(
    @SerializedName("message")
    val message: String,
    @SerializedName("request")
    val request: FriendRequest
)

data class FriendRequest(
    @SerializedName("id")
    val id: Int,
    @SerializedName("senderId")
    val senderId: Int,
    @SerializedName("receiverId")
    val receiverId: Int,
    @SerializedName("status")
    val status: String,
    @SerializedName("createdAt")
    val createdAt: String
)

data class FriendRequestsResponse(
    @SerializedName("requests")
    val requests: List<ReceivedFriendRequest>
)

data class ReceivedFriendRequest(
    @SerializedName("id")
    val id: Int,
    @SerializedName("sender")
    val sender: UserInfo,
    @SerializedName("status")
    val status: String,
    @SerializedName("createdAt")
    val createdAt: String
)

data class FriendsListResponse(
    @SerializedName("friends")
    val friends: List<Friendship>
)

data class Friendship(
    @SerializedName("friendshipId")
    val friendshipId: Int,
    @SerializedName("friend")
    val friend: UserInfo,
    @SerializedName("since")
    val since: String
)

data class MessageResponse(
    @SerializedName("message")
    val message: String
)
```

---

## 🌐 2. INTERFACE RETROFIT

```kotlin
// api/MessagingApi.kt
package com.example.yourapp.api

import com.example.yourapp.models.*
import retrofit2.Response
import retrofit2.http.*

interface MessagingApi {
    
    // ========== USER SEARCH ==========
    
    @GET("users/search")
    suspend fun searchUsers(
        @Header("Authorization") token: String,
        @Query("q") query: String,
        @Query("limit") limit: Int = 20
    ): Response<UserSearchResponse>
    
    @GET("users/{id}")
    suspend fun getUserById(
        @Header("Authorization") token: String,
        @Path("id") userId: Int
    ): Response<UserProfileResponse>
    
    // ========== FRIENDS ==========
    
    @POST("friends/request")
    suspend fun sendFriendRequest(
        @Header("Authorization") token: String,
        @Body request: FriendRequestBody
    ): Response<FriendRequestResponse>
    
    @GET("friends/requests")
    suspend fun getFriendRequests(
        @Header("Authorization") token: String
    ): Response<FriendRequestsResponse>
    
    @PUT("friends/request/{id}")
    suspend fun respondToFriendRequest(
        @Path("id") requestId: Int,
        @Header("Authorization") token: String,
        @Body action: FriendActionBody
    ): Response<MessageResponse>
    
    @GET("friends")
    suspend fun getFriends(
        @Header("Authorization") token: String
    ): Response<FriendsListResponse>
    
    @DELETE("friends/{id}")
    suspend fun removeFriend(
        @Path("id") friendshipId: Int,
        @Header("Authorization") token: String
    ): Response<MessageResponse>
}
```

---

## 🏗️ 3. RETROFIT CLIENT

```kotlin
// network/RetrofitClient.kt
package com.example.yourapp.network

import com.google.gson.GsonBuilder
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    
    // ⚠️ REMPLACER PAR VOTRE IP PROXMOX
    private const val BASE_URL = "http://192.168.104.2:30443/"
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val gson = GsonBuilder()
        .setLenient()
        .create()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create(gson))
        .build()
    
    val api: MessagingApi = retrofit.create(MessagingApi::class.java)
}
```

---

## 📂 4. REPOSITORY

```kotlin
// repository/UserRepository.kt
package com.example.yourapp.repository

import com.example.yourapp.api.MessagingApi
import com.example.yourapp.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class UserRepository(private val api: MessagingApi) {
    
    // Rechercher des utilisateurs
    suspend fun searchUsers(token: String, query: String): Result<List<UserInfo>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.searchUsers(
                    token = "Bearer $token",
                    query = query,
                    limit = 50
                )
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!.users)
                } else {
                    val errorMsg = "Erreur ${response.code()}: ${response.message()}"
                    Result.failure(Exception(errorMsg))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    // Obtenir un utilisateur par ID
    suspend fun getUserById(token: String, userId: Int): Result<UserProfileResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.getUserById("Bearer $token", userId)
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Erreur ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    // Envoyer une demande d'ami par ID
    suspend fun sendFriendRequest(token: String, receiverId: Int): Result<FriendRequestResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.sendFriendRequest(
                    token = "Bearer $token",
                    request = FriendRequestBody(receiverId = receiverId)
                )
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    // Lire le message d'erreur du serveur
                    val errorBody = response.errorBody()?.string()
                    Result.failure(Exception("Erreur ${response.code()}: $errorBody"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    // Envoyer une demande d'ami par EMAIL
    suspend fun sendFriendRequestByEmail(token: String, receiverEmail: String): Result<FriendRequestResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.sendFriendRequest(
                    token = "Bearer $token",
                    request = FriendRequestBody(receiverEmail = receiverEmail)
                )
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    // Lire le message d'erreur du serveur
                    val errorBody = response.errorBody()?.string()
                    Result.failure(Exception("Erreur ${response.code()}: $errorBody"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    // Récupérer les demandes reçues
    suspend fun getFriendRequests(token: String): Result<List<ReceivedFriendRequest>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.getFriendRequests("Bearer $token")
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!.requests)
                } else {
                    Result.failure(Exception("Erreur ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    // Accepter une demande
    suspend fun acceptFriendRequest(token: String, requestId: Int): Result<MessageResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.respondToFriendRequest(
                    requestId = requestId,
                    token = "Bearer $token",
                    action = FriendActionBody(action = "accept")
                )
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Erreur ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    // Refuser une demande
    suspend fun rejectFriendRequest(token: String, requestId: Int): Result<MessageResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.respondToFriendRequest(
                    requestId = requestId,
                    token = "Bearer $token",
                    action = FriendActionBody(action = "reject")
                )
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Erreur ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    // Liste des amis
    suspend fun getFriends(token: String): Result<List<Friendship>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.getFriends("Bearer $token")
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!.friends)
                } else {
                    Result.failure(Exception("Erreur ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    // Supprimer un ami
    suspend fun removeFriend(token: String, friendshipId: Int): Result<MessageResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.removeFriend(
                    friendshipId = friendshipId,
                    token = "Bearer $token"
                )
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Erreur ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}
```

---

## 🎨 5. EXEMPLE D'ACTIVITY

```kotlin
// ui/SearchUsersActivity.kt
package com.example.yourapp.ui

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.yourapp.databinding.ActivitySearchUsersBinding
import com.example.yourapp.network.RetrofitClient
import com.example.yourapp.repository.UserRepository
import kotlinx.coroutines.launch

class SearchUsersActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivitySearchUsersBinding
    private lateinit var repository: UserRepository
    private var authToken: String = ""
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySearchUsersBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Initialiser
        repository = UserRepository(RetrofitClient.api)
        authToken = getSharedPreferences("auth", MODE_PRIVATE)
            .getString("token", "") ?: ""
        
        // Setup RecyclerView
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        
        // Bouton de recherche
        binding.btnSearch.setOnClickListener {
            val query = binding.etSearch.text.toString()
            if (query.isNotEmpty()) {
                searchUsers(query)
            }
        }
    }
    
    private fun searchUsers(query: String) {
        lifecycleScope.launch {
            binding.progressBar.visibility = View.VISIBLE
            
            val result = repository.searchUsers(authToken, query)
            
            binding.progressBar.visibility = View.GONE
            
            result.onSuccess { users ->
                if (users.isEmpty()) {
                    Toast.makeText(this@SearchUsersActivity, "Aucun utilisateur trouvé", Toast.LENGTH_SHORT).show()
                } else {
                    // Afficher dans le RecyclerView
                    val adapter = UserSearchAdapter(users) { user ->
                        // Callback quand on clique sur un utilisateur
                        sendFriendRequest(user.id)
                    }
                    binding.recyclerView.adapter = adapter
                }
            }
            
            result.onFailure { error ->
                Toast.makeText(
                    this@SearchUsersActivity,
                    "Erreur: ${error.message}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }
    
    private fun sendFriendRequest(receiverId: Int) {
        lifecycleScope.launch {
            val result = repository.sendFriendRequest(authToken, receiverId)
            
            result.onSuccess { response ->
                Toast.makeText(
                    this@SearchUsersActivity,
                    response.message,
                    Toast.LENGTH_SHORT
                ).show()
            }
            
            result.onFailure { error ->
                Toast.makeText(
                    this@SearchUsersActivity,
                    "Erreur: ${error.message}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }
}
```

---

## ✅ CHECKLIST

- [ ] Dépendances Gradle ajoutées
- [ ] Permission INTERNET dans AndroidManifest.xml
- [ ] `usesCleartextTraffic="true"` dans manifest (pour HTTP)
- [ ] BASE_URL configurée avec l'IP Proxmox
- [ ] Token JWT sauvegardé après login
- [ ] HttpLoggingInterceptor activé pour debug
- [ ] `receiverId` envoyé en **Int**, pas String
- [ ] Header `Authorization: Bearer TOKEN`

---

## 🔍 DEBUG

### Voir les requêtes dans Logcat

```
D/OkHttp: --> GET http://192.168.104.2:30443/users/search?q=alice
D/OkHttp: Authorization: Bearer eyJ...
D/OkHttp: <-- 200 http://192.168.104.2:30443/users/search?q=alice
D/OkHttp: {"users":[{"id":2,"email":"alice@test.com"}]}
```

### Erreurs communes

| Erreur | Solution |
|--------|----------|
| `Cannot GET /users/search` | Mettre à jour server.js sur Proxmox |
| `receiverId requis` | Envoyer un Int, pas String |
| `Unauthorized` | Vérifier le token JWT |
| `Network error` | Vérifier l'IP et le port |

---

## 🚀 DÉPLOYER SUR PROXMOX

```bash
cd /root/Test_api-proxmox
git pull origin cursor/backend-chat-server-setup-with-authentication-1ef0
systemctl restart test-api
journalctl -u test-api -n 50 -f
```

---

**✅ Votre app Android peut maintenant rechercher et ajouter des amis ! 🎉**
