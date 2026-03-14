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

  // Insertar productos iniciales si la tabla está vacía
  const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (prodCount === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products (id, image, title, description, category, uses)
      VALUES (@id, @image, @title, @description, @category, @uses)
    `);
    const seedProducts = [
      { id: 'p001', image: 'Ex-proyecto/img/vasos_oersinalizados.jpg',   title: 'Vasos Infantiles Personalizados',    description: 'Vasos con tapa ideales para los peques, con nombre, personaje y colores que más les gusten.',                         category: 'Vasos y Termos',  uses: 'Fiestas infantiles, cumpleaños, uso diario, regalo para niños' },
      { id: 'p002', image: 'Ex-proyecto/img/vasopersonalizado.jpg',       title: 'Vasos con Diseño Exclusivo',         description: 'Vasos personalizados con diseños únicos y exclusivos. Perfectos para hacerlos completamente tuyos.',               category: 'Vasos y Termos',  uses: 'Bodas, XV años, recuerdos especiales, eventos formales' },
      { id: 'p003', image: 'Ex-proyecto/img/vasos_persn.jpg',             title: 'Vasos para Niños y Niñas',           description: 'Vasos coloridos con los personajes y temas favoritos de los más chicos del hogar.',                                category: 'Vasos y Termos',  uses: 'Fiestas infantiles, cumpleaños, regalo escolar, lunch' },
      { id: 'p004', image: 'Ex-proyecto/img/termo_personalizado.jpg',     title: 'Termos Personalizados',              description: 'Termos resistentes decorados con tu diseño, nombre y paleta de colores favorita.',                                 category: 'Vasos y Termos',  uses: 'Uso diario, regalo ejecutivo, recuerdo de evento, graduaciones' },
      { id: 'p005', image: 'Ex-proyecto/img/vasos_bodacivil.jpg',         title: 'Vasos para Bodas y Eventos',         description: 'Vasos elegantes y personalizados para boda civil y eventos especiales. Incluye nombres y fecha.',                  category: 'Vasos y Termos',  uses: 'Bodas civiles, bodas religiosas, aniversarios, eventos formales' },
      { id: 'p006', image: 'Ex-proyecto/img/vasos_boda.jpg',              title: 'Recuerdos Completos para Bodas',     description: 'Sets completos de recuerdos personalizados con los nombres de los novios y la fecha del gran día.',                category: 'Vasos y Termos',  uses: 'Bodas, aniversarios, regalo de pareja, sets de recuerdo' },
      { id: 'p007', image: 'Ex-proyecto/img/mas_Vasos.jpg',               title: 'Vasos para Fiestas Temáticas',       description: 'Vasos con diseño temático para todo tipo de festejo. El detalle que hace especial tu fiesta.',                    category: 'Vasos y Termos',  uses: 'Fiestas temáticas, cumpleaños, XV años, graduaciones' },
      { id: 'p008', image: 'Ex-proyecto/img/vasos_libros.jpg',            title: 'Kits de Fiesta Personalizados',      description: 'Kits completos con vasos y accesorios personalizados para una fiesta perfecta y coordinada.',                    category: 'Vasos y Termos',  uses: 'Fiestas infantiles, XV años, graduaciones, eventos temáticos' },
      { id: 'p009', image: 'Ex-proyecto/img/vaso_edicion.jpg',            title: 'Vasos Edición Especial',             description: 'Diseños de edición limitada con acabados y detalles premium. Ideales para regalos muy especiales.',               category: 'Vasos y Termos',  uses: 'Regalos únicos, coleccionables, fechas especiales, recuerdos' },
      { id: 'p010', image: 'Ex-proyecto/img/fofucha_2.jpg',               title: 'Fofuchas Personalizadas',            description: 'Figuras de foami 100% hechas a mano que capturan la esencia de cada persona con detalle y amor.',                 category: 'Fofuchas',        uses: 'Regalos únicos, XV años, bodas, cumpleaños de adultos' },
      { id: 'p011', image: 'Ex-proyecto/img/fofucha_toystory.jpg',        title: 'Fofuchas en Caja de Presentación',   description: 'Fofuchas temáticas presentadas en hermosas cajas decoradas. El regalo perfecto para sorprender.',                  category: 'Fofuchas',        uses: 'Regalos premium, cumpleaños, Navidad, día del maestro' },
      { id: 'p012', image: 'Ex-proyecto/img/fofucha1.jpg',                title: 'Fofuchas de Personajes',             description: 'Fofuchas con los personajes favoritos elaboradas a mano con increíble atención al detalle.',                      category: 'Fofuchas',        uses: 'Cumpleaños temáticos, coleccionables, regalos especiales, decoración' },
      { id: 'p013', image: 'Ex-proyecto/img/fofucha.jpg',                 title: 'Fofuchas con Uniforme',              description: 'Fofucha personalizada con tu uniforme de trabajo, escolar o deporte. Idéntica a ti.',                             category: 'Fofuchas',        uses: 'Graduaciones, jubilaciones, día del maestro, regalos de empresa' },
      { id: 'p014', image: 'Ex-proyecto/img/regalo_alumnos.jpg',          title: 'Regalos de Graduación',              description: 'Sets de regalos personalizados ideales para maestras o alumnos. Perfecto para el fin del ciclo escolar.',          category: 'Fofuchas',        uses: 'Graduaciones, fin de ciclo, regalo de alumnos, día del maestro' },
      { id: 'p015', image: 'Ex-proyecto/img/libretas_personalizadas.jpg', title: 'Libretas Personalizadas',            description: 'Libretas decoradas a mano con diseño, nombre y colores al gusto. Únicas e irrepetibles.',                        category: 'Libretas',        uses: 'Inicio de clases, regalos escolares, uso personal, regalo de maestra' },
      { id: 'p016', image: 'Ex-proyecto/img/libretas_personalizadas2.jpg',title: 'Libretas por Materia',               description: 'Sets de libretas personalizadas por materia para tener todo organizado con estilo propio.',                       category: 'Libretas',        uses: 'Inicio de clases, regalo de alumnos, organización escolar' },
      { id: 'p017', image: 'Ex-proyecto/img/libretas_personalizada3.jpg', title: 'Libretas con Acabado Premium',       description: 'Libretas con decoración de alta calidad y portada personalizada con acabados impecables.',                       category: 'Libretas',        uses: 'Regalos especiales, uso profesional, inicio de ciclo escolar' },
      { id: 'p018', image: 'Ex-proyecto/img/libretas_personalizadas4.jpg',title: 'Libretas Temáticas',                 description: 'Libretas con diseño temático según tu personaje o tema favorito. Hazlas completamente tuyas.',                    category: 'Libretas',        uses: 'Cumpleaños, regalos para niños y adolescentes, regalo escolar' },
      { id: 'p019', image: 'Ex-proyecto/img/lapiceras_personalizadas.jpg',title: 'Lapiceras Personalizadas',           description: 'Lapiceras decoradas a mano para combinar perfectamente con tus libretas personalizadas.',                        category: 'Libretas',        uses: 'Inicio de clases, set escolar, regalos de recuerdo, regalo de maestra' },
      { id: 'p020', image: 'Ex-proyecto/img/636588671_122178349772784676_6257637211929494450_n.jpg', title: 'Letras con Luces LED', description: 'Letras iluminadas con luces LED para decorar cualquier evento especial con elegancia y estilo.', category: 'Letras LED', uses: 'Bodas, quinceañeras, graduaciones, decoración de eventos' },
      { id: 'p021', image: 'Ex-proyecto/img/letras_luces_en_playa.jpg',   title: 'Letras LED para Bodas en Playa',     description: 'Letras LED diseñadas para ambientes al aire libre y bodas en playa. Impacto visual garantizado.',                  category: 'Letras LED',      uses: 'Bodas en playa, eventos al aire libre, fiestas nocturnas' },
      { id: 'p022', image: 'Ex-proyecto/img/letras_luces_led_a.jpg',      title: 'Letras LED Individuales',            description: 'Letras LED individuales para nombres, iniciales o palabras especiales que iluminen tu espacio.',                  category: 'Letras LED',      uses: 'Decoración de cuartos, cumpleaños, XV años, regalos especiales' },
      { id: 'p023', image: 'Ex-proyecto/img/letras_luces_led.jpg',        title: 'Letras LED - Proceso Artesanal',     description: 'Cada letra es elaborada artesanalmente con atención a cada detalle. Calidad y amor garantizados.',                 category: 'Letras LED',      uses: 'Bodas, graduaciones, quinceañeras, eventos especiales' },
      { id: 'p024', image: 'Ex-proyecto/img/547672474_122156043242784676_6852062447231125503_n.jpg', title: 'Cake Toppers Personalizados', description: 'Toppers para pastel personalizados con nombre, tema y personaje favorito. El toque final perfecto.', category: 'Cake Toppers', uses: 'Cumpleaños, bodas, XV años, babyshower, mesas de dulces' },
      { id: 'p025', image: 'Ex-proyecto/img/gelatina_perrito_cumpleano.jpg', title: 'Toppers para Cumpleaños de Mascotas', description: 'Decoración especial para celebrar a tu mascota favorita. Porque los peludos también merecen fiesta.', category: 'Cake Toppers', uses: 'Cumpleaños de mascotas, paw party, mesas de dulces, celebraciones' },
      { id: 'p026', image: 'Ex-proyecto/img/gelatinas_perrito_fiesta.jpg',title: 'Decoración para Postres',            description: 'Decoración temática para postres, gelatinas y mesas de dulces. Hace tu fiesta irresistible.',                    category: 'Cake Toppers',    uses: 'Mesas de dulces, postres temáticos, fiestas infantiles, celebraciones' }
    ];
    const seedAll = db.transaction(() => seedProducts.forEach(p => insertProd.run(p)));
    seedAll();
    console.log(`Catálogo inicial cargado: ${seedProducts.length} productos`);
  }
}

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
initData().then(() => {
  app.listen(PORT, () => {
    console.log(`\nRincón Creativo AM — Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Panel admin: http://localhost:${PORT}/admin/admin.html\n`);
  });
});
