/**
 * admin.js — Rincón Creativo AM
 * Lógica del panel administrativo: listar, crear, editar y eliminar productos.
 * Depende de auth.js para la gestión del token JWT.
 */

'use strict';

// ─── Estado ───────────────────────────────────────────────────────────────────
let products   = [];
let categories = [];
let editingId  = null; // ID del producto que se está editando (null = crear)

// ─── Elementos del DOM ────────────────────────────────────────────────────────
const productGrid   = document.getElementById('product-grid');
const productCount  = document.getElementById('product-count');
const formModal     = document.getElementById('form-modal');
const deleteModal   = document.getElementById('delete-modal');
const productForm   = document.getElementById('product-form');
const modalTitle    = document.getElementById('modal-title');
const categorySelect = document.getElementById('field-category');
const imgPreview    = document.getElementById('img-preview');
const imgInput      = document.getElementById('field-image');
const btnNewProduct = document.getElementById('btn-new-product');
const btnLogout     = document.getElementById('btn-logout');
const toastEl       = document.getElementById('toast-msg');
const toastText     = document.getElementById('toast-text');

// ─── Toast (notificación) ─────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  toastText.textContent = message;
  toastEl.className = `rcam-toast rcam-toast--${type} rcam-toast--visible`;
  setTimeout(() => { toastEl.classList.remove('rcam-toast--visible'); }, 3500);
}

// ─── Fetch helper con auth ────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const headers = Auth.getAuthHeaders();
  // No poner Content-Type en FormData (el navegador lo agrega con boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res  = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

// ─── Cargar categorías ────────────────────────────────────────────────────────
async function loadCategories() {
  try {
    categories = await apiFetch('/api/categories');
    categorySelect.innerHTML = categories
      .map(c => `<option value="${c}">${c}</option>`)
      .join('');
  } catch (err) {
    showToast('Error cargando categorías', 'error');
  }
}

// ─── Renderizar grid de productos ─────────────────────────────────────────────
function renderGrid() {
  productCount.textContent = products.length;

  if (!products.length) {
    productGrid.innerHTML = `
      <div class="rcam-admin-empty">
        <p>No hay productos. ¡Agrega el primero!</p>
      </div>`;
    return;
  }

  productGrid.innerHTML = products.map(p => `
    <div class="rcam-admin-card" data-id="${p.id}">
      <div class="rcam-admin-card__img">
        <img src="/${p.image}" alt="${p.title}" loading="lazy"
             onerror="this.src='/img/transparent.png'">
      </div>
      <div class="rcam-admin-card__body">
        <span class="rcam-admin-card__cat">${p.category}</span>
        <h6 class="rcam-admin-card__title">${p.title}</h6>
        <p class="rcam-admin-card__desc">${p.description}</p>
      </div>
      <div class="rcam-admin-card__actions">
        <button class="rcam-admin-btn rcam-admin-btn--edit"
                onclick="openEditModal('${p.id}')">
          ✏️ Editar
        </button>
        <button class="rcam-admin-btn rcam-admin-btn--delete"
                onclick="openDeleteModal('${p.id}')">
          🗑️ Eliminar
        </button>
      </div>
    </div>
  `).join('');
}

// ─── Cargar productos ─────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    productGrid.innerHTML = '<p class="rcam-admin-loading">Cargando productos...</p>';
    products = await apiFetch('/api/products');
    renderGrid();
  } catch (err) {
    showToast('Error cargando productos', 'error');
    productGrid.innerHTML = '<p style="color:red">Error cargando productos.</p>';
  }
}

// ─── Modal: Crear producto ────────────────────────────────────────────────────
function openCreateModal() {
  editingId = null;
  modalTitle.textContent = 'Nuevo Producto';
  productForm.reset();
  imgPreview.style.display = 'none';
  imgPreview.src = '';
  imgInput.required = true;
  document.getElementById('img-required-note').style.display = 'inline';
  formModal.classList.add('rcam-modal--open');
}

// ─── Modal: Editar producto ───────────────────────────────────────────────────
function openEditModal(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  editingId = id;
  modalTitle.textContent = 'Editar Producto';

  document.getElementById('field-title').value       = product.title;
  document.getElementById('field-description').value = product.description;
  document.getElementById('field-uses').value        = product.uses || '';
  categorySelect.value = product.category;

  // Imagen actual
  imgPreview.src   = `/${product.image}`;
  imgPreview.style.display = 'block';
  imgInput.required = false; // No obligatorio al editar
  document.getElementById('img-required-note').style.display = 'none';

  formModal.classList.add('rcam-modal--open');
}

// ─── Cerrar modal de formulario ───────────────────────────────────────────────
function closeFormModal() {
  formModal.classList.remove('rcam-modal--open');
  editingId = null;
  productForm.reset();
}

// ─── Preview de imagen seleccionada ──────────────────────────────────────────
imgInput.addEventListener('change', () => {
  const file = imgInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    imgPreview.src = e.target.result;
    imgPreview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

// ─── Envío del formulario (crear / editar) ────────────────────────────────────
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const btnSubmit = document.getElementById('btn-submit-form');
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Guardando...';

  const formData = new FormData();
  formData.append('title',       document.getElementById('field-title').value.trim());
  formData.append('description', document.getElementById('field-description').value.trim());
  formData.append('category',    categorySelect.value);
  formData.append('uses',        document.getElementById('field-uses').value.trim());

  if (imgInput.files[0]) formData.append('image', imgInput.files[0]);

  try {
    if (editingId) {
      await apiFetch(`/api/products/${editingId}`, { method: 'PUT', body: formData });
      showToast('Producto actualizado correctamente');
    } else {
      await apiFetch('/api/products', { method: 'POST', body: formData });
      showToast('Producto creado correctamente');
    }
    closeFormModal();
    await loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Guardar';
  }
});

// ─── Modal: Eliminar producto ─────────────────────────────────────────────────
let pendingDeleteId = null;

function openDeleteModal(id) {
  pendingDeleteId = id;
  const product = products.find(p => p.id === id);
  document.getElementById('delete-product-name').textContent = product?.title || 'este producto';
  deleteModal.classList.add('rcam-modal--open');
}

function closeDeleteModal() {
  deleteModal.classList.remove('rcam-modal--open');
  pendingDeleteId = null;
}

document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
  if (!pendingDeleteId) return;

  const btn = document.getElementById('btn-confirm-delete');
  btn.disabled = true;
  btn.textContent = 'Eliminando...';

  try {
    await apiFetch(`/api/products/${pendingDeleteId}`, { method: 'DELETE' });
    showToast('Producto eliminado');
    closeDeleteModal();
    await loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sí, eliminar';
  }
});

document.getElementById('btn-cancel-delete').addEventListener('click', closeDeleteModal);

// Cerrar modales al hacer clic fuera del contenido
[formModal, deleteModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('rcam-modal--open');
    }
  });
});

// ─── Eventos globales ─────────────────────────────────────────────────────────
btnNewProduct.addEventListener('click', openCreateModal);
btnLogout.addEventListener('click', () => Auth.logout());
document.getElementById('btn-close-modal').addEventListener('click', closeFormModal);

// Exponer funciones necesarias desde HTML (onclick inline)
window.openEditModal   = openEditModal;
window.openDeleteModal = openDeleteModal;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticación antes de mostrar nada
  if (!Auth.requireAuth()) return;

  await Promise.all([loadCategories(), loadProducts()]);
});
