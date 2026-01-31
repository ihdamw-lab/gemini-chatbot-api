import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_MODEL = 'gemini-3-flash-preview'; 


const SYSTEM_INSTRUCTION = "Anda adalah asisten AI yang cerdas untuk OjekQu. Tolong jawab semua pertanyaan, deskripsikan gambar, buat ringkasan dokumen, dan transkrip audio hanya dalam Bahasa Indonesia yang baik dan benar.";

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });

/**
 * Fungsi Inti untuk Generative AI (Multimodal)
 */
async function runAI(prompt, file, res) {
    try {
        const model = ai.getGenerativeModel({ 
            model: GEMINI_MODEL,
            systemInstruction: SYSTEM_INSTRUCTION, 
            generationConfig: {
                temperature: 0.9,
            }
        });

        
        const parts = [{ text: prompt }];

        
        if (file) {
            parts.push({
                inlineData: {
                    data: file.buffer.toString('base64'),
                    mimeType: file.mimetype
                }
            });
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        
        res.status(200).json({ result: response.text() });

    } catch (error) {
        console.error("AI Error:", error.message);
        if (error.message.includes('429')) {
            return res.status(429).json({ 
                message: "Kuota API Gratis Habis", 
                detail: "Limit menit/harian Anda sudah habis. Silakan tunggu sebentar." 
            });
        }
        res.status(500).json({ message: "Gagal memproses AI", detail: error.message });
    }
}

/**
 * ENDPOINTS
 */

// Endpoint untuk Gambar
app.post('/api/generate-from-image', upload.single('image'), (req, res) => {
    // Logika: Gunakan prompt dari user, jika kosong baru gunakan default
    const userPrompt = req.body.prompt && req.body.prompt.trim() !== "" 
                       ? req.body.prompt 
                       : "Tolong jelaskan gambar ini secara detail.";
    runAI(userPrompt, req.file, res);
});

// Endpoint untuk Dokumen
app.post('/api/generate-from-document', upload.single('document'), (req, res) => {
    const userPrompt = req.body.prompt && req.body.prompt.trim() !== "" 
                       ? req.body.prompt 
                       : "Tolong buatkan ringkasan singkat dari dokumen ini.";
    runAI(userPrompt, req.file, res);
});

// Endpoint untuk Audio
app.post('/api/generate-from-audio', upload.single('audio'), (req, res) => {
    const userPrompt = req.body.prompt && req.body.prompt.trim() !== "" 
                       ? req.body.prompt 
                       : "Tolong buatkan transkrip dan ringkas isi audio ini.";
    runAI(userPrompt, req.file, res);
});

// Endpoint untuk Chat Teks Biasa
app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;
    try {
        const model = ai.getGenerativeModel({ 
            model: GEMINI_MODEL,
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: {
                temperature: 0.9,
            } 
        });

        const formatted = conversation.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        const result = await model.generateContent({ contents: formatted });
        res.json({ result: result.response.text() });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT} using ${GEMINI_MODEL}`));