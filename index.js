import Express from 'express';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import lessonRoutes from './src/routes/lessons.js';
import orderRoutes from './src/routes/orders.js';

const app = Express();
app.use(Express.json());

dotenv.config();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/lessons', lessonRoutes);
app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => res.send('Hello World!'));
// Start the express server on the relevant port
app.listen(port, () => {
  console.log(`server is running on ${port}`);
});