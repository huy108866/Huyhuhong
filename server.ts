/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-load GoogleGenAI to prevent crashing on start if API key is not yet set
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '10mb' }));

  // API route to generate a course using Gemini
  app.post('/api/generate-course', async (req, res) => {
    try {
      const { topic, customText, focusSkill = 'general' } = req.body;
      if (!topic && !customText) {
        return res.status(400).json({ error: 'Chủ đề hoặc nội dung văn bản là bắt buộc!' });
      }

      const inputContent = customText 
        ? `Nội dung tài liệu người dùng cung cấp:\n${customText}\n\nChủ đề tóm tắt: ${topic || 'Tự động rút gọn'}`
        : `Chủ đề học tập: ${topic}`;

      const systemInstruction = `Bạn là một chuyên gia thiết kế chương trình học của Duolingo và một nhà giáo dục Spaced Repetition thông thái.
Nhiệm vụ của bạn là chuyển hóa chủ đề hoặc nội dung được cung cấp thành một lộ trình học tập toàn diện (Course) gồm chính xác 10 Chương (Units) và mỗi Chương chứa đúng 10 Bài học (Lessons). Tổng cộng là 100 Bài học.

Hãy tạo một khoá học bằng tiếng Việt định dạng JSON có cấu trúc chính xác sau đây:
{
  "title": "Tên khoá học ngắn gọn",
  "topic": "Tên chủ đề ngắn gọn",
  "description": "Mô tả khóa học ngắn gọn",
  "units": [
    {
      "id": "unit_1",
      "number": 1,
      "title": "Tên Chương 1",
      "description": "Mô tả ngắn gọn",
      "lessons": [
        {
          "id": "u1_l1",
          "title": "Bài học 1",
          "description": "Mô tả bài học",
          "exercises": []
        }
      ]
    }
  ]
}`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: inputContent,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.85,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini không trả về kết quả.');
      }

      const courseData = JSON.parse(responseText.trim());
      res.json(courseData);
    } catch (error: any) {
      console.error('Lỗi khi sinh khóa học:', error);
      res.status(500).json({ 
        error: error.message || 'Lỗi hệ thống',
        details: error.stack 
      });
    }
  });

  // Serve static files from dist in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In development, serve from src
    app.use(express.static(path.join(__dirname)));
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ [Élan Learning Server] Đang chạy tại http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('❌ Không thể khởi động server:', err);
  process.exit(1);
});
