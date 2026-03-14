/**
 * server.js — Rincón Creativo AM
 * Backend Express: auth JWT, CRUD productos, upload de imágenes.
 *
 * Inicio:  node server.js
 * Setup:   node setup.js   (crea usuario admin la primera vez)
 */

'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3000;

// Cambia este secreto en producción (usa variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'rcam-jwt-secret-cambiar-en-produccion';

// ─── Rutas de datos ───────────────────────────────────────────────────────────
// En Railway, montar un Volume en /app/persistent y apuntar DATA_DIR y UPLOAD_DIR ahí.
// Localmente usa las rutas por defecto.
const DATA_DIR   = process.env.DATA_DIR   || path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'assets', 'productos');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname)); // sirve todo el sitio como archivos estáticos

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Formato no permitido. Use JPG, PNG o WebP.'));
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const readJSON  = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
const writeJSON = (file, data) =>
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8');

/** Elimina etiquetas HTML básicas para prevenir XSS */
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

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS DE AUTENTICACIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Respuesta: { token }
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const users = readJSON('users.json');
    const user  = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());

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
// RUTAS PÚBLICAS (sin autenticación)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/products — lista todos los productos */
app.get('/api/products', (_req, res) => {
  try {
    res.json(readJSON('products.json'));
  } catch {
    res.json([]);
  }
});

/** GET /api/categories — lista las categorías */
app.get('/api/categories', (_req, res) => {
  try {
    res.json(readJSON('categories.json'));
  } catch {
    res.json([]);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS PROTEGIDAS (requieren JWT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/products — crear producto
 * Form-data: image (file), title, description, category, uses
 */
app.post('/api/products', requireAuth, upload.single('image'), (req, res) => {
  const { title, description, category, uses } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Título, descripción y categoría son obligatorios' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'La imagen es obligatoria' });
  }

  try {
    const products   = readJSON('products.json');
    const newProduct = {
      id:          uuidv4(),
      image:       `assets/productos/${req.file.filename}`,
      title:       sanitize(title),
      description: sanitize(description),
      category:    sanitize(category),
      uses:        sanitize(uses || '')
    };
    products.push(newProduct);
    writeJSON('products.json', products);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Create error:', err.message);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

/**
 * PUT /api/products/:id — actualizar producto
 * Form-data: title, description, category, uses, image? (opcional)
 */
app.put('/api/products/:id', requireAuth, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { title, description, category, uses } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Título, descripción y categoría son obligatorios' });
  }

  try {
    const products = readJSON('products.json');
    const idx      = products.findIndex(p => p.id === id);

    if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

    // Si se subió nueva imagen, borrar la anterior (solo si es de assets/productos/)
    if (req.file) {
      const oldImage = products[idx].image;
      if (oldImage.startsWith('assets/productos/')) {
        const oldPath = path.join(__dirname, oldImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      products[idx].image = `assets/productos/${req.file.filename}`;
    }

    products[idx] = {
      ...products[idx],
      title:       sanitize(title),
      description: sanitize(description),
      category:    sanitize(category),
      uses:        sanitize(uses ?? products[idx].uses ?? '')
    };

    writeJSON('products.json', products);
    res.json(products[idx]);
  } catch (err) {
    console.error('Update error:', err.message);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
});

/**
 * DELETE /api/products/:id — eliminar producto
 */
app.delete('/api/products/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    let products = readJSON('products.json');
    const idx    = products.findIndex(p => p.id === id);

    if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

    // Borrar imagen si es de assets/productos/
    const image = products[idx].image;
    if (image.startsWith('assets/productos/')) {
      const imgPath = path.join(__dirname, image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    products.splice(idx, 1);
    writeJSON('products.json', products);
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

// ─── Inicialización de datos ──────────────────────────────────────────────────
async function initData() {
  // Crear directorios si no existen
  fs.mkdirSync(DATA_DIR,   { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // Auto-crear users.json desde variables de entorno si no existe o es placeholder
  const usersFile = path.join(DATA_DIR, 'users.json');
  const needsInit = !fs.existsSync(usersFile) ||
    fs.readFileSync(usersFile, 'utf-8').includes('npm run setup');

  if (needsInit) {
    const adminEmail    = process.env.ADMIN_EMAIL || 'america@rinconcreativo.com';
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('ERROR: define la variable de entorno ADMIN_PASSWORD para crear el usuario admin.');
      process.exit(1);
    }

    const users = [];
    users.push({ email: adminEmail, password: await bcrypt.hash(adminPassword, 10) });
    console.log(`Usuario creado: ${adminEmail}`);

    const admin2Email    = process.env.ADMIN2_EMAIL;
    const admin2Password = process.env.ADMIN2_PASSWORD;
    if (admin2Email && admin2Password) {
      users.push({ email: admin2Email, password: await bcrypt.hash(admin2Password, 10) });
      console.log(`Usuario creado: ${admin2Email}`);
    }

    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  }

  // Crear products.json vacío si no existe
  const productsFile = path.join(DATA_DIR, 'products.json');
  if (!fs.existsSync(productsFile)) {
    fs.writeFileSync(productsFile, '[]');
  }

  // Crear categories.json si no existe
  const categoriesFile = path.join(DATA_DIR, 'categories.json');
  if (!fs.existsSync(categoriesFile)) {
    const defaults = ['Vasos y Termos', 'Fofuchas', 'Libretas', 'Letras LED', 'Cake Toppers'];
    fs.writeFileSync(categoriesFile, JSON.stringify(defaults, null, 2));
  }
}

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
initData().then(() => {
  app.listen(PORT, () => {
    console.log(`\nRincón Creativo AM — Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Panel admin: http://localhost:${PORT}/admin/admin.html\n`);
  });
});
