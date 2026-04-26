const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAdmin(req, res, next) {
  if (req.session.role !== 'admin') return res.status(401).json({ success: false, message: 'Unauthorized.' });
  next();
}

// GET /api/quizzes
router.get('/', (req, res) => {
  const quizzes = db.all(`
    SELECT q.id, q.title, q.subject, q.duration_mins, q.created_at,
           COUNT(qu.id) as question_count
    FROM quizzes q
    LEFT JOIN questions qu ON q.id = qu.quiz_id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `);
  res.json({ success: true, quizzes });
});

// GET /api/quizzes/stats
router.get('/stats', requireAdmin, (req, res) => {
  const totalQuizzes = db.get('SELECT COUNT(*) as count FROM quizzes').count;
  const totalStudents = db.get('SELECT COUNT(*) as count FROM students').count;
  const totalAttempts = db.get('SELECT COUNT(*) as count FROM results').count;
  res.json({ success: true, totalQuizzes, totalStudents, totalAttempts });
});

// POST /api/quizzes/add
router.post('/add', requireAdmin, (req, res) => {
  const { title, subject, duration_mins } = req.body;
  if (!title || !subject || !duration_mins) return res.json({ success: false, message: 'All fields required.' });
  const result = db.run('INSERT INTO quizzes (title, subject, duration_mins) VALUES (?, ?, ?)', [title, subject, parseInt(duration_mins)]);
  res.json({ success: true, message: 'Quiz created.', quiz_id: result.lastInsertRowid });
});

// DELETE /api/quizzes/delete/:id
router.delete('/delete/:id', requireAdmin, (req, res) => {
  // Delete questions first (no CASCADE in sql.js)
  db.run('DELETE FROM questions WHERE quiz_id = ?', [req.params.id]);
  db.run('DELETE FROM quizzes WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Quiz deleted.' });
});

module.exports = router;
