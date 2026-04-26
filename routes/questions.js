const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAdmin(req, res, next) {
  if (req.session.role !== 'admin') return res.status(401).json({ success: false, message: 'Unauthorized.' });
  next();
}

// GET /api/questions/:quiz_id
router.get('/:quiz_id', (req, res) => {
  const isAdmin = req.session.role === 'admin';
  const sql = isAdmin
    ? 'SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC'
    : 'SELECT id, quiz_id, question_text, option_a, option_b, option_c, option_d FROM questions WHERE quiz_id = ? ORDER BY id ASC';
  const questions = db.all(sql, [req.params.quiz_id]);
  res.json({ success: true, questions });
});

// POST /api/questions/add
router.post('/add', requireAdmin, (req, res) => {
  const { quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option } = req.body;
  if (!quiz_id || !question_text || !option_a || !option_b || !option_c || !option_d || !correct_option)
    return res.json({ success: false, message: 'All fields required.' });
  if (!['a','b','c','d'].includes(correct_option.toLowerCase()))
    return res.json({ success: false, message: 'correct_option must be a, b, c, or d.' });
  const result = db.run(
    'INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option.toLowerCase()]
  );
  res.json({ success: true, message: 'Question added.', question_id: result.lastInsertRowid });
});

// DELETE /api/questions/delete/:id
router.delete('/delete/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM questions WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Question deleted.' });
});

module.exports = router;
