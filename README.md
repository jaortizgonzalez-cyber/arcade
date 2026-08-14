# Sala de juegos

Catálogo de juegos caseros. El tres en raya se juega en línea desde dos celulares;
los demás, en un solo dispositivo.

## 1. Firebase (solo una vez)

1. En [console.firebase.google.com](https://console.firebase.google.com) crea un proyecto.
2. **Realtime Database** → *Crear base de datos* → región `us-central1` → empezar en **modo bloqueado**.
3. Pestaña **Reglas** → pega el contenido de `reglas-firebase.json` → *Publicar*.
4. **Authentication** → *Comenzar* → método **Anónimo** → activar.
5. ⚙ **Configuración del proyecto** → *Tus apps* → icono web `</>` → registra la app y copia el objeto `firebaseConfig`.
6. Pega ese objeto en **`config.js`**, reemplazando los `PEGA_TU_...`.
7. **Authentication → Settings → Dominios autorizados**: agrega `TU-USUARIO.github.io`.

## 2. GitHub Pages

```bash
git init
git add .
git commit -m "Sala de juegos"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/sala-de-juegos.git
git push -u origin main
```

Luego: **Settings → Pages → Source: Deploy from a branch → main / (root)**.

En un par de minutos queda en `https://TU-USUARIO.github.io/sala-de-juegos/`.

## 3. Cómo se juega en pareja

1. Uno abre *Tres en raya* → **En línea** → **Crear sala nueva**.
2. Sale un código de 4 letras. Con **Compartir enlace** le llega por WhatsApp.
3. La otra persona abre el enlace (o escribe el código) y entra.
4. El tablero se sincroniza solo. El punto verde junto al nombre indica quién está conectado.

## Notas

- Las salas quedan guardadas en la base de datos. Para limpiarlas, borra el nodo `salas`
  desde la consola de Firebase de vez en cuando.
- La `apiKey` de Firebase es pública por diseño; lo que protege los datos son las reglas
  y la autenticación anónima.
- El plan gratuito (Spark) sobra de largo para dos jugadores.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Catálogo |
| `tres-en-raya.html` | Juego en línea (y local) |
| `tanques-combate.html` | Combat de Atari, dos jugadores |
| `ahorcado.html` | Palabra secreta |
| `tetris.html` | Tetris |
| `arkanoid.html` | Arkanoid |
| `config.js` | Credenciales de Firebase |
| `estilo.css` | Estilos comunes |
