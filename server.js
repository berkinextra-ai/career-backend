const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');

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

/* -------------------- SMTP (BREVO) -------------------- */
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.MAIL_PORT || 587),
    secure: false, // 587 -> false
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    // Cloud ortamlarında daha stabil olsun
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
  });
}

/* -------------------- OPTIONAL ENV DEBUG -------------------- */
console.log('ENV CHECK:', {
  MAIL_HOST: !!process.env.MAIL_HOST,
  MAIL_PORT: !!process.env.MAIL_PORT,
  MAIL_USER: !!process.env.MAIL_USER,
  MAIL_PASS: !!process.env.MAIL_PASS,
  MAIL_FROM: !!process.env.MAIL_FROM,
  MAIL_TO: !!process.env.MAIL_TO,
});

/* -------------------- FORM ENDPOINT -------------------- */
app.post('/api/kariyer', upload.single('cv'), async (req, res) => {
  try {
    const data = req.body;
    const file = req.file;

    // Zorunlu alanlar (minimum)
    if (!data?.name || !data?.email || !data?.phone || !data?.position) {
      return res.status(400).json({
        success: false,
        message: 'Zorunlu alanlar eksik (name/email/phone/position).',
      });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: 'CV dosyası yok.' });
    }

    // Env zorunluları
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      return res.status(500).json({
        success: false,
        message: 'MAIL_USER / MAIL_PASS tanımlı değil (Railway Variables kontrol et).',
      });
    }

    const transporter = getTransporter();

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

    const fromEmail = process.env.MAIL_FROM || process.env.MAIL_USER;
    const toEmail = process.env.MAIL_TO || 'info@sefartdigital.com';

    await transporter.sendMail({
      from: `"sefArt Kariyer" <${fromEmail}>`,
      to: toEmail,
      subject: `Yeni Kariyer Başvurusu — ${data.name}`,
      text: mailContent,
      attachments: [
        {
          filename: file.originalname,
          content: file.buffer,
        },
      ],
    });

    return res.json({ success: true });
  } catch (err) {
    // Multer fileFilter hatası da buraya düşebilir
    const msg = err?.message ? err.message : 'Mail gönderim hatası';
    console.error('❌ Mail gönderim hatası:', err);

    return res.status(500).json({ success: false, message: msg });
  }
});

/* -------------------- SERVER START -------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Backend çalışıyor. Port: ${PORT}`);
});
