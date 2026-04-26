const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'exam_portal_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.redirect('/student-login.html'));

// Initialize DB then mount routes
initDb().then(() => {
  const authRoutes = require('./routes/auth');
  const quizzesRoutes = require('./routes/quizzes');
  const questionsRoutes = require('./routes/questions');
  const resultsRoutes = require('./routes/results');

  app.use('/api/auth', authRoutes);
  app.use('/api/quizzes', quizzesRoutes);
  app.use('/api/questions', questionsRoutes);
  app.use('/api/results', resultsRoutes);

  app.listen(PORT, () => {
    console.log(`\n🚀 Exam Portal running at http://localhost:${PORT}`);
    console.log(`📚 Admin Login:   http://localhost:${PORT}/admin-login.html`);
    console.log(`🎓 Student Login: http://localhost:${PORT}/student-login.html\n`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});
