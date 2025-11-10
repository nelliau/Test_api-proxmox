import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';

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

// Define Message model aligned with existing MySQL schema `message`
// SQL columns: id, sender_id, receiver_id, content, created_at
const Message = sequelize.define(
  'Message',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    senderId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'sender_id',
    },
    receiverId: {
      type: DataTypes.INTEGER.UNSIGNED,
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

// Health endpoint (optional minimal REST)
app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

// REST endpoints for messages
// List messages: /messages?limit=50
app.get('/messages', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const messages = await Message.findAll({
      order: [['id', 'DESC']],
      limit,
    });
    res.json(messages);
  } catch (err) {
    console.error('GET /messages failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Create message: { senderId:number, receiverId:number, content:string }
app.post('/messages', async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body || {};
    const isValid =
      typeof senderId === 'number' &&
      typeof receiverId === 'number' &&
      typeof content === 'string' &&
      content.trim().length > 0;

    if (!isValid) {
      return res.status(400).json({ error: 'invalid_payload' });
    }

    const saved = await Message.create({ senderId, receiverId, content: content.trim() });
    res.status(201).json(saved);
  } catch (err) {
    console.error('POST /messages failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  socket.on('message', async (data) => {
    try {
      console.log('Received message:', data);

      if (!data || typeof data !== 'object') {
        return;
      }

      // Support both old shape { sender, content } and new shape { senderId, receiverId, content }
      const hasNewShape =
        Object.prototype.hasOwnProperty.call(data, 'senderId') &&
        Object.prototype.hasOwnProperty.call(data, 'receiverId');

      if (hasNewShape) {
        const { senderId, receiverId, content } = data;
        if (
          typeof senderId !== 'number' ||
          typeof receiverId !== 'number' ||
          !content ||
          typeof content !== 'string'
        ) {
          console.warn('Invalid payload: senderId/receiverId/content invalid');
          return;
        }
        const saved = await Message.create({ senderId, receiverId, content });
        const payload = saved.toJSON();
        io.emit('message', payload);
        return;
      }

      // Backward compatibility: if only { sender, content } provided, store sender as receiver-less message
      const { sender, content } = data;
      if (!sender || typeof sender !== 'string' || !content || typeof content !== 'string') {
        console.warn('Invalid payload: sender/content missing');
        return;
      }
      const saved = await Message.create({ senderId: 0, receiverId: 0, content });
      const payload = saved.toJSON();

      io.emit('message', payload);
    } catch (err) {
      console.error('Error handling message event:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
  });
});

async function start() {
  try {
    await sequelize.authenticate();
    // Do not alter existing schema; ensure model is usable
    await sequelize.sync({ alter: false });
    console.log('Database connected and models synced.');

    httpServer.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

