const geminiService = require('./geminiServiceWrapper');

async function generateText(prompt) {
    try {
        const result = await geminiService.generateResponse(prompt);
        return result || '';
    } catch (err) {
        console.warn('generateText fallback:', err.message);
        return '';
    }
}

async function classifyData(title, description) {
    try {
        const prompt = `Classify this civic issue. Title: ${title}, Description: ${description}. Return strictly JSON with {"category": "...", "confidence": 0.0-1.0}`;
        const response = await geminiService.generateResponse(prompt);
        let text = (response || '').trim().replace(/```[a-zA-Z]*|```/g, '').trim();
        return JSON.parse(text);
    } catch (err) {
        return { category: 'General', confidence: 0.8 };
    }
}

module.exports = { generateText, classifyData };
