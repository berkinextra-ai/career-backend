const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();

// ✅ Railway/Cloud portu buradan verir
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ✅ CV'yi bellekten ek olarak göndereceğiz
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ✅ ENV kontrol (log için)
console.log('ENV CHECK:', {
  MAIL_HOST: !!process.env.MAIL_HOST,
  MAIL_PORT: !!process.env.MAIL_PORT,
  MAIL_USER: !!process.env.MAIL_USER,
  MAIL_PASS: !!process.env.MAIL_PASS,
  MAIL_FROM: !!process.env.MAIL_FROM,
  MAIL_TO: !!process.env.MAIL_TO,
});

// ✅ Brevo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.MAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// ✅ SMTP test (uygulamayı düşürmez)
transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP bağlantı hatası:', error.message || error);
  } else {
    console.log('✅ SMTP hazır');
  }
});

// ✅ Health check
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

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
      from: `"sefArt Kariyer" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
      to: process.env.MAIL_TO || 'info@sefartdigital.com',
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
    console.error('❌ Mail gönderim hatası:', err);
    return res.status(500).json({ success: false, message: err.message || 'Mail gönderilemedi' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend çalışıyor. Port: ${PORT}`);
});
