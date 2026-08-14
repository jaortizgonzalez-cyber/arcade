// ─────────────────────────────────────────────────────────────
//  PEGA AQUÍ LA CONFIGURACIÓN DE TU PROYECTO FIREBASE
//  (Consola Firebase → ⚙ Configuración del proyecto → Tus apps → Web)
//  Mientras esté sin llenar, los juegos funcionan solo en modo local.
// ─────────────────────────────────────────────────────────────

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCQ8jiMdIHKwdfUoVj2MFgp8rin0PLwI20",
  authDomain: "arcade-a185d.firebaseapp.com",
  databaseURL: "https://arcade-a185d-default-rtdb.firebaseio.com/",
  projectId: "arcade-a185d",
  storageBucket: "arcade-a185d.firebasestorage.app",
  messagingSenderId: "731103905413",
  appId: "1:731103905413:web:b963e3c9125790e3878bec"
};

export const configurado = !firebaseConfig.apiKey.startsWith("PEGA_");
