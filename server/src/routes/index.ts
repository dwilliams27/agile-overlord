import { Router } from 'express';
import apiRoutes from './api';

const router = Router();

// Root API response
router.get('/', (req, res) => {
  res.json({
    message: 'Agile Overlord API',
    version: '0.1.0',
  });
});

// Mount API routes
router.use('/api', apiRoutes);

export default router;
