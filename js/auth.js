/**
 * auth.js — Rincón Creativo AM
 * Utilidades de autenticación compartidas entre login.html y admin.html
 */

'use strict';

const Auth = {
  TOKEN_KEY: 'rcam_token',

  /** Obtiene el token del sessionStorage */
  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY);
  },

  /** Guarda el token en sessionStorage */
  setToken(token) {
    sessionStorage.setItem(this.TOKEN_KEY, token);
  },

  /** Elimina el token (logout) */
  removeToken() {
    sessionStorage.removeItem(this.TOKEN_KEY);
  },

  /**
   * Verifica si hay una sesión activa y el token no ha expirado.
   * Decodifica el payload JWT sin verificar firma (la firma se verifica en el servidor).
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  /**
   * Envía credenciales al servidor y guarda el token si son válidas.
   * @throws {Error} con mensaje del servidor si las credenciales son incorrectas
   */
  async login(email, password) {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    this.setToken(data.token);
    return data;
  },

  /** Cierra sesión y redirige al login */
  logout() {
    this.removeToken();
    window.location.href = '/login.html';
  },

  /**
   * Verifica autenticación y redirige si no hay sesión.
   * Usar al inicio de admin.html.
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  },

  /** Devuelve headers con Authorization para llamadas a la API */
  getAuthHeaders() {
    return { 'Authorization': `Bearer ${this.getToken()}` };
  }
};
