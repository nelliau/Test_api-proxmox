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
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || '';

// Initialize Sequelize (MySQL)
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    // You can add timezone or SSL options here if needed
  }
});

// Define Message model
const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  sender: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'messages',
  timestamps: false
});

// Health endpoint (optional minimal REST)
app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
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

      const { sender, content } = data;
      if (!sender || !content) {
        console.warn('Invalid payload: sender/content missing');
        return;
      }

      const saved = await Message.create({ sender, content });
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
    await sequelize.sync();
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


