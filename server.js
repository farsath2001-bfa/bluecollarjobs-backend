const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();
app.set('trust proxy', 1); // Render / Vercel sit behind a proxy (needed for rate limiting)

// ---- CORS: allow the frontends listed in CLIENT_URLS ----
const allowedOrigins = (process.env.CLIENT_URLS || 'http://localhost:5173,https://bluecollarjobs-frontend.vercel.app')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow tools with no Origin (curl, Postman) and Vercel preview URLs of this project
      if (!origin || allowedOrigins.includes(origin) || /^https:\/\/bluecollarjobs-frontend[\w-]*\.vercel\.app$/.test(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Routes ----
app.get('/api', (req, res) => res.json({ message: 'Jobz Dxb API is running', version: '2.0.0' }));
app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/company', require('./routes/companyRoutes')); // old path, kept for compatibility
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/saved', require('./routes/savedJobRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

app.use(notFound);
app.use(errorHandler);

// ---- Start ----
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}/api`));
});

module.exports = app;
