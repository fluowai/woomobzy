import express from 'express';

const router = express.Router();

router.use((req, res) => {
  res.status(501).json({
    error: 'Wootech AI admin routes are not implemented yet',
    code: 'AI_ADMIN_NOT_IMPLEMENTED',
  });
});

export default router;