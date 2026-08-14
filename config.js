// ─────────────────────────────────────────────────────────────
//  PEGA AQUÍ LA CONFIGURACIÓN DE TU PROYECTO FIREBASE
//  (Consola Firebase → ⚙ Configuración del proyecto → Tus apps → Web)
//  Mientras esté sin llenar, los juegos funcionan solo en modo local.
// ─────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: "PEGA_TU_API_KEY",
  authDomain: "PEGA_TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://PEGA_TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "PEGA_TU_PROYECTO",
  storageBucket: "PEGA_TU_PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

export const configurado = !firebaseConfig.apiKey.startsWith("PEGA_");
