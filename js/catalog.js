/**
 * catalog.js — Rincón Creativo AM
 * Carga dinámicamente los productos desde la API y los renderiza
 * en la sección #portfolio del sitio público.
 * También inicializa Isotope y el filtro por categoría.
 */

'use strict';

// Mapeo de nombre de categoría → clase CSS para Isotope
const CATEGORY_CLASS = {
  'Vasos y Termos': 'vasos',
  'Fofuchas':       'fofuchas',
  'Libretas':       'libretas',
  'Letras LED':     'letras',
  'Cake Toppers':   'toppers'
};

const WA_NUMBER = '5219992418798';

/** Devuelve la clase Isotope para una categoría */
function getCatClass(category) {
  return CATEGORY_CLASS[category] || 'otros';
}

/** Genera el HTML de un card de producto */
function renderCard(p) {
  const catClass = getCatClass(p.category);
  const waMsg    = encodeURIComponent('Hola, me interesa cotizar: ' + p.title);
  const uses     = p.uses ? `<div class="rcam-product-uses">✨ ${p.uses}</div>` : '';

  return `
    <div class="col-lg-4 col-md-6 col-sm-6 col-xs-12 port-item ${catClass}" data-id="${p.id}">
      <div class="rcam-product-card">
        <div class="rcam-product-img-wrap">
          <a href="${p.image}" data-lightbox="catalogo" data-title="${p.title}">
            <img src="${p.image}" alt="${p.title}" loading="lazy">
          </a>
          <span class="rcam-badge">PERSONALIZABLE</span>
        </div>
        <div class="rcam-product-body">
          <h5 class="rcam-product-title">${p.title}</h5>
          <p class="rcam-product-desc">${p.description}</p>
          ${uses}
          <a href="https://wa.me/${WA_NUMBER}?text=${waMsg}"
             class="rcam-card-wa-btn-full" target="_blank" rel="noopener">
            <svg class="rcam-wa-icon" aria-hidden="true"><use href="#icon-wa"/></svg>
            ¡Cotiza el tuyo ya!
          </a>
        </div>
      </div>
    </div>`;
}

/** Inicializa (o reinicia) Isotope y enlaza los botones de filtro */
function initIsotope() {
  const $gallary = jQuery('.portfolio-gallary');
  if (!$gallary.length) return;

  // Destruir instancia previa (custom.js puede haberla creado)
  if ($gallary.data('isotope')) $gallary.isotope('destroy');

  $gallary.isotope({
    itemSelector:        '.port-item',
    layoutMode:          'fitRows',
    percentPosition:     true,
    transitionDuration:  '0.4s'
  });

  // Botones de filtro: limpiar handlers previos y reenlazar
  jQuery('.portfolio-sort ul li').off('click').on('click', function () {
    jQuery('.portfolio-sort ul li').removeClass('active');
    jQuery(this).addClass('active');
    $gallary.isotope({ filter: jQuery(this).attr('data-filter') });
    return false;
  });
}

/** Carga productos desde la API (con fallback a products.json estático) */
async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('API no disponible');
    return await res.json();
  } catch {
    // Fallback: leer el JSON directamente (útil en hosting estático)
    try {
      const res = await fetch('/data/products.json');
      return await res.json();
    } catch {
      return [];
    }
  }
}

/** Punto de entrada principal */
async function initCatalog() {
  const gallery = document.getElementById('portfolio-gallary');
  if (!gallery) return;

  // Mostrar estado de carga
  gallery.innerHTML = '<div class="col-12 text-center py-5"><p style="color:#2AABB3;font-family:Quicksand,sans-serif;">Cargando catálogo...</p></div>';

  const products = await fetchProducts();

  if (!products.length) {
    gallery.innerHTML = '<div class="col-12 text-center py-5"><p>No hay productos disponibles.</p></div>';
    return;
  }

  // Renderizar cards
  gallery.innerHTML = products.map(renderCard).join('');

  // Inicializar Isotope después de que las imágenes carguen
  jQuery('.portfolio-gallary').imagesLoaded(() => {
    initIsotope();
  });
}

// Arrancar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initCatalog);
