import { Router } from 'express';

const router = Router();

// Root API response
router.get('/', (req, res) => {
  res.json({
    message: 'Agile Overlord API',
    version: '0.1.0',
  });
});

export default router;
