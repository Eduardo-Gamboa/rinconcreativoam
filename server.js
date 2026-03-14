/**
 * server.js — Rincón Creativo AM
 * Backend Express: auth JWT, CRUD productos, upload de imágenes.
 * Persistencia: SQLite via better-sqlite3
 *
 * Inicio:  node server.js
 */

'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');

const app  = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'rcam-jwt-secret-cambiar-en-produccion';

// ─── Rutas de datos ───────────────────────────────────────────────────────────
// En Railway: montar Volume en /app/data y definir DATA_DIR=/app/data
// Las imágenes subidas también se guardan en DATA_DIR/productos/
const DATA_DIR   = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'productos');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname));

// Servir imágenes subidas desde el volumen persistente
app.use('/assets/productos', express.static(UPLOAD_DIR));

// ─── Multer: almacenamiento de imágenes ──────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file,  cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Formato no permitido. Use JPG, PNG o WebP.'));
  }
});

// ─── Helper sanitize ─────────────────────────────────────────────────────────
const sanitize = (str) => String(str ?? '').trim().replace(/[<>"']/g, '');

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ─── Base de datos ────────────────────────────────────────────────────────────
let db;

function openDB() {
  db = new Database(path.join(DATA_DIR, 'rcam.db'));
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email    TEXT PRIMARY KEY,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      image       TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      category    TEXT NOT NULL,
      uses        TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS categories (
      name TEXT PRIMARY KEY
    );
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS DE AUTENTICACIÓN
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(String(email));

    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(String(password), user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS PÚBLICAS
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/products', (_req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM products').all());
  } catch {
    res.json([]);
  }
});

app.get('/api/categories', (_req, res) => {
  try {
    res.json(db.prepare('SELECT name FROM categories').all().map(r => r.name));
  } catch {
    res.json([]);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS PROTEGIDAS
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/products', requireAuth, upload.single('image'), (req, res) => {
  const { title, description, category, uses } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Título, descripción y categoría son obligatorios' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'La imagen es obligatoria' });
  }

  try {
    const newProduct = {
      id:          uuidv4(),
      image:       `assets/productos/${req.file.filename}`,
      title:       sanitize(title),
      description: sanitize(description),
      category:    sanitize(category),
      uses:        sanitize(uses || '')
    };

    db.prepare(`
      INSERT INTO products (id, image, title, description, category, uses)
      VALUES (@id, @image, @title, @description, @category, @uses)
    `).run(newProduct);

    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Create error:', err.message);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

app.put('/api/products/:id', requireAuth, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { title, description, category, uses } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Título, descripción y categoría son obligatorios' });
  }

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    if (req.file) {
      if (product.image.startsWith('assets/productos/')) {
        const oldPath = path.join(DATA_DIR, 'productos', path.basename(product.image));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      product.image = `assets/productos/${req.file.filename}`;
    }

    const updated = {
      id,
      image:       product.image,
      title:       sanitize(title),
      description: sanitize(description),
      category:    sanitize(category),
      uses:        sanitize(uses ?? product.uses ?? '')
    };

    db.prepare(`
      UPDATE products SET image=@image, title=@title, description=@description,
      category=@category, uses=@uses WHERE id=@id
    `).run(updated);

    res.json(updated);
  } catch (err) {
    console.error('Update error:', err.message);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    if (product.image.startsWith('assets/productos/')) {
      const imgPath = path.join(DATA_DIR, 'productos', path.basename(product.image));
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

// ─── Manejo de errores de Multer ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'La imagen no debe superar 5 MB' });
  }
  res.status(400).json({ error: err.message });
});

// ─── Inicialización ───────────────────────────────────────────────────────────
async function initData() {
  fs.mkdirSync(DATA_DIR,   { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  openDB();

  // Crear usuarios desde variables de entorno si la tabla está vacía
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const adminEmail    = process.env.ADMIN_EMAIL || 'america@rinconcreativo.com';
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('ERROR: define la variable de entorno ADMIN_PASSWORD.');
      process.exit(1);
    }

    const insert = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
    insert.run(adminEmail, await bcrypt.hash(adminPassword, 10));
    console.log(`Usuario creado: ${adminEmail}`);

    const admin2Email    = process.env.ADMIN2_EMAIL;
    const admin2Password = process.env.ADMIN2_PASSWORD;
    if (admin2Email && admin2Password) {
      insert.run(admin2Email, await bcrypt.hash(admin2Password, 10));
      console.log(`Usuario creado: ${admin2Email}`);
    }
  }

  // Insertar categorías por defecto si la tabla está vacía
  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (catCount === 0) {
    const defaults = ['Vasos y Termos', 'Fofuchas', 'Libretas', 'Letras LED', 'Cake Toppers'];
    const insertCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
    defaults.forEach(name => insertCat.run(name));
  }
}

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
initData().then(() => {
  app.listen(PORT, () => {
    console.log(`\nRincón Creativo AM — Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Panel admin: http://localhost:${PORT}/admin/admin.html\n`);
  });
});
