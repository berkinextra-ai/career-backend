const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3001;

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors());
app.use(express.json());

/* -------------------- FILE UPLOAD -------------------- */
const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

/* -------------------- SMTP CONFIG -------------------- */
const transporter = nodemailer.createTransport({
  host: 'srvc63.trwww.com',
  port: 465,
  secure: true,
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

/* -------------------- FORM ENDPOINT -------------------- */
app.post('/api/kariyer', upload.single('cv'), async (req, res) => {
  try {
    const data = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'CV dosyası yok' });
    }

    const mailContent = `
Yeni Kariyer Başvurusu

Ad Soyad: ${data.name}
E-Posta: ${data.email}
Telefon: ${data.phone}
Pozisyon: ${data.position}

Son Teknolojiler:
${data.recentTech}

İş Akışı:
${data.workflow}

Gurur Duyulan Proje:
${data.proudProject}

Cevap 1:
${data.dynamicAnswer1}

Cevap 2:
${data.dynamicAnswer2}
    `;

    await transporter.sendMail({
      from: `"sefArt Kariyer" <kariyer@sefartdigital.com>`,
      to: 'info@sefartdigital.com',
      subject: `Yeni Kariyer Başvurusu — ${data.name}`,
      text: mailContent,
      attachments: [
        {
          filename: file.originalname,
          content: file.buffer
        }
      ]
    });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Mail gönderim hatası:', err);
    res.status(500).json({ success: false });
  }
});

/* -------------------- SERVER START -------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Backend çalışıyor: http://localhost:${PORT}`);
});
