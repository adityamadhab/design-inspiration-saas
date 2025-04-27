import express from 'express';
import cors from 'cors';
import { config } from './config';
import extractRoutes from './routes/extractRoutes';
import inspirationRoutes from './routes/inspirationRoutes';
import adminRoutes from './routes/adminRoutes';
import errorHandler from './middlewares/errorHandler';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use('/screenshots', express.static('src/public/screenshots'));

// Routes
app.use('/api', extractRoutes);
app.use('/api/inspirations', inspirationRoutes);
app.use('/api/admin', adminRoutes);

// Error Handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
});

export default app; 