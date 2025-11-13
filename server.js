import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import validator from 'validator';

// Load environment variables
dotenv.config();

// Basic Express setup
const app = express();

// Environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

const PORT = Number(process.env.PORT) || 3000;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || '';

if (!process.env.JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET environment variable. Set a strong secret and restart the server.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;

const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '1mb';
const MESSAGE_MAX_BYTES = Number(process.env.MESSAGE_MAX_BYTES) || 16384;

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 400;
const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;

const TRUST_PROXY = process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';
const SHOULD_SYNC_SCHEMA = process.env.SEQUELIZE_SYNC === 'true';
const MIN_PASSWORD_LENGTH = Number(process.env.MIN_PASSWORD_LENGTH) || 8;
const MAX_PASSWORD_LENGTH = Number(process.env.MAX_PASSWORD_LENGTH) || 128;
const SOCKET_HANDSHAKE_TIMEOUT_MS = Number(process.env.SOCKET_HANDSHAKE_TIMEOUT_MS) || 10000;

const parseOrigins = (raw) => {
  if (!raw) {
    return [];
  }
  if (raw.trim() === '*') {
    return ['*'];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const rawHttpOrigins = parseOrigins(process.env.CORS_ALLOWED_ORIGINS);
const rawSocketOrigins = parseOrigins(process.env.SOCKET_ALLOWED_ORIGINS);
const DEFAULT_ALLOWED_ORIGINS = process.env.DEFAULT_CORS_ORIGINS === 'none' ? [] : ['http://localhost:3000'];

const resolvedHttpOrigins =
  rawHttpOrigins.length > 0 ? rawHttpOrigins : DEFAULT_ALLOWED_ORIGINS;

const resolvedSocketOrigins =
  rawSocketOrigins.length > 0 ? rawSocketOrigins : resolvedHttpOrigins;

const allowAllHttpOrigins = resolvedHttpOrigins.includes('*');
const allowAllSocketOrigins = resolvedSocketOrigins.includes('*');

const corsOptions = {
  origin: allowAllHttpOrigins
    ? true
    : (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        if (resolvedHttpOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204,
  maxAge: 600,
};

if (TRUST_PROXY) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(hpp());
app.use(
  mongoSanitize({
    allowDots: true,
  })
);
app.use(compression());

app.use(
  express.json({
    limit: JSON_BODY_LIMIT,
  })
);
app.use(
  express.urlencoded({
    extended: false,
    limit: JSON_BODY_LIMIT,
  })
);

const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: AUTH_RATE_LIMIT_MAX,
  message: {
    error: 'too_many_requests',
    message: 'Trop de tentatives, réessayez plus tard.',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Create HTTP server and bind Socket.IO
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowAllSocketOrigins ? '*' : resolvedSocketOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize Sequelize (MySQL)
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: !isProduction && process.env.DB_LOGGING === 'true',
  pool: {
    max: Number(process.env.DB_POOL_MAX) || 10,
    min: Number(process.env.DB_POOL_MIN) || 0,
    acquire: Number(process.env.DB_POOL_ACQUIRE_MS) || 30000,
    idle: Number(process.env.DB_POOL_IDLE_MS) || 10000,
  },
  retry: {
    max: Number(process.env.DB_RETRY_MAX) || 3,
  },
  define: {
    underscored: false,
  },
  dialectOptions: {
    timezone: process.env.DB_TIMEZONE || 'Z',
    ssl:
      process.env.DB_SSL === 'true'
        ? {
            require: true,
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : undefined,
  },
  benchmark: process.env.DB_BENCHMARK === 'true',
});

// Define User model aligned with existing MySQL schema
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
  },
  {
    tableName: 'user',
    timestamps: false,
  }
);

// Define Message model aligned with existing MySQL schema
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

// Define FriendRequest model (maps to existing 'friends' table)
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

// Define associations
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// Friend request associations
FriendRequest.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
FriendRequest.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

const buildJwtOptions = () => {
  const signOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };

  if (JWT_ISSUER) {
    signOptions.issuer = JWT_ISSUER;
  }

  if (JWT_AUDIENCE) {
    signOptions.audience = JWT_AUDIENCE;
  }

  return signOptions;
};

const jwtVerifyOptions = () => {
  const verifyOptions = {};
  if (JWT_ISSUER) {
    verifyOptions.issuer = JWT_ISSUER;
  }
  if (JWT_AUDIENCE) {
    verifyOptions.audience = JWT_AUDIENCE;
  }
  return verifyOptions;
};

const maskEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return 'N/A';
  }
  const [local, domain] = email.split('@');
  if (!domain) {
    return '***';
  }
  const prefix = local.slice(0, 2) || '*';
  return `${prefix}***@${domain}`;
};

const parseIntegerParam = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

const parseLimit = (value, defaultValue, maxValue) => {
  const parsed = parseIntegerParam(value);
  if (parsed === null) {
    return defaultValue;
  }
  return Math.min(parsed, maxValue);
};

const isValidIsoDate = (value) => {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp);
};

const trimToNull = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const escapeLikePattern = (value) => value.replace(/[\\%_]/g, '\\$&');

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Token manquant ou invalide' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET, jwtVerifyOptions());
    req.user = decoded; // { userId, email, roles }
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'unauthorized', message: 'Token invalide ou expiré' });
  }
};

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Realtime Messaging API' });
});

// Register new user
app.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail =
      typeof email === 'string'
        ? validator.normalizeEmail(email, { gmail_remove_dots: false })
        : null;

    // Validation
    if (!normalizedEmail || !validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'bad_request', message: 'Email invalide' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'bad_request', message: 'Email et mot de passe requis' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: 'bad_request',
        message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`,
      });
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: 'bad_request',
        message: `Le mot de passe ne peut pas dépasser ${MAX_PASSWORD_LENGTH} caractères`,
      });
    }

    if (password.trim().length === 0) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Le mot de passe ne peut pas être vide',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'conflict', message: 'Cet email est déjà utilisé' });
    }

    // Hash password (compatible with Symfony bcrypt)
    const hashedPassword = await bcrypt.hash(password, 13);

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      roles: ['ROLE_USER'],
    });

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roles: user.roles,
      },
      JWT_SECRET,
      buildJwtOptions()
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (err) {
    console.error(`POST /register failed for ${maskEmail(req.body?.email)}:`, err);
    res.status(500).json({ error: 'internal_error', message: 'Erreur lors de la création du compte' });
  }
});

// Login
app.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail =
      typeof email === 'string'
        ? validator.normalizeEmail(email, { gmail_remove_dots: false })
        : null;

    // Validation
    if (!normalizedEmail || !validator.isEmail(normalizedEmail) || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'bad_request', message: 'Email et mot de passe requis' });
    }

    // Find user
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Email ou mot de passe incorrect' });
    }

    // Verify password (compatible with Symfony bcrypt $2y$ format)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'unauthorized', message: 'Email ou mot de passe incorrect' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roles: user.roles,
      },
      JWT_SECRET,
      buildJwtOptions()
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (err) {
    console.error(`POST /login failed for ${maskEmail(req.body?.email)}:`, err);
    res.status(500).json({ error: 'internal_error', message: 'Erreur lors de la connexion' });
  }
});

// ============================================================================
// PROTECTED ENDPOINTS (require JWT authentication)
// ============================================================================

// Get current user info
app.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'email', 'roles'],
    });

    if (!user) {
      return res.status(404).json({ error: 'not_found', message: 'Utilisateur introuvable' });
    }

    res.json({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });
  } catch (err) {
    console.error('GET /me failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Get conversation history between two users
// GET /messages?userId=2 (returns conversation between current user and user ID 2)
app.get('/messages', authenticateJWT, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = parseIntegerParam(req.query.userId);
    const limit = parseLimit(req.query.limit, 50, 200);

    if (otherUserId === null) {
      return res.status(400).json({ error: 'bad_request', message: 'userId requis en query parameter' });
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
  } catch (err) {
    console.error('GET /messages failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

  // Send a message (REST endpoint - alternative to Socket.IO)
// ⚠️ IMPORTANT E2EE: Le content est chiffré, ne pas le modifier !
app.post('/messages', authenticateJWT, async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, content } = req.body || {};
    const parsedReceiverId = parseIntegerParam(receiverId);

    // Validation
    if (parsedReceiverId === null || content === undefined || content === null) {
      return res.status(400).json({ error: 'bad_request', message: 'receiverId et content requis' });
    }

    // Pour E2EE : le content est chiffré (base64), ne pas utiliser .trim()
    if (typeof content !== 'string' || content.length === 0) {
      return res.status(400).json({ error: 'bad_request', message: 'Le contenu ne peut pas être vide' });
    }

    if (Buffer.byteLength(content, 'utf8') > MESSAGE_MAX_BYTES) {
      return res.status(413).json({
        error: 'payload_too_large',
        message: `Le message dépasse la taille maximale autorisée (${MESSAGE_MAX_BYTES} octets)`,
      });
    }

    // Check if receiver exists
    const receiver = await User.findByPk(parsedReceiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'not_found', message: 'Destinataire introuvable' });
    }

    // Save message to database (content is encrypted, don't modify it)
    const message = await Message.create({
      senderId,
      receiverId: parsedReceiverId,
      content: content,  // Pas de .trim() ! Contenu chiffré
    });

    res.status(201).json({
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      createdAt: message.createdAt,
    });
  } catch (err) {
    console.error('POST /messages failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ============================================================================
// USER SEARCH ENDPOINT
// ============================================================================

// Search users by email (for finding friends)
app.get('/users/search', authenticateJWT, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { q, email, limit } = req.query;

    // Validation
    const searchQuery = trimToNull(q ?? email);
    if (!searchQuery) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Paramètre "q" ou "email" requis pour la recherche'
      });
    }

    if (searchQuery.length < 2) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'La recherche doit contenir au moins 2 caractères'
      });
    }

    const searchLimit = parseLimit(limit, 20, 50);
    const escapedQuery = escapeLikePattern(searchQuery);

    // Search users by email (partial match)
    const users = await User.findAll({
      where: {
        email: {
          [Sequelize.Op.like]: `%${escapedQuery}%`
        },
        id: {
          [Sequelize.Op.ne]: currentUserId  // Exclude current user
        }
      },
      attributes: ['id', 'email'],
      limit: searchLimit
    });

    res.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email
      }))
    });
  } catch (err) {
    console.error('GET /users/search failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Get user by ID (for profile view)
app.get('/users/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = parseIntegerParam(req.params.id);

    if (userId === null) {
      return res.status(400).json({ error: 'bad_request', message: 'ID utilisateur invalide' });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'roles']
    });

    if (!user) {
      return res.status(404).json({ error: 'not_found', message: 'Utilisateur introuvable' });
    }

    res.json({
      id: user.id,
      email: user.email,
      roles: user.roles
    });
  } catch (err) {
    console.error('GET /users/:id failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ============================================================================
// FRIENDS SYSTEM ENDPOINTS
// ============================================================================

// Send a friend request
app.post('/friends/request', authenticateJWT, async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, receiverEmail } = req.body || {};

    // Validation - accept either receiverId or receiverEmail
    if ((receiverId === undefined || receiverId === null || receiverId === '') && !receiverEmail) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'receiverId ou receiverEmail requis'
      });
    }

    // Find receiver by ID or email
    let receiver;
    let actualReceiverId = null;
    if (receiverId !== undefined && receiverId !== null && receiverId !== '') {
      actualReceiverId = parseIntegerParam(receiverId);
      if (actualReceiverId === null) {
        return res.status(400).json({ error: 'bad_request', message: 'receiverId doit être un nombre entier' });
      }
      receiver = await User.findByPk(actualReceiverId);
    } else {
      // Find by email
      if (typeof receiverEmail !== 'string') {
        return res.status(400).json({ error: 'bad_request', message: 'receiverEmail invalide' });
      }
      const normalizedEmail = validator.normalizeEmail(receiverEmail, { gmail_remove_dots: false });
      if (!normalizedEmail || !validator.isEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'bad_request', message: 'receiverEmail invalide' });
      }
      receiver = await User.findOne({ where: { email: normalizedEmail } });
    }

    // Check if receiver exists
    if (!receiver) {
      return res.status(404).json({ error: 'not_found', message: 'Utilisateur introuvable' });
    }

    actualReceiverId = receiver.id;

    // Cannot send request to yourself
    if (senderId === actualReceiverId) {
      return res.status(400).json({ error: 'bad_request', message: 'Vous ne pouvez pas vous ajouter vous-même' });
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
        return res.status(409).json({ error: 'conflict', message: 'Vous êtes déjà amis' });
      }
      if (existingRequest.status === 'pending') {
        return res.status(409).json({ error: 'conflict', message: 'Demande déjà envoyée' });
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
  } catch (err) {
    console.error('POST /friends/request failed:', err);
    res.status(500).json({ error: 'internal_error', message: 'Erreur lors de l\'envoi de la demande' });
  }
});

// Get pending friend requests (received)
app.get('/friends/requests', authenticateJWT, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('GET /friends/requests failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Accept or reject a friend request
app.put('/friends/request/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestId = parseIntegerParam(req.params.id);
    const { action } = req.body || {}; // 'accept' or 'decline'

    // Validation
    if (!action || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'bad_request', message: 'action doit être "accept" ou "decline"' });
    }

    if (requestId === null) {
      return res.status(400).json({ error: 'bad_request', message: 'ID de demande invalide' });
    }

    // Find the friend request
    const friendRequest = await FriendRequest.findByPk(requestId);

    if (!friendRequest) {
      return res.status(404).json({ error: 'not_found', message: 'Demande introuvable' });
    }

    // Check if current user is the receiver
    if (friendRequest.receiverId !== userId) {
      return res.status(403).json({ error: 'forbidden', message: 'Vous ne pouvez pas modifier cette demande' });
    }

    // Check if already processed
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ error: 'bad_request', message: 'Cette demande a déjà été traitée' });
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
  } catch (err) {
    console.error('PUT /friends/request/:id failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Get list of friends (accepted requests)
app.get('/friends', authenticateJWT, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('GET /friends failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Remove a friend (delete friendship)
app.delete('/friends/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const friendshipId = parseIntegerParam(req.params.id);

    if (friendshipId === null) {
      return res.status(400).json({ error: 'bad_request', message: 'ID de relation invalide' });
    }

    // Find the friend request
    const friendRequest = await FriendRequest.findByPk(friendshipId);

    if (!friendRequest) {
      return res.status(404).json({ error: 'not_found', message: 'Amitié introuvable' });
    }

    // Check if user is part of this friendship
    if (friendRequest.senderId !== userId && friendRequest.receiverId !== userId) {
      return res.status(403).json({ error: 'forbidden', message: 'Vous ne pouvez pas supprimer cette amitié' });
    }

    // Delete the friendship
    await friendRequest.destroy();

    res.json({ message: 'Ami supprimé avec succès' });
  } catch (err) {
    console.error('DELETE /friends/:id failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ============================================================================
// POLLING ENDPOINTS FOR MESSAGES
// ============================================================================

// Get new messages since a specific timestamp (for polling)
app.get('/messages/new', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sinceParam = trimToNull(req.query.since);
    const otherUserId = parseIntegerParam(req.query.userId);

    if (!sinceParam || !isValidIsoDate(sinceParam)) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Paramètre "since" requis (ISO 8601 timestamp)'
      });
    }

    const since = new Date(sinceParam);

    // Build query for new messages
    const whereClause = {
      createdAt: { [Sequelize.Op.gt]: since }
    };

    // If userId specified, only get messages from/to that user
    if (otherUserId !== null) {
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
  } catch (err) {
    console.error('GET /messages/new failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Get unread message count per conversation
app.get('/messages/unread-count', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sinceParam = trimToNull(req.query.since);

    const whereClause = {
      receiverId: userId
    };

    if (sinceParam) {
      if (!isValidIsoDate(sinceParam)) {
        return res.status(400).json({
          error: 'bad_request',
          message: 'Paramètre "since" invalide (ISO 8601 requis)'
        });
      }
      whereClause.createdAt = { [Sequelize.Op.gt]: new Date(sinceParam) };
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
  } catch (err) {
    console.error('GET /messages/unread-count failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ============================================================================
// SOCKET.IO - FRIEND REQUESTS REAL-TIME NOTIFICATIONS ONLY
// ============================================================================

// Store connected users: { userId: socketId }
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  const handshakeTimer = setTimeout(() => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentification requise' });
      socket.disconnect(true);
    }
  }, SOCKET_HANDSHAKE_TIMEOUT_MS);

  // Authenticate socket connection
  socket.on('authenticate', async (data) => {
    try {
      const { token } = data || {};

      if (!token) {
        socket.emit('error', { message: 'Token manquant' });
        return;
      }

      // Verify JWT
      const decoded = jwt.verify(token, JWT_SECRET, jwtVerifyOptions());
      const userId = decoded.userId;

      if (socket.userId && socket.userId !== userId) {
        console.warn(`Socket ${socket.id} attempted to re-authenticate as a different user (${socket.userId} -> ${userId}).`);
        socket.emit('error', { message: 'Changement d\'identité non autorisé' });
        return;
      }

      // Store user - map userId to socketId
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;

      // Join user's personal room for notifications
      socket.join(`user_${userId}`);
      clearTimeout(handshakeTimer);

      console.log(`User ${userId} authenticated on socket ${socket.id}`);
      socket.emit('authenticated', { userId, message: 'Authentification réussie' });
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
      socket.emit('error', { message: 'Token invalide' });
      socket.disconnect(true);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    clearTimeout(handshakeTimer);
    if (socket.userId) {
      console.log(`User ${socket.userId} disconnected (socket ${socket.id})`);
      connectedUsers.delete(socket.userId);
    } else {
      console.log('Socket disconnected:', socket.id);
    }
  });
});

// ============================================================================
// START SERVER
// ============================================================================

async function start() {
  try {
    await sequelize.authenticate();
    // Do not alter existing schema; ensure models are usable
    console.log('Database connection established.');
    if (SHOULD_SYNC_SCHEMA) {
      await sequelize.sync({ alter: false });
      console.log('Models synced with existing schema (SEQUELIZE_SYNC=true).');
    }

    httpServer.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`);
      console.log(`📡 Socket.IO ready for friend request notifications`);
      console.log(`💬 Messages via REST API (polling recommended)`);
      console.log(`🔐 JWT authentication enabled`);
    });
  } catch (err) {
    console.error('Faiiled to start server:', err);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

start();
