import http from 'http';
import https from 'https';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

// ============================================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================================
dotenv.config();

// ============================================================================
// VALIDATE CRITICAL ENVIRONMENT VARIABLES
// ============================================================================
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ ERREUR CRITIQUE: JWT_SECRET doit être défini et faire au moins 32 caractères');
  console.error('💡 Générez-en un avec: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

// ============================================================================
// ENVIRONMENT VARIABLES WITH SAFE DEFAULTS
// ============================================================================
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const NODE_ENV = process.env.NODE_ENV || 'development';

// SSL/TLS Configuration
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_CA_PATH = process.env.SSL_CA_PATH; // Optional: for certificate chain

// Parse allowed origins (update to include HTTPS if using SSL)
const defaultOrigins = process.env.SSL_CERT_PATH 
  ? ['https://localhost:3000', 'http://localhost:3000']
  : ['http://localhost:3000'];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || defaultOrigins;

console.log('🔧 Configuration:');
console.log(`   - Environment: ${NODE_ENV}`);
console.log(`   - Port: ${PORT}`);
console.log(`   - Allowed Origins: ${ALLOWED_ORIGINS.join(', ')}`);
console.log(`   - JWT Secret: ${'*'.repeat(JWT_SECRET.length)} (${JWT_SECRET.length} chars)`);

// ============================================================================
// EXPRESS SETUP
// ============================================================================
const app = express();

// Trust proxy (important si derrière un reverse proxy plus tard)
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 0);

// ============================================================================
// SECURITY MIDDLEWARES
// ============================================================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression({
  level: 6,
  threshold: 1024, // Compress only if > 1KB
}));

// Body parsers with size limits
app.use(express.json({ limit: '10kb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400, // Cache preflight 24h
}));

// ============================================================================
// RATE LIMITING
// ============================================================================

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: { 
    error: 'too_many_requests', 
    message: 'Trop de requêtes, réessayez plus tard' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'too_many_requests',
      message: 'Trop de requêtes, réessayez plus tard',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true, // Don't count successful logins
  message: { 
    error: 'too_many_requests', 
    message: 'Trop de tentatives de connexion, réessayez dans 15 minutes' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️  Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'too_many_requests',
      message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// ============================================================================
// DATABASE - SEQUELIZE WITH OPTIMIZED POOL
// ============================================================================

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: NODE_ENV === 'development' ? console.log : false,
  
  // Connection pool configuration
  pool: {
    max: 20,          // Maximum connections
    min: 5,           // Minimum connections
    acquire: 30000,   // Max time (ms) to get connection
    idle: 10000,      // Max time (ms) connection can be idle
  },
  
  // Model defaults
  define: {
    freezeTableName: true,
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  
  // Retry on connection errors
  retry: {
    max: 3,
  },
  
  dialectOptions: {
    connectTimeout: 10000,
  }
});

// ============================================================================
// DATABASE MODELS
// ============================================================================

// User model
const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(180),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        len: [5, 180],
      }
    },
    roles: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      defaultValue: '["ROLE_USER"]',
      get() {
        const rawValue = this.getDataValue('roles');
        return rawValue ? JSON.parse(rawValue) : ['ROLE_USER'];
      },
      set(value) {
        this.setDataValue('roles', JSON.stringify(value));
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    publicKey: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'public_key',
    },
  },
  {
    tableName: 'user',
    timestamps: false,
  }
);

// Message model
const Message = sequelize.define(
  'Message',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sender_id',
    },
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'receiver_id',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'message',
    timestamps: false,
  }
);

// FriendRequest model
const FriendRequest = sequelize.define(
  'FriendRequest',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sender_id',
    },
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'receiver_id',
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'declined'),
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
    tableName: 'friends',
    timestamps: false,
  }
);

// ============================================================================
// MODEL ASSOCIATIONS
// ============================================================================

Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

FriendRequest.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
FriendRequest.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Email validation
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length >= 5 && email.length <= 180;
}

// Escape LIKE wildcards to prevent SQL injection
function escapeLike(str) {
  return str.replace(/[%_\\]/g, '\\$&');
}

// Mask email for logs (GDPR compliance)
function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'null';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  return `${local.substring(0, 2)}***@${domain}`;
}

// Password validation
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return 'Mot de passe requis';
  }
  if (password.length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caractères';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une majuscule';
  }
  if (!/[a-z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une minuscule';
  }
  if (!/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre';
  }
  return null; // Valid
}

// Async error handler wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'unauthorized', 
      message: 'Token manquant ou invalide' 
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email, roles }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'token_expired', 
        message: 'Token expiré, veuillez vous reconnecter' 
      });
    }
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({ 
      error: 'unauthorized', 
      message: 'Token invalide' 
    });
  }
};

// ============================================================================
// HTTP/HTTPS SERVER AND SOCKET.IO
// ============================================================================

// Create HTTPS server if SSL certificates are provided, otherwise HTTP
let httpServer;
if (SSL_KEY_PATH && SSL_CERT_PATH && fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
  const options = {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH)
  };

  // Add CA certificate if provided (for certificate chain)
  if (SSL_CA_PATH && fs.existsSync(SSL_CA_PATH)) {
    options.ca = fs.readFileSync(SSL_CA_PATH);
  }

  httpServer = https.createServer(options, app);
  console.log('🔒 HTTPS server configured');
  console.log(`   - SSL Key: ${SSL_KEY_PATH}`);
  console.log(`   - SSL Cert: ${SSL_CERT_PATH}`);
  if (SSL_CA_PATH) {
    console.log(`   - SSL CA: ${SSL_CA_PATH}`);
  }
} else {
  httpServer = http.createServer(app);
  console.log('⚠️  HTTP server configured (no SSL certificates found)');
  if (NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: Running in production without HTTPS is not recommended!');
  }
}

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Store connected users: { userId: socketId }
const connectedUsers = new Map();

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

// Health check
app.get('/', (_req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Realtime Messaging API',
    version: '1.0.0',
    environment: NODE_ENV
  });
});

// Health check for monitoring
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Register new user
app.post('/register', authLimiter, asyncHandler(async (req, res) => {
  console.log('📝 POST /register');
  const { email, password, publicKey } = req.body || {};

  // Validation - Email
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'Email invalide' 
    });
  }

  // Validation - Password
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: passwordError 
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ 
      error: 'conflict', 
      message: 'Cet email est déjà utilisé' 
    });
  }

  // Hash password (compatible with Symfony bcrypt)
  const hashedPassword = await bcrypt.hash(password, 13);

  // Create user
  const user = await User.create({
    email,
    password: hashedPassword,
    roles: ['ROLE_USER'],
    publicKey: publicKey || null,
  });

  console.log(`✅ Utilisateur créé - ID: ${user.id}, Email: ${maskEmail(user.email)}`);

  // Generate JWT
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roles: user.roles,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.status(201).json({
    message: 'Utilisateur créé avec succès',
    token,
    user: {
      id: user.id,
      email: user.email,
      roles: user.roles,
      publicKey: user.publicKey,
    },
  });
}));

// Login
app.post('/login', authLimiter, asyncHandler(async (req, res) => {
  console.log('🔐 POST /login');
  const { email, password } = req.body || {};

  // Validation
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'Email invalide' 
    });
  }

  if (!password) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'Mot de passe requis' 
    });
  }

  // Find user
  const user = await User.findOne({ where: { email } });
  
  // Always run bcrypt.compare even if user not found (prevent timing attack)
  const dummyHash = '$2a$13$abcdefghijklmnopqrstuv1234567890123456789012345';
  const passwordHash = user?.password || dummyHash;
  const isPasswordValid = await bcrypt.compare(password, passwordHash);

  if (!user || !isPasswordValid) {
    return res.status(401).json({ 
      error: 'unauthorized', 
      message: 'Email ou mot de passe incorrect' 
    });
  }

  console.log(`✅ Connexion réussie - ID: ${user.id}, Email: ${maskEmail(user.email)}`);

  // Generate JWT
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roles: user.roles,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    message: 'Connexion réussie',
    token,
    user: {
      id: user.id,
      email: user.email,
      roles: user.roles,
      publicKey: user.publicKey,
    },
  });
}));

// ============================================================================
// PROTECTED ENDPOINTS (require JWT authentication)
// ============================================================================

// Get current user info
app.get('/me', authenticateJWT, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.userId, {
    attributes: ['id', 'email', 'roles', 'publicKey'],
  });

  if (!user) {
    return res.status(404).json({ 
      error: 'not_found', 
      message: 'Utilisateur introuvable' 
    });
  }

  res.json({
    id: user.id,
    email: user.email,
    roles: user.roles,
    publicKey: user.publicKey,
  });
}));

// Get conversation history between two users
// GET /messages?userId=2&limit=50
app.get('/messages', authenticateJWT, asyncHandler(async (req, res) => {
  const currentUserId = req.user.userId;
  const otherUserId = req.query.userId ? Number(req.query.userId) : null;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  if (!otherUserId || isNaN(otherUserId)) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'userId requis en query parameter' 
    });
  }

  // Get messages between current user and other user (both directions)
  const messages = await Message.findAll({
    where: {
      [Sequelize.Op.or]: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    },
    order: [['createdAt', 'ASC']],
    limit,
    include: [
      { model: User, as: 'sender', attributes: ['id', 'email'] },
      { model: User, as: 'receiver', attributes: ['id', 'email'] },
    ],
  });

  res.json(messages);
}));

// Send a message (REST endpoint)
app.post('/messages', authenticateJWT, asyncHandler(async (req, res) => {
  const senderId = req.user.userId;
  const { receiverId, content } = req.body || {};

  // Validation
  if (!receiverId || isNaN(Number(receiverId))) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'receiverId requis (number)' 
    });
  }

  if (!content || typeof content !== 'string' || content.length === 0) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'Le contenu ne peut pas être vide' 
    });
  }

  if (content.length > 10000) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'Le contenu ne peut pas dépasser 10000 caractères' 
    });
  }

  // Check if receiver exists
  const receiver = await User.findByPk(receiverId);
  if (!receiver) {
    return res.status(404).json({ 
      error: 'not_found', 
      message: 'Destinataire introuvable' 
    });
  }

  // Save message to database (content is encrypted, don't modify it)
  const message = await Message.create({
    senderId,
    receiverId: Number(receiverId),
    content: content, // Don't trim - may be encrypted
  });

  res.status(201).json({
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    content: message.content,
    createdAt: message.createdAt,
  });
}));

// ============================================================================
// USER SEARCH ENDPOINT
// ============================================================================

// Search users by email (for finding friends)
app.get('/users/search', authenticateJWT, asyncHandler(async (req, res) => {
  const currentUserId = req.user.userId;
  const { q, email, limit } = req.query;

  // Validation
  const searchQuery = q || email;
  if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length === 0) {
    return res.status(400).json({
      error: 'bad_request',
      message: 'Paramètre "q" ou "email" requis pour la recherche'
    });
  }

  if (searchQuery.trim().length < 2) {
    return res.status(400).json({
      error: 'bad_request',
      message: 'La recherche doit contenir au moins 2 caractères'
    });
  }

  const searchLimit = limit ? Math.min(parseInt(limit), 50) : 20;

  // Escape LIKE wildcards to prevent SQL injection
  const sanitizedQuery = escapeLike(searchQuery.trim());

  // Search users by email (partial match)
  const users = await User.findAll({
    where: {
      email: {
        [Sequelize.Op.like]: `%${sanitizedQuery}%`
      },
      id: {
        [Sequelize.Op.ne]: currentUserId  // Exclude current user
      }
    },
    attributes: ['id', 'email', 'roles', 'publicKey'],
    limit: searchLimit
  });

  res.json({
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      roles: u.roles || [],
      publicKey: u.publicKey
    }))
  });
}));

// Get user by ID (for profile view)
app.get('/users/:id', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'ID utilisateur invalide' 
    });
  }

  const user = await User.findByPk(userId, {
    attributes: ['id', 'email', 'roles', 'publicKey']
  });

  if (!user) {
    return res.status(404).json({ 
      error: 'not_found', 
      message: 'Utilisateur introuvable' 
    });
  }

  res.json({
    id: user.id,
    email: user.email,
    roles: user.roles,
    publicKey: user.publicKey
  });
}));

// Update user's public key
app.put('/users/public-key', authenticateJWT, asyncHandler(async (req, res) => {
  const { publicKey } = req.body || {};

  if (!publicKey || typeof publicKey !== 'string') {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'Clé publique requise' 
    });
  }

  if (publicKey.length > 10000) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'Clé publique trop longue' 
    });
  }

  const user = await User.findByPk(req.user.userId);
  if (!user) {
    return res.status(404).json({ 
      error: 'not_found', 
      message: 'Utilisateur introuvable' 
    });
  }

  user.publicKey = publicKey;
  await user.save();

  res.json({
    message: 'Clé publique mise à jour avec succès',
    publicKey: user.publicKey
  });
}));

// Get public key of a user
app.get('/users/:id/public-key', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'ID utilisateur invalide' 
    });
  }

  const user = await User.findByPk(userId, {
    attributes: ['id', 'email', 'publicKey']
  });

  if (!user) {
    return res.status(404).json({ 
      error: 'not_found', 
      message: 'Utilisateur introuvable' 
    });
  }

  if (!user.publicKey) {
    return res.status(404).json({ 
      error: 'not_found', 
      message: 'Clé publique non disponible' 
    });
  }

  res.json({
    userId: user.id,
    email: user.email,
    publicKey: user.publicKey
  });
}));

// ============================================================================
// FRIENDS SYSTEM ENDPOINTS
// ============================================================================

// Send a friend request
app.post('/friends/request', authenticateJWT, asyncHandler(async (req, res) => {
  const senderId = req.user.userId;
  const { receiverId, receiverEmail } = req.body || {};

  // Validation - accept either receiverId or receiverEmail
  if (!receiverId && !receiverEmail) {
    return res.status(400).json({
      error: 'bad_request',
      message: 'receiverId ou receiverEmail requis'
    });
  }

  // Find receiver by ID or email
  let receiver;
  if (receiverId) {
    if (typeof receiverId !== 'number' || isNaN(receiverId)) {
      return res.status(400).json({ 
        error: 'bad_request', 
        message: 'receiverId doit être un nombre' 
      });
    }
    receiver = await User.findByPk(receiverId);
  } else {
    // Find by email
    if (!isValidEmail(receiverEmail)) {
      return res.status(400).json({ 
        error: 'bad_request', 
        message: 'receiverEmail invalide' 
      });
    }
    receiver = await User.findOne({ where: { email: receiverEmail.trim() } });
  }

  // Check if receiver exists
  if (!receiver) {
    return res.status(404).json({ 
      error: 'not_found', 
      message: 'Utilisateur introuvable' 
    });
  }

  const actualReceiverId = receiver.id;

  // Cannot send request to yourself
  if (senderId === actualReceiverId) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'Vous ne pouvez pas vous ajouter vous-même' 
    });
  }

  // Check if friend request already exists (in either direction)
  const existingRequest = await FriendRequest.findOne({
    where: {
      [Sequelize.Op.or]: [
        { senderId, receiverId: actualReceiverId },
        { senderId: actualReceiverId, receiverId: senderId }
      ]
    }
  });

  if (existingRequest) {
    if (existingRequest.status === 'accepted') {
      return res.status(409).json({ 
        error: 'conflict', 
        message: 'Vous êtes déjà amis' 
      });
    }
    if (existingRequest.status === 'pending') {
      return res.status(409).json({ 
        error: 'conflict', 
        message: 'Demande déjà envoyée' 
      });
    }
  }

  // Create friend request
  const friendRequest = await FriendRequest.create({
    senderId,
    receiverId: actualReceiverId,
    status: 'pending'
  });

  // Get sender info for notification
  const sender = await User.findByPk(senderId, {
    attributes: ['id', 'email']
  });

  // Emit real-time notification to receiver via Socket.IO
  io.to(`user_${actualReceiverId}`).emit('friend_request', {
    id: friendRequest.id,
    sender: {
      id: sender.id,
      email: sender.email
    },
    status: friendRequest.status,
    createdAt: friendRequest.createdAt
  });

  res.status(201).json({
    message: 'Demande d\'ami envoyée',
    request: {
      id: friendRequest.id,
      senderId: friendRequest.senderId,
      receiverId: friendRequest.receiverId,
      status: friendRequest.status,
      createdAt: friendRequest.createdAt
    }
  });
}));

// Get pending friend requests (received)
app.get('/friends/requests', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const requests = await FriendRequest.findAll({
    where: {
      receiverId: userId,
      status: 'pending'
    },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'email']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json({
    requests: requests.map(req => ({
      id: req.id,
      sender: {
        id: req.sender.id,
        email: req.sender.email
      },
      status: req.status,
      createdAt: req.createdAt
    }))
  });
}));

// Accept or reject a friend request
app.put('/friends/request/:id', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const requestId = parseInt(req.params.id);
  const { action } = req.body || {}; // 'accept' or 'decline'

  // Validation
  if (isNaN(requestId)) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'ID de demande invalide' 
    });
  }

  if (!action || !['accept', 'decline'].includes(action)) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'action doit être "accept" ou "decline"' 
    });
  }

  // Find the friend request
  const friendRequest = await FriendRequest.findByPk(requestId);

  if (!friendRequest) {
    return res.status(404).json({ 
      error: 'not_found', 
      message: 'Demande introuvable' 
    });
  }

  // Check if current user is the receiver
  if (friendRequest.receiverId !== userId) {
    return res.status(403).json({ 
      error: 'forbidden', 
      message: 'Vous ne pouvez pas modifier cette demande' 
    });
  }

  // Check if already processed
  if (friendRequest.status !== 'pending') {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'Cette demande a déjà été traitée' 
    });
  }

  // Update status
  const newStatus = action === 'accept' ? 'accepted' : 'declined';
  await friendRequest.update({ status: newStatus });

  // Get receiver info for notification
  const receiver = await User.findByPk(userId, {
    attributes: ['id', 'email']
  });

  // Emit real-time notification to sender (person who sent the request)
  io.to(`user_${friendRequest.senderId}`).emit('friend_request_response', {
    requestId: friendRequest.id,
    status: newStatus,
    responder: {
      id: receiver.id,
      email: receiver.email
    },
    updatedAt: new Date()
  });

  res.json({
    message: action === 'accept' ? 'Demande acceptée' : 'Demande refusée',
    request: {
      id: friendRequest.id,
      status: newStatus
    }
  });
}));

// Get list of friends (accepted requests)
app.get('/friends', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Get all accepted friend requests where user is either sender or receiver
  const friendRequests = await FriendRequest.findAll({
    where: {
      [Sequelize.Op.or]: [
        { senderId: userId },
        { receiverId: userId }
      ],
      status: 'accepted'
    },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'email']
      },
      {
        model: User,
        as: 'receiver',
        attributes: ['id', 'email']
      }
    ],
    order: [['updatedAt', 'DESC']]
  });

  // Map to get the friend (the other user)
  const friends = friendRequests.map(req => {
    const friend = req.senderId === userId ? req.receiver : req.sender;
    return {
      friendshipId: req.id,
      friend: {
        id: friend.id,
        email: friend.email
      },
      since: req.updatedAt
    };
  });

  res.json({ friends });
}));

// Remove a friend (delete friendship)
app.delete('/friends/:id', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const friendshipId = parseInt(req.params.id);

  if (isNaN(friendshipId)) {
    return res.status(400).json({ 
      error: 'bad_request', 
      message: 'ID d\'amitié invalide' 
    });
  }

  // Find the friend request
  const friendRequest = await FriendRequest.findByPk(friendshipId);

  if (!friendRequest) {
    return res.status(404).json({ 
      error: 'not_found', 
      message: 'Amitié introuvable' 
    });
  }

  // Check if user is part of this friendship
  if (friendRequest.senderId !== userId && friendRequest.receiverId !== userId) {
    return res.status(403).json({ 
      error: 'forbidden', 
      message: 'Vous ne pouvez pas supprimer cette amitié' 
    });
  }

  // Delete the friendship
  await friendRequest.destroy();

  res.json({ message: 'Ami supprimé avec succès' });
}));

// ============================================================================
// POLLING ENDPOINTS FOR MESSAGES
// ============================================================================

// Get new messages since a specific timestamp (for polling)
app.get('/messages/new', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const since = req.query.since ? new Date(req.query.since) : null;
  const otherUserId = req.query.userId ? Number(req.query.userId) : null;

  if (!since || isNaN(since.getTime())) {
    return res.status(400).json({
      error: 'bad_request',
      message: 'Paramètre "since" requis (ISO 8601 timestamp)'
    });
  }

  // Build query for new messages
  const whereClause = {
    createdAt: { [Sequelize.Op.gt]: since }
  };

  // If userId specified, only get messages from/to that user
  if (otherUserId && !isNaN(otherUserId)) {
    whereClause[Sequelize.Op.or] = [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId }
    ];
  } else {
    // Get all messages involving the user
    whereClause[Sequelize.Op.or] = [
      { senderId: userId },
      { receiverId: userId }
    ];
  }

  const newMessages = await Message.findAll({
    where: whereClause,
    order: [['createdAt', 'ASC']],
    limit: 100,
    include: [
      { model: User, as: 'sender', attributes: ['id', 'email'] },
      { model: User, as: 'receiver', attributes: ['id', 'email'] }
    ]
  });

  res.json({
    messages: newMessages,
    timestamp: new Date().toISOString()
  });
}));

// Get unread message count per conversation
app.get('/messages/unread-count', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const since = req.query.since ? new Date(req.query.since) : null;

  const whereClause = {
    receiverId: userId
  };

  if (since && !isNaN(since.getTime())) {
    whereClause.createdAt = { [Sequelize.Op.gt]: since };
  }

  // Get all messages received by user and group by sender
  const messages = await Message.findAll({
    where: whereClause,
    attributes: [
      'senderId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('MAX', sequelize.col('created_at')), 'lastMessageAt']
    ],
    include: [
      { model: User, as: 'sender', attributes: ['id', 'email'] }
    ],
    group: ['senderId', 'sender.id', 'sender.email']
  });

  res.json({
    unreadCounts: messages.map(m => ({
      senderId: m.senderId,
      senderEmail: m.sender.email,
      unreadCount: parseInt(m.getDataValue('count')),
      lastMessageAt: m.getDataValue('lastMessageAt')
    })),
    timestamp: new Date().toISOString()
  });
}));

// ============================================================================
// SOCKET.IO - REAL-TIME NOTIFICATIONS
// ============================================================================

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // Authenticate socket connection
  socket.on('authenticate', async (data) => {
    try {
      const { token } = data || {};

      if (!token) {
        socket.emit('error', { message: 'Token manquant' });
        return;
      }

      // Verify JWT
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;

      // Store user - map userId to socketId
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;

      // Join user's personal room for notifications
      socket.join(`user_${userId}`);

      console.log(`✅ User ${userId} authenticated on socket ${socket.id}`);
      socket.emit('authenticated', { userId, message: 'Authentification réussie' });
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
      socket.emit('error', { message: 'Token invalide' });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      console.log(`👋 User ${socket.userId} disconnected (socket ${socket.id})`);
      connectedUsers.delete(socket.userId);
    } else {
      console.log('👋 Socket disconnected:', socket.id);
    }
  });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: `Endpoint ${req.method} ${req.path} non trouvé`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'validation_error',
      message: err.errors.map(e => e.message).join(', ')
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'conflict',
      message: 'Cette ressource existe déjà'
    });
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'cors_error',
      message: 'Origine non autorisée'
    });
  }

  // Default error
  res.status(500).json({
    error: 'internal_error',
    message: NODE_ENV === 'production' 
      ? 'Erreur interne du serveur' 
      : err.message
  });
});

// ============================================================================
// START SERVER
// ============================================================================

async function start() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync models (don't alter existing schema)
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synced');

    // Start HTTP/HTTPS server (internal only - localhost)
    const protocol = httpServer instanceof https.Server ? 'https' : 'http';
    const HOST = process.env.HOST || '127.0.0.1'; // Internal only (localhost)
    
    httpServer.listen(PORT, HOST, () => {
      console.log('');
      console.log('════════════════════════════════════════════════════════');
      console.log(`✅ Server running on ${protocol.toUpperCase()}://${HOST}:${PORT} (internal only)`);
      console.log(`📡 Socket.IO ready for real-time notifications`);
      console.log(`💬 Messages via REST API (polling recommended)`);
      console.log(`🔐 JWT authentication enabled`);
      console.log(`🛡️  Security: Helmet + Rate Limiting + CORS`);
      console.log(`⚡ Optimization: Compression + Connection Pool`);
      if (protocol === 'https') {
        console.log(`🔒 HTTPS/TLS enabled (internal)`);
      }
      console.log('════════════════════════════════════════════════════════');
      console.log('');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
  });
  await sequelize.close();
  console.log('✅ Database connections closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️  SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
  });
  await sequelize.close();
  console.log('✅ Database connections closed');
  process.exit(0);
});

start();
