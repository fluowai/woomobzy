import express from 'express';
import { processAgenticTask } from '../services/jarvisService.js';
import { verifyAuth } from '../middleware/auth.js'; 

const router = express.Router();

router.post('/ask', verifyAuth, async (req, res) => {
  try {
    const { prompt, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt é obrigatório.' });
    }

    const responseText = await processAgenticTask(prompt, context || {});
    
    res.json({
      success: true,
      data: {
        reply: responseText
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
