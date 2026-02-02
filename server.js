const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();

// ✅ Render / cloud ortamlarında portu platform verir
const PORT = process.env.PORT || 3001;

/* -------------------- MIDDLEWARE -------------------- */
app.use(express.json());

// ✅ Canlıda daha güvenli istersen origin kısıtla (şimdilik * açık)
app.use(
  cors({
    origin: true, // istersen: ['https://sefartdigital.com', 'https://www.sefartdigital.com']
    credentials: false,
  })
);

/* -------------------- FILE UPLOAD -------------------- */
// ✅ CV'yi mail eki yapacağımız için memoryStorage en pratik yöntem
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

/* -------------------- SMTP CONFIG -------------------- */
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: false, // 587 için false
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

/* -------------------- TEST SMTP -------------------- */
transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP bağlantı hatası:', error);
  } else {
    console.log('✅ SMTP hazır');
  }
});

/* -------------------- HEALTH CHECK (opsiyonel) -------------------- */
// Render / uptime kontrolü için
app.get('/', (req, res) => {
  res.send('Backend çalışıyor 🚀');
});

/* -------------------- FORM ENDPOINT -------------------- */
app.post('/api/kariyer', upload.single('cv'), async (req, res) => {
  try {
    const data = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'CV dosyası yok',
      });
    }

    // Basit zorunlu alan kontrolü (istersen genişletiriz)
    if (!data.name || !data.email || !data.phone || !data.position) {
      return res.status(400).json({
        success: false,
        message: 'Zorunlu alanlar eksik',
      });
    }

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
    `;

    await transporter.sendMail({
  from: `"sefArt Kariyer" <${process.env.MAIL_FROM}>`,
  to: process.env.MAIL_TO,
  subject: `Yeni Kariyer Başvurusu — ${data.name}`,
  text: mailContent,
  attachments: [
    {
      filename: file.originalname,
      content: file.buffer
    }
  ]
});

    return res.json({ success: true });
  } catch (err) {
    // multer fileFilter error vs.
    const message =
      err && err.message ? err.message : 'Mail gönderim hatası';

    console.error('❌ Mail gönderim hatası:', err);

    return res.status(500).json({
      success: false,
      message,
    });
  }
});

/* -------------------- SERVER START -------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Backend çalışıyor. Port: ${PORT}`);
});
