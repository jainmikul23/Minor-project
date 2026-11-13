const express = require('express');
const router = express.Router();
const { generateText, classifyData } = require('../utils/geminiHelper');

router.post('/classify', async (req, res) => {
    const { title, description } = req.body;
    const result = await classifyData(title, description);
    res.json(result);
});

router.get('/generate', async (req, res) => {
    const { prompt } = req.query;
    const response = await generateText(prompt);
    res.json({ response });
});

module.exports = router;
