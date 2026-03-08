/**
 * setup.js — Rincón Creativo AM
 * Ejecutar UNA VEZ para crear el usuario administrador inicial.
 * Uso: node setup.js
 */

'use strict';

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const ASSETS_DIR = path.join(__dirname, 'assets', 'productos');

async function setup() {
  // 1. Crear directorios necesarios
  [DATA_DIR, ASSETS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Directorio creado: ${dir}`);
    }
  });

  // 2. Crear usuario administrador inicial
  const usersPath = path.join(DATA_DIR, 'users.json');
  const hash = await bcrypt.hash('Ame123', 10);
  const users = [{ email: 'america@rinconcreativo.com', password: hash }];
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf-8');
  console.log('Usuario admin creado: america@rinconcreativo.com / Ame123');

  // 3. Crear categories.json si no existe
  const catPath = path.join(DATA_DIR, 'categories.json');
  if (!fs.existsSync(catPath)) {
    const categories = [
      'Vasos y Termos',
      'Fofuchas',
      'Libretas',
      'Letras LED',
      'Cake Toppers'
    ];
    fs.writeFileSync(catPath, JSON.stringify(categories, null, 2), 'utf-8');
    console.log('categories.json creado.');
  }

  // 4. Crear products.json con los 26 productos existentes si no existe
  const prodPath = path.join(DATA_DIR, 'products.json');
  if (!fs.existsSync(prodPath)) {
    const products = require('./data/products.json');
    console.log(`products.json ya existe con ${products.length} productos.`);
  }

  console.log('\nSetup completado. Inicia el servidor con: npm start');
}

setup().catch(err => {
  console.error('Error en setup:', err);
  process.exit(1);
});
