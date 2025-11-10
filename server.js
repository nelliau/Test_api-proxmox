import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Basic Express setup
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server and bind Socket.IO
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Environment variables
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Initialize Sequelize (MySQL)
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    // You can add timezone or SSL options here if needed
  }
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

// Define FriendRequest model
const FriendRequest = sequelize.define(
  'FriendRequest',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    requesterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'requester_id',
    },
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'receiver_id',
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
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
    tableName: 'friend_request',
    timestamps: false,
  }
);

// Define associations
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// Friend request associations
FriendRequest.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });
FriendRequest.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

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
    const decoded = jwt.verify(token, JWT_SECRET);
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
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'bad_request', message: 'Email et mot de passe requis' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'bad_request', message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'conflict', message: 'Cet email est déjà utilisé' });
    }

    // Hash password (compatible with Symfony bcrypt)
    const hashedPassword = await bcrypt.hash(password, 13);

    // Create user
    const user = await User.create({
      email,
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
      { expiresIn: JWT_EXPIRES_IN }
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
    console.error('POST /register failed:', err);
    res.status(500).json({ error: 'internal_error', message: 'Erreur lors de la création du compte' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'bad_request', message: 'Email et mot de passe requis' });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
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
      { expiresIn: JWT_EXPIRES_IN }
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
    console.error('POST /login failed:', err);
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
    const otherUserId = req.query.userId ? Number(req.query.userId) : null;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    if (!otherUserId) {
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
app.post('/messages', authenticateJWT, async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, content } = req.body || {};

    // Validation
    if (!receiverId || !content) {
      return res.status(400).json({ error: 'bad_request', message: 'receiverId et content requis' });
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'bad_request', message: 'Le contenu ne peut pas être vide' });
    }

    // Check if receiver exists
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'not_found', message: 'Destinataire introuvable' });
    }

    // Save message
    const message = await Message.create({
      senderId,
      receiverId,
      content: content.trim(),
    });

    // Emit to Socket.IO rooms (if connected)
    const roomName = getRoomName(senderId, receiverId);
    io.to(roomName).emit('message', {
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      createdAt: message.createdAt,
    });

    res.status(201).json(message);
  } catch (err) {
    console.error('POST /messages failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ============================================================================
// FRIENDS SYSTEM ENDPOINTS
// ============================================================================

// Send a friend request
app.post('/friends/request', authenticateJWT, async (req, res) => {
  try {
    const requesterId = req.user.userId;
    const { receiverId } = req.body || {};

    // Validation
    if (!receiverId || typeof receiverId !== 'number') {
      return res.status(400).json({ error: 'bad_request', message: 'receiverId requis' });
    }

    // Cannot send request to yourself
    if (requesterId === receiverId) {
      return res.status(400).json({ error: 'bad_request', message: 'Vous ne pouvez pas vous ajouter vous-même' });
    }

    // Check if receiver exists
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'not_found', message: 'Utilisateur introuvable' });
    }

    // Check if friend request already exists (in either direction)
    const existingRequest = await FriendRequest.findOne({
      where: {
        [Sequelize.Op.or]: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId }
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
      requesterId,
      receiverId,
      status: 'pending'
    });

    res.status(201).json({
      message: 'Demande d\'ami envoyée',
      request: {
        id: friendRequest.id,
        requesterId: friendRequest.requesterId,
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
          as: 'requester',
          attributes: ['id', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      requests: requests.map(req => ({
        id: req.id,
        requester: {
          id: req.requester.id,
          email: req.requester.email
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
    const requestId = parseInt(req.params.id);
    const { action } = req.body || {}; // 'accept' or 'reject'

    // Validation
    if (!action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'bad_request', message: 'action doit être "accept" ou "reject"' });
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
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    await friendRequest.update({ status: newStatus });

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

    // Get all accepted friend requests where user is either requester or receiver
    const friendRequests = await FriendRequest.findAll({
      where: {
        [Sequelize.Op.or]: [
          { requesterId: userId },
          { receiverId: userId }
        ],
        status: 'accepted'
      },
      include: [
        {
          model: User,
          as: 'requester',
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
      const friend = req.requesterId === userId ? req.receiver : req.requester;
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
    const friendshipId = parseInt(req.params.id);

    // Find the friend request
    const friendRequest = await FriendRequest.findByPk(friendshipId);

    if (!friendRequest) {
      return res.status(404).json({ error: 'not_found', message: 'Amitié introuvable' });
    }

    // Check if user is part of this friendship
    if (friendRequest.requesterId !== userId && friendRequest.receiverId !== userId) {
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
// SOCKET.IO - PRIVATE MESSAGING
// ============================================================================

// Helper to create a consistent room name for two users
function getRoomName(userId1, userId2) {
  // Always use the same room name regardless of order
  const [smaller, larger] = [userId1, userId2].sort((a, b) => a - b);
  return `chat_${smaller}_${larger}`;
}

// Store connected users: { socketId: userId }
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

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

      // Store user
      connectedUsers.set(socket.id, userId);
      socket.userId = userId;

      console.log(`User ${userId} authenticated on socket ${socket.id}`);
      socket.emit('authenticated', { userId, message: 'Authentification réussie' });
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
      socket.emit('error', { message: 'Token invalide' });
    }
  });

  // Join a conversation room
  socket.on('join_conversation', (data) => {
    try {
      const { otherUserId } = data || {};

      if (!socket.userId) {
        socket.emit('error', { message: 'Non authentifié. Utilisez l\'événement "authenticate" d\'abord.' });
        return;
      }

      if (!otherUserId || typeof otherUserId !== 'number') {
        socket.emit('error', { message: 'otherUserId invalide' });
        return;
      }

      const roomName = getRoomName(socket.userId, otherUserId);
      socket.join(roomName);

      console.log(`User ${socket.userId} joined room ${roomName}`);
      socket.emit('joined_conversation', { roomName, otherUserId });
    } catch (err) {
      console.error('Error joining conversation:', err);
      socket.emit('error', { message: 'Erreur lors de la jonction à la conversation' });
    }
  });

  // Send message in real-time
  socket.on('send_message', async (data) => {
    try {
      const { receiverId, content } = data || {};

      if (!socket.userId) {
        socket.emit('error', { message: 'Non authentifié' });
        return;
      }

      // Validation
      if (!receiverId || !content || typeof content !== 'string' || content.trim().length === 0) {
        socket.emit('error', { message: 'receiverId et content requis' });
        return;
      }

      // Check if receiver exists
      const receiver = await User.findByPk(receiverId);
      if (!receiver) {
        socket.emit('error', { message: 'Destinataire introuvable' });
        return;
      }

      // Save message to database
      const message = await Message.create({
        senderId: socket.userId,
        receiverId,
        content: content.trim(),
      });

      // Send to both users in the conversation room
      const roomName = getRoomName(socket.userId, receiverId);
      io.to(roomName).emit('message', {
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        createdAt: message.createdAt,
      });

      console.log(`Message sent from ${socket.userId} to ${receiverId} in room ${roomName}`);
    } catch (err) {
      console.error('Error handling send_message:', err);
      socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      console.log(`User ${userId} disconnected (socket ${socket.id})`);
      connectedUsers.delete(socket.id);
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
    await sequelize.sync({ alter: false });
    console.log('Database connected and models synced.');

    httpServer.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`);
      console.log(`📡 Socket.IO ready for real-time messaging`);
      console.log(`🔐 JWT authentication enabled`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
