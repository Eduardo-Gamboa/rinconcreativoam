# Rincón Creativo AM - Documentación del Proyecto

## Descripción del negocio
Negocio de manualidades y productos personalizados ubicado en Mérida, Yucatán, México. Ofrece creaciones hechas a mano para fiestas, eventos, escuela y regalos. Todo es personalizable y el precio varía según cotización (NO mostrar precios en la web).

---

## Arquitectura del sitio

### Tecnología
- **HTML5** semántico (single-page)
- **Bootstrap 4** + template Bizler/Crystalo como base
- **jQuery**, Isotope.js, Owl Carousel, Lightbox2
- **CSS3**: `css/style.css` + `css/rcam.css` (estilos propios de RCAM)
- **Google Fonts**: Quicksand (principal) + Pacifico (acento)
- **EmailJS**: Envío de formulario de contacto (CDN)
- **Node.js + Express**: Backend con API REST, autenticación JWT y upload de imágenes
- **Deploy**: Railway (auto-deploy desde GitHub `main`)

### Archivos principales
| Archivo | Función |
|---------|---------|
| `index.html` | Página pública: Header, Hero, Catálogo, Testimonios, Contacto, Footer |
| `login.html` | Página de inicio de sesión del panel admin |
| `admin/admin.html` | Panel administrativo (CRUD de productos) |
| `server.js` | Backend Express: API REST, auth JWT, upload de imágenes |
| `css/style.css` | Estilos del template Bizler |
| `css/rcam.css` | Estilos propios de RCAM (cards, botones, animaciones) |
| `js/catalog.js` | Carga el catálogo dinámicamente desde `/api/products` |
| `js/auth.js` | Gestión de token JWT en el cliente (login, logout, headers) |
| `js/admin.js` | Lógica del panel admin: CRUD, modales, toasts |
| `data/products.json` | Persistencia de productos (JSON) |
| `data/categories.json` | Categorías disponibles |
| `data/users.json` | Usuario admin con hash bcrypt (NO se sube a Git) |
| `assets/productos/` | Imágenes subidas desde el panel admin (NO se suben a Git) |
| `Ex-proyecto/` | Sitio original de referencia + imágenes del catálogo inicial |

---

## Backend / API

### Stack
- **Express 4**: servidor HTTP + archivos estáticos
- **bcryptjs**: hash de contraseñas
- **jsonwebtoken**: autenticación JWT (expiración 8h)
- **multer**: upload de imágenes (máx 5 MB, formatos JPG/PNG/WebP)
- **uuid v4**: generación de IDs de productos
- **Persistencia**: archivos JSON en `data/` (sin base de datos)

### Rutas
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | No | Devuelve JWT si las credenciales son válidas |
| `GET` | `/api/products` | No | Lista todos los productos |
| `GET` | `/api/categories` | No | Lista las categorías |
| `POST` | `/api/products` | JWT | Crea producto (form-data con imagen) |
| `PUT` | `/api/products/:id` | JWT | Actualiza producto (imagen opcional) |
| `DELETE` | `/api/products/:id` | JWT | Elimina producto e imagen |

### Variables de entorno (Railway)
| Variable | Descripción |
|----------|-------------|
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `ADMIN_PASSWORD` | Contraseña del usuario admin (se hashea con bcrypt al primer arranque) |
| `ADMIN_EMAIL` | Email del admin (default: `america@rinconcreativo.com`) |
| `DATA_DIR` | Ruta al directorio de datos (usar con Railway Volume) |
| `UPLOAD_DIR` | Ruta al directorio de uploads (usar con Railway Volume) |

### Persistencia en Railway
Railway usa filesystem efímero — los archivos escritos en runtime se pierden al redeploy. Para que los productos y las imágenes subidas desde el admin persistan:
1. Crear un **Volume** en Railway dashboard
2. Montarlo en `/app/persistent`
3. Setear `DATA_DIR=/app/persistent/data` y `UPLOAD_DIR=/app/persistent/uploads`

---

## Panel Administrativo

### Acceso
- URL: `/login.html`
- Credenciales: definidas en las variables de entorno de Railway

### Funcionalidades
- Listar todos los productos en grid responsivo
- **Crear** producto: imagen, título, descripción, categoría, usos
- **Editar** producto: mismos campos, imagen opcional (si no se sube conserva la anterior)
- **Eliminar** producto con modal de confirmación
- Preview de imagen en tiempo real al seleccionar archivo
- Toasts de confirmación/error en cada operación
- Logout con invalidación de sesión

### Seguridad
- Token JWT almacenado en `sessionStorage` (se borra al cerrar el navegador)
- Rutas de escritura protegidas por middleware `requireAuth`
- Inputs sanitizados para prevenir XSS (`<>"'` eliminados)
- Imágenes validadas por extensión y tamaño antes de guardar

---

## Catálogo público

El catálogo en `index.html` se carga dinámicamente mediante `catalog.js`:
1. Hace `fetch('/api/products')` al backend
2. Si la API no está disponible, hace fallback a `fetch('/data/products.json')` (útil en hosting estático)
3. Renderiza los cards con lightbox, badge "PERSONALIZABLE", botón WhatsApp y campo de usos
4. Inicializa **Isotope** con `fitRows` para el filtro por categoría

### Categorías e Isotope (clases CSS)
| Categoría | Clase CSS |
|-----------|-----------|
| Vasos y Termos | `vasos` |
| Fofuchas | `fofuchas` |
| Libretas | `libretas` |
| Letras LED | `letras` |
| Cake Toppers | `toppers` |

---

## Secciones del sitio (index.html)

### 1. Header (sticky)
- Logo + nav: Inicio, Nosotros, Servicios, Catálogo, Contacto, **Administración**
- Enlace "Administración" lleva a `/login.html`

### 2. Hero / Slider
- Revolution Slider con imágenes y call to action

### 3. Catálogo
- Filtros por categoría (Isotope)
- Cards dinámicos cargados por `catalog.js`
- Lightbox al hacer clic en la imagen del producto
- Botón WhatsApp individual por producto

### 4. Testimonios
- Owl Carousel con 3 testimonios de clientes

### 5. Contacto
- Tarjetas: WhatsApp, Email, Facebook, Instagram, Ubicación
- Formulario con EmailJS

### 6. Footer
- Logo, descripción, iconos sociales, copyright

---

## Datos de contacto
- **WhatsApp/Teléfono**: +52 1 999 241 8798
- **Email**: rinconcreativoam@gmail.com
- **Facebook**: https://www.facebook.com/rinconcreativoam
- **Instagram**: https://www.instagram.com/rinconcreativo.am/
- **Google Maps**: https://maps.app.goo.gl/yjMtgK4JaTkGGk797

---

## Configuración EmailJS
- **Service ID**: `service_ggnoh33`
- **Template ID**: `template_rb7f6oj`
- **Public Key**: `UVNol3V5m5jFVnugK`
- **Variables de plantilla**: `{{from_name}}`, `{{reply_to}}`, `{{subject}}`, `{{message}}`
- **Límite gratuito**: 200 emails/mes

---

## Paleta de colores
| Variable / Valor | Uso |
|-----------------|-----|
| `#2AABB3` (teal) | Color principal, títulos, botones, nav |
| `#228E95` (teal dark) | Hover de botones |
| `#E8F6F7` (teal light) | Fondos suaves, fondo de usos en cards |
| `#F08B96` (pink) | Badges "PERSONALIZABLE" |
| `#FDE8EB` (pink light) | Fondos rosa suave |
| `#25D366` (whatsapp green) | Botón WhatsApp en cards |

## Tipografías
- **Quicksand** (400-700): Texto general, panel admin, login
- **Pacifico**: Acentos decorativos

---

## Flujo de deploy

```
cambios locales → git push origin main → Railway auto-redeploya
```

Al primer arranque tras un deploy limpio, `server.js` genera automáticamente `data/users.json` desde las variables de entorno `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
