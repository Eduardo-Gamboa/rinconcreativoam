# Rincón Creativo AM - Documentación del Proyecto

## Descripción del negocio
Negocio de manualidades y productos personalizados ubicado en Mérida, Yucatán, México. Ofrece creaciones hechas a mano para fiestas, eventos, escuela y regalos. Todo es personalizable y el precio varía según cotización (NO mostrar precios en la web).

---

## Arquitectura del sitio

### Tecnología
- **HTML5** semántico (single-page)
- **CSS3**: Variables CSS, Flexbox, Grid, media queries, animaciones
- **JavaScript vanilla**: Sin frameworks ni dependencias
- **Google Fonts**: Quicksand (principal) + Pacifico (acento)
- **EmailJS**: Envío de formulario de contacto (CDN)
- **Sin build step**: Abre directamente index.html o deploy en GitHub Pages

### Archivos principales
| Archivo | Función |
|---------|---------|
| `index.html` | Página completa: Header, Hero, Catálogo, Contacto, Footer |
| `css/styles.css` | Todos los estilos, responsive, animaciones |
| `js/main.js` | Menú móvil, filtros catálogo, lightbox, scroll reveal, EmailJS |
| `logo_rcam.jpg` | Logo principal (colores teal + rosa, herramientas de manualidades) |

---

## Secciones del sitio

### 1. Header (fijo/sticky)
- Logo circular a la izquierda
- Nav: Inicio | Catálogo | Contacto
- Menú hamburguesa en móvil (< 768px)
- Efecto blur con sombra al hacer scroll

### 2. Hero (Inicio)
- Fondo gradiente teal-light a pink-light
- Logo 180x180px con sombra
- Título: "Creaciones únicas hechas con amor"
- Tags: Vasos Personalizados, Fofuchas, Letras LED, Libretas, Cake Toppers
- Botones: "Ver Catálogo" + "Cotiza por WhatsApp"

### 3. Catálogo (sección principal)
- **Filtros por categoría**: Todos, Vasos y Termos, Fofuchas, Libretas y Lapiceras, Letras LED, Cake Toppers y Más
- **Grid responsivo**: 3 columnas (desktop), 2 (tablet), 1 (móvil)
- **23 tarjetas de producto** con imagen, badge, descripción, usos y botón "¡Cotiza el tuyo ya!" a WhatsApp

### 4. Contacto
- Tarjetas: WhatsApp, Teléfono, Email, Facebook, Instagram, Ubicación
- Formulario de contacto con EmailJS (Nombre, Correo, Asunto, Mensaje)

### 5. Footer
- Logo, texto, iconos sociales, copyright

### 6. Elementos flotantes
- Botón WhatsApp fijo (esquina inferior derecha)
- Lightbox para ver imágenes en grande

---

## Datos de contacto
- **WhatsApp/Teléfono**: 999 241 8798
- **Email**: rinconcreativoam@gmail.com
- **Facebook**: https://www.facebook.com/rinconcreativoam
- **Instagram**: https://www.instagram.com/rinconcreativo.am/
- **Google Maps**: https://maps.app.goo.gl/yjMtgK4JaTkGGk797

---

## Catálogo de productos (imágenes en img/)

### Vasos y Termos (8 productos)
| Imagen | Producto |
|--------|----------|
| `vasos_oersinalizados.jpg` | Vasos Infantiles Personalizados |
| `vasopersonalizado.jpg` | Vasos con Diseño Exclusivo |
| `vasos_persn.jpg` | Vasos para Niños y Niñas |
| `termo_personalizado.jpg` | Termos Personalizados |
| `vasos_bodacivil.jpg` | Vasos para Bodas y Eventos |
| `vasos_boda.jpg` | Recuerdos Completos para Bodas |
| `mas_Vasos.jpg` | Vasos para Fiestas Temáticas |
| `vasos_libros.jpg` | Kits de Fiesta Personalizados |

### Fofuchas (5 productos)
| Imagen | Producto |
|--------|----------|
| `fofucha_2.jpg` | Fofuchas Personalizadas |
| `fofucha_toystory.jpg` | Fofuchas en Caja de Presentación |
| `fofucha1.jpg` | Fofuchas de Personajes |
| `fofucha.jpg` | Fofuchas con Uniforme |
| `regalo_alumnos.jpg` | Regalos de Graduación |

### Libretas y Lapiceras (4 productos)
| Imagen | Producto |
|--------|----------|
| `libretas_personalizadas.jpg` | Libretas Personalizadas |
| `libretas_personalizadas2.jpg` | Libretas por Materia |
| `libretas_personalizada3.jpg` | Libretas con Acabado Premium |
| `lapiceras_personalizadas.jpg` | Lapiceras Personalizadas |

### Letras LED (3 productos)
| Imagen | Producto |
|--------|----------|
| `636588671_122178349772784676_6257637211929494450_n.jpg` | Letras con Luces LED |
| `letras_luces_en_playa.jpg` | Letras LED para Bodas en Playa |
| `letras_luces_led_a.jpg` | Letras LED Individuales |

### Cake Toppers y Extras (3 productos)
| Imagen | Producto |
|--------|----------|
| `547672474_122156043242784676_6852062447231125503_n.jpg` | Cake Toppers Personalizados |
| `gelatina_perrito_cumpleano.jpg` | Toppers para Cumpleaños de Mascotas |
| `gelatinas_perrito_fiesta.jpg` | Decoración para Postres |

### Imágenes disponibles no usadas aún
- `letras_luces_led.jpg` - Letra "A" de día en taller
- `libretas_personalizadas4.jpg` - Libreta Moana, Saberes Matemáticos
- `vaso_edicion.jpg` - Flyer promocional de vasos

---

## Configuración EmailJS
- **Service ID**: `service_ggnoh33`
- **Template ID**: `template_rb7f6oj`
- **Public Key**: `UVNol3V5m5jFVnugK`
- **Ubicación en código**: `js/main.js` líneas ~120-122
- **Variables de plantilla**: `{{from_name}}`, `{{reply_to}}`, `{{subject}}`, `{{message}}`
- **Límite gratuito**: 200 emails/mes

---

## Paleta de colores (variables CSS en :root)
| Variable | Hex | Uso |
|----------|-----|-----|
| `--teal` | `#2AABB3` | Color principal, títulos, botones |
| `--teal-dark` | `#228E95` | Hover de botones |
| `--teal-light` | `#E8F6F7` | Fondos suaves |
| `--pink` | `#F08B96` | Acentos, badges |
| `--pink-light` | `#FDE8EB` | Fondos rosa suave |
| `--cream` | `#FDF8F4` | Fondo general |

## Tipografías
- **Quicksand** (400-700): Texto general
- **Pacifico**: Acentos decorativos

## Breakpoints
- `1024px`: Contacto 1 columna
- `768px`: Menú hamburguesa
- `480px`: Todo 1 columna
