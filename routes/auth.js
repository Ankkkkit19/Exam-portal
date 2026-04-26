const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

router.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: 'All fields required.' });
  const admin = db.get('SELECT * FROM admins WHERE username = ?', [username]);
  if (!admin) return res.json({ success: false, message: 'Invalid credentials.' });
  if (!bcrypt.compareSync(password, admin.password)) return res.json({ success: false, message: 'Invalid credentials.' });
  req.session.admin_id = admin.id;
  req.session.role = 'admin';
  res.json({ success: true });
});

router.post('/student-login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ success: false, message: 'All fields required.' });
  const student = db.get('SELECT * FROM students WHERE email = ?', [email]);
  if (!student) return res.json({ success: false, message: 'No account found with this email.' });
  if (!bcrypt.compareSync(password, student.password)) return res.json({ success: false, message: 'Incorrect password.' });
  req.session.student_id = student.id;
  req.session.student_name = student.name;
  req.session.role = 'student';
  res.json({ success: true, student: { id: student.id, name: student.name } });
});

router.post('/student-register', (req, res) => {
  const { name, email, password, roll_no } = req.body;
  if (!name || !email || !password || !roll_no) return res.json({ success: false, message: 'All fields are required.' });
  if (db.get('SELECT id FROM students WHERE email = ?', [email])) return res.json({ success: false, message: 'Email already registered.' });
  if (db.get('SELECT id FROM students WHERE roll_no = ?', [roll_no])) return res.json({ success: false, message: 'Roll number already registered.' });
  const hashed = bcrypt.hashSync(password, 10);
  const result = db.run('INSERT INTO students (name, email, password, roll_no) VALUES (?, ?, ?, ?)', [name, email, hashed, roll_no]);
  req.session.student_id = result.lastInsertRowid;
  req.session.student_name = name;
  req.session.role = 'student';
  res.json({ success: true });
});

router.get('/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

router.get('/check-session', (req, res) => {
  if (req.session.role === 'admin') return res.json({ loggedIn: true, role: 'admin' });
  if (req.session.role === 'student') return res.json({ loggedIn: true, role: 'student', student_id: req.session.student_id, student_name: req.session.student_name });
  res.json({ loggedIn: false });
});

module.exports = router;
