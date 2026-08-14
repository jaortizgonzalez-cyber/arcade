// ─────────────────────────────────────────────────────────────
//  PEGA AQUÍ LA CONFIGURACIÓN DE TU PROYECTO FIREBASE
//  (Consola Firebase → ⚙ Configuración del proyecto → Tus apps → Web)
//  Mientras esté sin llenar, los juegos funcionan solo en modo local.
// ─────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: "AIzaSyCQ8jiMdIHKwdfUoVj2MFgp8rin0PLwI20",
  authDomain: "arcade-a185d.firebaseapp.com",
  projectId: "arcade-a185d",
  storageBucket: "arcade-a185d.firebasestorage.app",
  messagingSenderId: "731103905413",
  appId: "1:731103905413:web:d096d3394adeb812878bec"
};

export const configurado = !firebaseConfig.apiKey.startsWith("PEGA_");
