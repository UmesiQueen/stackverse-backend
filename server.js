import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import connectDB from './src/config/db.js';
import lessonRoutes from './src/routes/lessons.js';
import orderRoutes from './src/routes/orders.js';
import { logger } from './src/middleware/logger.js';
import { notFound } from './src/middleware/notFound.js';

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(logger);
app.use('/images', express.static(path.join(process.cwd(), './public/images')));

// Routes
app.use('/api/lessons', lessonRoutes);
app.use('/api/orders', orderRoutes);
app.get('/', (req, res) => res.send(`    
    <h1>StackVerse API</h1>
    <h2>Available Routes</h2>
    <ul>
      <li>GET <a href="/api/lessons">/api/lessons</a> - List all lessons</li>
      <li>PUT <a href="/api/lessons/update">/api/lessons/update</a>- Update lessons values</li>
      <li>POST <a href="/api/orders">/api/orders</a> - Create a new order</li>
    </ul>
  `));

// Not Found Middleware
app.use(notFound);

// Start the express server on the relevant port
app.listen(port, () => {
  console.log(`server is running on ${port}`);
});