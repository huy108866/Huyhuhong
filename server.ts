/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

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
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API route to generate a course using Gemini (now always exactly 10 Units and 10 Lessons each)
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

Để tránh bị quá giới hạn ký tự (Token Limit) của mô hình ngôn ngữ và đảm bảo JSON không bị cắt ngắn, cấu trúc JSON trả về bắt buộc phải có mảng rỗng cho "exercises": [] ở tất cả các bài học. Bạn chỉ cần lên khung sườn cho các Chương và các Bài học.

Hãy tạo một khoá học bằng tiếng Việt định dạng JSON có cấu trúc chính xác sau đây:
{
  "title": "Tên khoá học ngắn gọn, cuốn hút (ví dụ: VSTEP C1 Writing Masterclass, Tiếng Anh giao tiếp công sở, Bí mật vũ trụ)",
  "topic": "Tên chủ đề ngắn gọn",
  "description": "Mô tả khóa học ngắn gọn, mang tính khích lệ học tập (1-2 câu)",
  "units": [
    {
      "id": "unit_1",
      "number": 1,
      "title": "Tên Chương 1 (ví dụ: Bước chân đầu tiên, Nền móng cốt lõi)",
      "description": "Mô tả ngắn gọn mục tiêu của chương 1",
      "lessons": [
        {
          "id": "u1_l1",
          "title": "Bài học 1: [Tên bài học ngắn gọn]",
          "description": "Mô tả bài học kích thích trí tò mò",
          "exercises": []
        },
        {
          "id": "u1_l2",
          "title": "Bài học 2: [Tên bài học ngắn gọn]",
          "description": "Mô tả bài học kích thích trí tò mò",
          "exercises": []
        },
        ...
        {
          "id": "u1_l10",
          "title": "Bài học 10: [Tên bài học ngắn gọn]",
          "description": "Mô tả bài học kích thích trí tò mò",
          "exercises": []
        }
      ]
    },
    ...
    {
      "id": "unit_10",
      "number": 10,
      "title": "Tên Chương 10 (ví dụ: Đỉnh cao làm chủ)",
      "description": "Mô tả ngắn gọn mục tiêu của chương 10",
      "lessons": [
        ...
      ]
    }
  ]
}

Yêu cầu cực kỳ nghiêm ngặt:
1. Bạn phải tạo đúng chính xác 10 Chương (Unit 1 đến Unit 10). Không được thiếu, không được thừa.
2. Trong mỗi Chương, bạn phải tạo đúng chính xác 10 Bài học (id từ uX_l1 đến uX_l10, ví dụ u1_l1, u1_l2... u1_l10 cho Chương 1).
3. Trường "exercises" ở TẤT CẢ các bài học PHẢI là mảng rỗng []. KHÔNG ĐƯỢC sinh bài tập ở bước này nhằm giữ độ dài JSON hợp lệ và tránh lỗi tràn bộ nhớ / cắt xén phản hồi.
4. Hãy biến các tiêu đề chương và bài học thành các chủ đề dễ chịu, hài hước, mang đậm tính thực tế đời sống.
5. Đảm bảo trả về chuỗi JSON hợp lệ 100%, không bị thừa hoặc thiếu dấu ngoặc, không chứa bất kỳ văn bản giải thích nào khác bên ngoài khối JSON.`;

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
        error: error.message || 'Lỗi hệ thống khi tạo bài học. Vui lòng thử lại!',
        details: error.stack 
      });
    }
  });

  // API route to generate exercises on-demand for a specific lesson
  app.post('/api/generate-exercises', async (req, res) => {
    try {
      const { courseTitle, courseTopic, unitTitle, lessonTitle, lessonDescription, focusSkill = 'general' } = req.body;
      if (!lessonTitle) {
        return res.status(400).json({ error: 'Tên bài học là bắt buộc!' });
      }

      const isWriting = focusSkill === 'writing' || /writing|viết|vstep|essay|ielts/i.test(courseTopic || '') || /writing|viết|vstep|essay|ielts/i.test(lessonTitle || '');

      let formatInstructions = '';
      if (isWriting) {
        formatInstructions = `Vì bài học này liên quan đến kĩ năng Viết (Writing), VSTEP C1/B2, IELTS hoặc viết luận nâng cao:
Hãy tạo chính xác 4 bài tập (Exercise) theo thứ tự loại sau:
1. Loại 'slide': Bài giảng về dàn ý bài viết, hướng dẫn viết luận chi tiết, các tiêu chí chấm điểm VSTEP C1 hoặc IELTS cho bài học "${lessonTitle}".
2. Loại 'slide': Tổng hợp các cụm từ vựng đắt giá, collocations, phrasal verbs, cấu trúc ngữ pháp cần dùng kèm theo nghĩa và ví dụ.
3. Loại 'multiple_choice' hoặc 'fill_blank': Kiểm tra cách sử dụng từ vựng, collocations hoặc liên từ nối vừa học ở slide trước.
4. Loại 'writing_practice': Đưa ra đề bài viết luận hoặc viết thư cụ thể (Writing Prompt) thuộc chủ đề "${lessonTitle}". Đặt 'instruction' là 'Hãy thực hành viết bài luận/đoạn văn trực tiếp vào ô bên dưới', 'content' là đề bài cụ thể, 'correctAnswer' chứa bài mẫu chuẩn C1 tham khảo, 'explanation' chứa dàn ý chi tiết từng bước.`;
      } else {
        formatInstructions = `Hãy tạo đúng 4 bài tập (Exercise) theo đúng thứ tự các loại (type): 'slide', 'multiple_choice', 'fill_blank', 'reorder'.
1. Loại 'slide': Bài giảng Active Recall giới thiệu lý thuyết ngắn gọn cho bài học "${lessonTitle}". Đặt 'options' chứa một Câu hỏi tự kiểm tra thú vị, và 'correctAnswer' chứa Đáp án/Định nghĩa chuẩn của câu hỏi tự kiểm tra để đối chiếu.
2. Loại 'multiple_choice': Câu hỏi trắc nghiệm kiểm tra lý thuyết vừa học. Đặt 'options' chứa 4 lựa chọn, và 'correctAnswer' là lựa chọn đúng chính xác.
3. Loại 'fill_blank': Điền từ khóa chính xác vào chỗ trống (biểu thị chỗ trống bằng dấu '_'). Đặt 'correctAnswer' là từ đúng cần điền, 'options' chứa từ đúng đó cùng một số từ gây nhiễu để hiển thị thành các nút lựa chọn từ.
4. Loại 'reorder': Sắp xếp các từ xáo trộn thành câu đúng hoàn chỉnh. Đặt 'options' là mảng các từ bị xáo trộn, và 'correctAnswer' là mảng các từ theo đúng thứ tự hoàn chỉnh.`;
      }

      const systemInstruction = `Bạn là một chuyên gia thiết kế chương trình học của Duolingo và một nhà giáo dục Spaced Repetition thông thái.
Nhiệm vụ của bạn là tạo đúng 4 bài tập cực kỳ chất lượng, vui nhộn, bám sát nội dung của bài học "${lessonTitle}" (thuộc chương "${unitTitle}" trong khóa học "${courseTitle}").

Hãy biến các khái niệm phức tạp thành các bài tập dễ chịu, hài hước, mang đậm tính thực tế đời sống. Thêm vào các câu châm chọc vui tươi của cú xanh Duolingo (Mascot tên Remi).

Hãy trả về phản hồi dưới định dạng JSON mảng tiếng Việt chứa chính xác 4 đối tượng bài tập theo cấu trúc sau:
[
  {
    "id": "ex_1",
    "type": "slide | multiple_choice | fill_blank | reorder | writing_practice",
    "instruction": "Yêu cầu bài tập (ví dụ: Chọn từ phù hợp, Sắp xếp từ xáo trộn, ...)",
    "content": "Câu hỏi hoặc nội dung bài giảng",
    "options": ["Mảng các phương án lựa chọn (nếu có)"],
    "correctAnswer": "Đáp án đúng (Chuỗi chữ, hoặc Mảng các chuỗi chữ cho reorder)",
    "explanation": "Giải thích chi tiết, cung cấp thêm ví dụ thực tế thú vị hoặc mẹo nhớ từ Remi giúp người học nhớ lâu."
  },
  ...
]

Yêu cầu cực kỳ quan trọng:
1. Bạn PHẢI trả về đúng 4 bài tập theo đúng định dạng được hướng dẫn.
2. Đảm bảo trả về chuỗi JSON mảng hợp lệ 100%, không chứa bất kỳ văn bản giải thích nào khác bên ngoài khối JSON.`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Chủ đề khóa học: ${courseTopic}
Tên khóa học: ${courseTitle}
Chương học: ${unitTitle}
Bài học: ${lessonTitle}
Mô tả bài học: ${lessonDescription}

Yêu cầu định dạng:
${formatInstructions}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.8,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini không trả về kết quả sinh bài tập.');
      }

      const exerciseData = JSON.parse(responseText.trim());
      res.json(exerciseData);
    } catch (error: any) {
      console.error('Lỗi khi sinh bài tập:', error);
      res.status(500).json({ 
        error: error.message || 'Lỗi hệ thống khi thiết kế bài tập.'
      });
    }
  });

  // API route to generate writing trainer content for a template lesson
  app.post('/api/generate-writing-trainer', async (req, res) => {
    try {
      const { lessonTitle, lessonDescription } = req.body;
      if (!lessonTitle) {
        return res.status(400).json({ error: 'Tên bài học là bắt buộc!' });
      }

      const systemInstruction = `Bạn là một Chuyên gia Đào tạo Viết luận VSTEP C1 và IELTS tiên phong.
Nhiệm vụ của bạn là tạo một giáo trình huấn luyện cấu trúc/Template viết luận chất lượng cao cho bài học mang tên "${lessonTitle}" (mô tả: "${lessonDescription}").

Hãy thiết kế một Template mẫu (gồm 1-3 câu học thuật đỉnh cao, độ dài khoảng 40-80 từ) giải quyết hoàn hảo yêu cầu của bài học này. Sau đó, hãy bóc tách và phân rã Template đó thành các cấu trúc, chunk học thuật, bài tập điền khuyết, bài tập sắp xếp và các chủ đề áp dụng thực hành đúng theo cấu trúc JSON bên dưới.

Hãy trả về phản hồi dưới định dạng JSON tiếng Việt có cấu trúc chính xác sau:
{
  "templateTitle": "Tên chủ đề/mục tiêu của Template (ví dụ: Template Mở bài Tranh luận phản biện, Template Thân bài Nêu nguyên nhân)",
  "fullTemplate": "Toàn bộ chuỗi văn bản Template mẫu hoàn chỉnh (chứa các nhãn động dạng [Topic/Issue] hoặc [Argument] để người học dễ điền thay thế)",
  "chunks": [
    {
      "english": "Cụm từ tiếng Anh trích xuất từ template (khoảng 5-12 từ, liền mạch)",
      "vietnamese": "Nghĩa tiếng Việt chuẩn xác và mượt mà của cụm từ",
      "function": "Chức năng lập luận của cụm từ này trong bài viết (ví dụ: Tạo thế nhượng bộ, Liên kết nguyên nhân, Khẳng định kết quả)"
    }
  ],
  "step3Sentences": [
    {
      "sentence": "Câu hoàn chỉnh trong template",
      "level1_blanked": "Câu hoàn chỉnh bị ẩn khoảng 20% số từ chính yếu (sử dụng dấu '_', ví dụ 'While some _ argue...')",
      "level1_answers": ["mảng chứa các từ bị ẩn theo thứ tự từ trái qua phải"],
      "level2_blanked": "Câu hoàn chỉnh bị ẩn khoảng 40% số từ chính yếu (sử dụng dấu '_')",
      "level2_answers": ["mảng chứa các từ bị ẩn ở level 2"],
      "level3_blanked": "Câu hoàn chỉnh bị ẩn khoảng 60-80% số từ chính yếu (chỉ chừa lại các từ định khung rất nhỏ, sử dụng dấu '_')",
      "level3_answers": ["mảng chứa các từ bị ẩn ở level 3"]
    }
  ],
  "step4Scrambled": [
    {
      "level": 1,
      "correct": "Cú pháp câu thứ nhất trong template đầy đủ",
      "scrambled": ["mảng các từ hoặc cụm từ bị xáo trộn ngẫu nhiên của câu này"]
    },
    {
      "level": 2,
      "correct": "Cú pháp câu thứ hai trong template đầy đủ (hoặc một câu phụ trợ bổ sung trong template)",
      "scrambled": ["mảng các từ bị xáo trộn"]
    },
    {
      "level": 3,
      "correct": "Toàn bộ đoạn văn template hoàn chỉnh",
      "scrambled": ["mảng các cụm từ (chunk ngắn) hoặc từ bị xáo trộn của cả đoạn văn"]
    }
  ],
  "step6Topics": [
    {
      "topic": "Tên một chủ đề thực tế mới 1 (ví dụ: Education: Online classes vs. Traditional school)",
      "exampleUsage": "Ví dụ cụ thể khi áp dụng template này vào chủ đề mới 1",
      "prompt": "Đề bài ngắn gọn yêu cầu người học tự viết câu/đoạn văn áp dụng template vào chủ đề mới 1"
    },
    {
      "topic": "Tên một chủ đề thực tế mới 2 (ví dụ: Technology: Smartphone addiction)",
      "exampleUsage": "Ví dụ cụ thể khi áp dụng template này vào chủ đề mới 2",
      "prompt": "Đề bài ngắn gọn cho chủ đề mới 2"
    },
    {
      "topic": "Tên một chủ đề thực tế mới 3 (ví dụ: Environment: Single-use plastics)",
      "exampleUsage": "Ví dụ cụ thể khi áp dụng template này vào chủ đề mới 3",
      "prompt": "Đề bài ngắn gọn cho chủ đề mới 3"
    }
  ]
}

Lưu ý cực kỳ quan trọng:
1. Đảm bảo cấu trúc JSON hợp lệ 100%, không chứa bất kỳ ký tự dư thừa nào ngoài chuỗi JSON.
2. Các từ bị ẩn trong step3 phải ưu tiên: Từ nối học thuật (linking words), từ vựng C1/IELTS (academic vocabulary), cấu trúc cố định.
3. Không để người học nhìn thấy template đầy đủ trong các bài tập điền từ hoặc sắp xếp, mà phải ẩn giấu một cách có chủ đích.`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Đang lập giáo trình huấn luyện template viết luận cho bài học: ${lessonTitle}\nChi tiết: ${lessonDescription}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.8,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini không phản hồi khi sinh nội dung huấn luyện.');
      }

      const trainerContent = JSON.parse(responseText.trim());
      res.json(trainerContent);
    } catch (error: any) {
      console.error('Lỗi khi sinh giáo án Writing Trainer:', error);
      res.status(500).json({ 
        error: error.message || 'Lỗi hệ thống khi sinh giáo án Writing.' 
      });
    }
  });

  // API route to evaluate Step 6 Template Transformation
  app.post('/api/evaluate-transformation', async (req, res) => {
    try {
      const { topic, prompt, originalTemplate, userSubmission } = req.body;
      if (!originalTemplate || !userSubmission) {
        return res.status(400).json({ error: 'Thiếu thông tin template gốc hoặc bài viết áp dụng!' });
      }

      const systemInstruction = `Bạn là một Chuyên gia Huấn luyện Viết luận IELTS/VSTEP C1.
Học viên vừa hoàn thành học thuộc một Template viết luận và đang thực hiện bước BƯỚC 6 – TEMPLATE TRANSFORMATION (áp dụng template vào chủ đề mới).

Template gốc:
"${originalTemplate}"

Chủ đề mới:
"${topic}"

Đề bài thực hành:
"${prompt}"

Bài làm của học viên:
"${userSubmission}"

Nhiệm vụ của bạn là kiểm tra bài viết của học viên một cách kỹ lưỡng và trả về phản hồi JSON tiếng Việt có cấu trúc chính xác sau:
{
  "isValidTemplate": true/false (Học viên có áp dụng đúng cấu trúc của Template gốc hay không),
  "isNatural": true/false (Diễn đạt có tự nhiên hay không),
  "hasLinkingWords": true/false (Có sử dụng đủ và đúng các từ nối học thuật hay không),
  "isGrammarCorrect": true/false (Ngữ pháp có chuẩn xác 100% không),
  "score": "Điểm đánh giá từ 0-100 dựa trên sự thuần thục áp dụng",
  "strengths": "Điểm mạnh của bài viết áp dụng",
  "weaknesses": "Điểm yếu, lỗi sai hoặc phần chưa tự nhiên cần chỉnh sửa",
  "suggestedRewrite": "Bài mẫu viết chuẩn chỉnh nhất khi lồng chủ đề mới vào template gốc để học viên đối chiếu",
  "detailedFeedback": "Nhận xét chi tiết bám sát 4 tiêu chí chấm điểm VSTEP C1 / IELTS để giúp học viên nâng cao phản xạ viết tự động."
}
Đảm bảo trả về chuỗi JSON hợp lệ 100%, không chứa bất kỳ văn bản giải thích nào khác bên ngoài khối JSON.`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Chủ đề thực hành: ${topic}\nĐề bài: ${prompt}\nTemplate gốc: ${originalTemplate}\nBài viết của học viên: ${userSubmission}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini không phản hồi đánh giá.');
      }

      const evaluation = JSON.parse(responseText.trim());
      res.json(evaluation);
    } catch (error: any) {
      console.error('Lỗi khi chấm bài transformation:', error);
      res.status(500).json({ 
        error: error.message || 'Lỗi hệ thống khi đánh giá bài làm. Vui lòng thử lại!' 
      });
    }
  });

  // API route to evaluate writing practice essays
  app.post('/api/evaluate-writing', async (req, res) => {
    try {
      const { prompt, userSubmission } = req.body;
      if (!prompt || !userSubmission) {
        return res.status(400).json({ error: 'Đề bài và bài làm của bạn là bắt buộc!' });
      }

      const systemInstruction = `Bạn là một giám khảo VSTEP C1 / IELTS Writing chuyên nghiệp và tận tâm.
Nhiệm vụ của bạn là đánh giá chi tiết bài viết của học viên dựa trên đề bài cung cấp, sau đó chỉ ra lỗi sai ngữ pháp, gợi ý nâng cấp từ vựng, collocations, phrasal verbs, và viết lại bài văn một cách mượt mà nhất.

Hãy trả về phản hồi dưới định dạng JSON tiếng Việt có cấu trúc chính xác sau:
{
  "bandScore": "Ước lượng trình độ (ví dụ: VSTEP C1 - Xuất sắc, IELTS 7.0, B2 - Khá, v.v.)",
  "strengths": "Tóm tắt điểm mạnh nổi bật của bài viết (bố cục, ý tưởng, liên kết)",
  "weaknesses": "Điểm hạn chế cần khắc phục để đạt điểm cao hơn",
  "vocabularyFeedback": [
    {
      "original": "Cụm từ hoặc câu nguyên bản của học sinh có từ vựng đơn giản hoặc chưa hay",
      "correction": "Cụm từ đã được cải thiện với Collocation/Phrasal Verb nâng cao hơn",
      "explanation": "Giải thích tại sao từ vựng mới hay hơn và ngữ cảnh phù hợp"
    }
  ],
  "grammarFeedback": [
    {
      "original": "Câu sai ngữ pháp của học sinh",
      "correction": "Câu đã sửa đúng ngữ pháp chuẩn chỉnh",
      "explanation": "Chỉ ra lỗi ngữ pháp và quy tắc đúng"
    }
  ],
  "suggestedRewrite": "Toàn bộ bài viết đã được sửa đổi mượt mà, lưu loát, đạt chuẩn C1 nâng cao để học viên đối chiếu học tập"
}
Đảm bảo trả về chuỗi JSON hợp lệ 100%, không chứa bất kỳ lời giải thích nào khác bên ngoài khối JSON.`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `ĐỀ BÀI (PROMPT):\n${prompt}\n\nBÀI LÀM CỦA HỌC VIÊN:\n${userSubmission}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini không phản hồi đánh giá bài viết.');
      }

      const feedbackData = JSON.parse(responseText.trim());
      res.json(feedbackData);
    } catch (error: any) {
      console.error('Lỗi khi chấm bài viết:', error);
      res.status(500).json({ 
        error: error.message || 'Lỗi hệ thống khi đánh giá bài viết. Vui lòng thử lại!' 
      });
    }
  });

  // API route to evaluate pronunciation from recorded audio base64
  app.post('/api/evaluate-pronunciation', async (req, res) => {
    try {
      const { phrase, audioBase64, mimeType } = req.body;
      if (!phrase || !audioBase64) {
        return res.status(400).json({ error: 'Thiếu cụm từ cần luyện đọc hoặc file ghi âm!' });
      }

      // Prepare audio part for Gemini
      const audioPart = {
        inlineData: {
          mimeType: mimeType || 'audio/webm',
          data: audioBase64,
        },
      };

      const systemInstruction = `Bạn là một Chuyên gia Luyện phát âm Tiếng Anh bản xứ cực kỳ tận tâm và chuyên nghiệp.
Học viên đang luyện phát âm (Shadow Reading) cụm từ hoặc câu tiếng Anh sau:
"${phrase}"

Bạn vừa nhận được file ghi âm phát âm của học viên. Hãy lắng nghe thật kỹ, đánh giá và phân tích độ chính xác, ngữ điệu, trọng âm, và cách phát âm các từ cụ thể.
Trả về phản hồi bằng Tiếng Việt dưới định dạng JSON có cấu trúc chính xác sau:
{
  "score": 85, // Số điểm đánh giá tổng quan về phát âm từ 0 đến 100 (số nguyên)
  "feedback": "Nhận xét tổng quan bằng tiếng Việt ngắn gọn, khích lệ và chỉ rõ điểm cần sửa (2-3 câu).",
  "mispronouncedWords": ["các", "từ", "chưa", "chuẩn"], // Mảng chứa những từ tiếng Anh trong câu gốc học viên phát âm chưa đúng hoặc cần cải thiện. Nếu tất cả đều tốt, hãy để mảng rỗng []
  "goodWords": ["những", "từ", "đã", "chuẩn"] // Mảng chứa những từ tiếng Anh trong câu gốc học viên đã phát âm tốt, rõ ràng.
}
Đảm bảo trả về chuỗi JSON hợp lệ 100%, không chứa bất kỳ văn bản giải thích nào khác bên ngoài khối JSON.`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          audioPart,
          { text: `Hãy đánh giá bản ghi âm phát âm của tôi cho cụm từ: "${phrase}"` }
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini không phản hồi khi đánh giá phát âm.');
      }

      const evaluation = JSON.parse(responseText.trim());
      res.json(evaluation);
    } catch (error: any) {
      console.error('Lỗi khi đánh giá phát âm:', error);
      res.status(500).json({ 
        error: error.message || 'Lỗi hệ thống khi đánh giá phát âm. Vui lòng thử lại!' 
      });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Remix Server] Đang chạy tại http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Không thể khởi động server:', err);
});
