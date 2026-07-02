import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not set. AI features will not work.');
      return null as any;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'elan-learning',
        },
      },
    });
  }
  return aiClient;
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(process.cwd())));

// API route
app.post('/api/generate-course', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Create a course about: ${topic}. Return JSON with: {title, description, units: [{id, number, title, lessons: [{id, title}]}]}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const courseData = JSON.parse(response.text);
    res.json(courseData);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
});
