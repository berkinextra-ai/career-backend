const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors());
app.use(express.json());

/* -------------------- HEALTH CHECK -------------------- */
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

/* -------------------- FILE UPLOAD -------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Sadece PDF/DOC/DOCX kabul edilir.'));
    }
    cb(null, true);
  },
});

/* -------------------- ENV DEBUG (SAFE) -------------------- */
console.log('ENV CHECK:', {
  BREVO_API_KEY: !!process.env.BREVO_API_KEY,
  MAIL_FROM: !!process.env.MAIL_FROM,
  MAIL_TO: !!process.env.MAIL_TO,
});

/* -------------------- FORM ENDPOINT -------------------- */
app.post('/api/kariyer', upload.single('cv'), async (req, res) => {
  try {
    const data = req.body;
    const file = req.file;

    // Minimum zorunlu alanlar
    if (!data?.name || !data?.email || !data?.phone || !data?.position) {
      return res.status(400).json({
        success: false,
        message: 'Zorunlu alanlar eksik (name/email/phone/position).',
      });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: 'CV dosyası yok.' });
    }

    // Brevo API zorunluları
    if (!process.env.BREVO_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'BREVO_API_KEY eksik (Railway Variables kontrol et).',
      });
    }

    const fromEmail = process.env.MAIL_FROM;
    const toEmail = process.env.MAIL_TO || 'info@sefartdigital.com';

    if (!fromEmail) {
      return res.status(500).json({
        success: false,
        message: 'MAIL_FROM eksik (Brevo’da doğrulanmış gönderen gir).',
      });
    }

    // Mail metni
    const mailContent = `
Yeni Kariyer Başvurusu

Ad Soyad: ${data.name}
E-Posta: ${data.email}
Telefon: ${data.phone}
Pozisyon: ${data.position}

Son Teknolojiler:
${data.recentTech || '-'}

İş Akışı:
${data.workflow || '-'}

Gurur Duyulan Proje:
${data.proudProject || '-'}

Cevap 1:
${data.dynamicAnswer1 || '-'}

Cevap 2:
${data.dynamicAnswer2 || '-'}
    `.trim();

    // CV’yi base64 ek yapıyoruz
    const attachmentBase64 = file.buffer.toString('base64');

    // Brevo API ile mail gönder
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'sefArt Kariyer', email: fromEmail },
        to: [{ email: toEmail }],
        subject: `Yeni Kariyer Başvurusu — ${data.name}`,
        textContent: mailContent,
        attachment: [
          {
            name: file.originalname,
            content: attachmentBase64,
          },
        ],
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        timeout: 30000,
      }
    );

    return res.json({ success: true });
  } catch (err) {
    // Brevo API hata mesajını yakala
    const status = err?.response?.status;
    const apiMsg =
      err?.response?.data?.message ||
      err?.response?.data ||
      err?.message ||
      'Mail gönderim hatası';

    console.error('❌ Brevo mail gönderim hatası:', status, apiMsg);

    return res.status(500).json({
      success: false,
      message: typeof apiMsg === 'string' ? apiMsg : JSON.stringify(apiMsg),
    });
  }
});

/* -------------------- SERVER START -------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Backend çalışıyor. Port: ${PORT}`);
});
