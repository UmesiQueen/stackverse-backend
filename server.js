import Express from 'express';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import lessonRoutes from './src/routes/lessons.js';
import orderRoutes from './src/routes/orders.js';
import { logger } from './src/middleware/logger.js';
import { notFound } from './src/middleware/notFound.js';

const app = Express();
app.use(Express.json());

dotenv.config();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(logger);

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