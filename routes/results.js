const express = require('express');
const router = express.Router();
const db = require('../db');

function requireStudent(req, res, next) {
  if (req.session.role !== 'student') return res.status(401).json({ success: false, message: 'Unauthorized.' });
  next();
}
function requireAdmin(req, res, next) {
  if (req.session.role !== 'admin') return res.status(401).json({ success: false, message: 'Unauthorized.' });
  next();
}

// POST /api/results/submit
router.post('/submit', requireStudent, (req, res) => {
  const { quiz_id, answers } = req.body;
  if (!quiz_id || !answers) return res.json({ success: false, message: 'quiz_id and answers are required.' });

  const student_id = req.session.student_id;

  // Check already attempted
  if (db.get('SELECT id FROM results WHERE student_id = ? AND quiz_id = ?', [student_id, quiz_id])) {
    return res.json({ success: false, message: 'You have already attempted this quiz.' });
  }

  const questions = db.all('SELECT id, correct_option FROM questions WHERE quiz_id = ?', [quiz_id]);
  if (!questions.length) return res.json({ success: false, message: 'No questions found for this quiz.' });

  let score = 0;
  const total = questions.length;
  questions.forEach(q => {
    const ans = answers[q.id];
    if (ans && ans.toLowerCase() === q.correct_option) score++;
  });

  db.run('INSERT INTO results (student_id, quiz_id, score, total) VALUES (?, ?, ?, ?)', [student_id, quiz_id, score, total]);

  const percentage = Math.round((score / total) * 100);
  res.json({ success: true, score, total, percentage, passed: percentage >= 60 });
});

// GET /api/results/student/:student_id
router.get('/student/:student_id', requireStudent, (req, res) => {
  if (parseInt(req.params.student_id) !== req.session.student_id)
    return res.status(403).json({ success: false, message: 'Forbidden.' });

  const results = db.all(`
    SELECT r.id, r.quiz_id, r.score, r.total, r.attempted_at,
           q.title as quiz_title, q.subject
    FROM results r
    JOIN quizzes q ON r.quiz_id = q.id
    WHERE r.student_id = ?
    ORDER BY r.attempted_at DESC
  `, [req.params.student_id]);
  res.json({ success: true, results });
});

// GET /api/results/all
router.get('/all', requireAdmin, (req, res) => {
  const results = db.all(`
    SELECT r.id, s.name as student_name, s.roll_no, q.title as quiz_title,
           r.score, r.total, r.attempted_at
    FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN quizzes q ON r.quiz_id = q.id
    ORDER BY r.attempted_at DESC
  `);
  res.json({ success: true, results });
});

module.exports = router;
