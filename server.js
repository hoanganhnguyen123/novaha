const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
//   ADMIN CONFIG
// ======================
const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";
const ADMIN_TOKEN = "NOVAHASECRETKEY123";

// ======================
//   MIDDLEWARE
// ======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================
//   STATIC FILES
// ======================
// Cho phép load file CSS, JS, HTML từ root
app.use(express.static(__dirname));

// Nếu bạn để asset trong /public thì load từ đây
app.use('/static', express.static(path.join(__dirname, 'public')));

// Uploads (CV sinh viên)
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
app.use('/uploads', express.static(UPLOADS));


// ======================
//   DATA FOLDER
// ======================
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
if (!fs.existsSync(STUDENTS_FILE)) fs.writeFileSync(STUDENTS_FILE, '[]');

// ======================
//   FILE UPLOAD
// ======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2);
    cb(null, unique + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });


// ======================
//   PUBLIC API (Sinh viên)
// ======================
app.get('/api/students', (req, res) => {
  const data = JSON.parse(fs.readFileSync(STUDENTS_FILE));
  res.json(data);
});

app.post('/api/students', upload.single('cv'), (req, res) => {
  try {
    const body = req.body;
    const file = req.file;

    const students = JSON.parse(fs.readFileSync(STUDENTS_FILE));

    const newStudent = {
      id: Date.now().toString(),
      name: body.name || '',
      email: body.email || '',
      phone: body.phone || '',
      university: body.university || '',
      skills: (body.skills || '').split(',').map(s => s.trim()).filter(Boolean),
      bio: body.bio || '',
      cv: file ? ('/uploads/' + path.basename(file.path)) : null,
      createdAt: new Date().toISOString()
    };

    students.unshift(newStudent);
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2));

    res.json({ ok: true, student: newStudent });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});


// ======================
//   ADMIN LOGIN
// ======================
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ ok: true, token: ADMIN_TOKEN });
  }
  res.json({ ok: false });
});


// ======================
//   ADMIN AUTH
// ======================
function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token === ADMIN_TOKEN) return next();
  return res.status(401).send("UNAUTHORIZED");
}


// ======================
//   ADMIN PROTECTED API
// ======================
app.get('/api/admin/students', adminAuth, (req, res) => {
  const data = JSON.parse(fs.readFileSync(STUDENTS_FILE));
  res.json(data);
});


// ======================
//   FRONTEND ROUTES
// ======================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'student.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});


// Fix Chrome DevTools annoying request
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.json({ status: "ok" });
});


// ======================
//   START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`NovaHA TalentHub running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}`);
});
