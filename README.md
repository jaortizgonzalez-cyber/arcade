# Sala de juegos

Catálogo de juegos caseros. El tres en raya se juega en línea desde dos celulares;
los demás, en un solo dispositivo.

## 1. Firebase (solo una vez)

1. En [console.firebase.google.com](https://console.firebase.google.com) crea un proyecto.
2. **Realtime Database** → *Crear base de datos* → región `us-central1` → empezar en **modo bloqueado**.
3. Pestaña **Reglas** → pega el contenido de `reglas-firebase.json` → *Publicar*.
   (Si ya lo habías hecho, vuelve a pegarlas: ahora incluyen el nodo `secretos`.)
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
| `furia-callejera.html` | Beat'em up cooperativo (Double Dragon) |
| `motocross.html` | Carrera de motocross en línea |
| `batalla-naval.html` | Batalla naval en línea |
| `tres-en-raya.html` | Tres en raya en línea (y local) |
| `sala.js` | Clase `Sala`: Firebase, salas, presencia, transacciones |
| `sala-local.js` | Clase `SalaLocal`: misma interfaz, sin red, para jugar solo |
| `lobby.js` | Clase `Lobby`: pantallas de crear/entrar, compartidas |
| `sonido.js` | Clase `Sonido`: efectos sintetizados, sin archivos |
| `tanques-combate.html` | Combat de Atari, dos jugadores |
| `ahorcado.html` | Palabra secreta |
| `tetris.html` | Tetris |
| `arkanoid.html` | Arkanoid |
| `config.js` | Credenciales de Firebase |
| `estilo.css` | Estilos comunes |

## Cómo agregar un juego nuevo

Los juegos no hablan con Firebase: hablan con `Sala`. Un juego nuevo solo necesita
su propio HTML con un `<div id="lobby">`, una sección `<section data-juego hidden>`
y esto al final:

```js
new Lobby({
  juego: 'miJuego',
  titulo: 'Mi <em>juego</em>',
  estadoInicial: () => ({ ...lo que guardes en la sala... }),
  alEntrar: s => { sala = s; s.alCambiar(pintar); }
});
```

Para cambiar algo: `sala.actualizar(s => { ...modificas s.estado... })`, que corre
dentro de una transacción. Para datos que el rival no debe ver (como las flotas):
`sala.guardarSecreto({...})` y `sala.leerSecreto()`.

### Sobre las flotas ocultas

En batalla naval nadie recibe la posición de los barcos enemigos. Cada flota vive en
`secretos/{sala}/{rol}`, y las reglas solo dejan leerla a su dueño. Cuando disparas,
tu cliente solo anuncia la casilla; **el cliente del defensor** compara contra su
propia flota y publica el resultado. Ni abriendo las herramientas de desarrollo se
puede espiar el tablero contrario.

### Sobre la carrera de motocross

Dos detalles de diseño que la hacen jugable pese a la latencia de la red:

- **Nadie comparte física.** Cada celular simula su propia moto y publica su
  posición diez veces por segundo; el otro la dibuja interpolando entre paquetes.
  Como las motos no chocan entre sí, un retraso de 300 ms no rompe nada.
- **La pista no se transmite.** Se genera con una semilla numérica guardada en la
  sala, así que ambos calculan exactamente el mismo terreno sin descargar nada.

El ganador se decide por tiempo propio medido en cada dispositivo, no por reloj
compartido: así un desfase de relojes entre los dos celulares no afecta el resultado.

## Modo de un jugador

`SalaLocal` implementa exactamente la misma interfaz que `Sala` pero guarda todo
en memoria. Los juegos no distinguen si el rival es una persona por internet o un
robot en el mismo dispositivo: reciben el mismo objeto y llaman a los mismos métodos.
Añadir un robot a un juego nuevo solo requiere pasarle `alSolo` al `Lobby` y escribir
la lógica del rival como un oyente más de `alCambiar`.

Cada robot tiene tres niveles, y la diferencia no es solo ruido: cambia la
estrategia. Medido por simulación:

**Tres en raya** — minimax completo con distinto margen de despiste

| Nivel | Contra juego al azar | Contra juego perfecto |
|---|---|---|
| Principiante (55% despiste) | gana 71%, pierde 17% | pierde 74% |
| Intermedio (22%) | gana 85%, pierde 5% | pierde 38%, empata 62% |
| Experto (0%) | nunca pierde | siempre empata |

**Batalla naval** — disparos necesarios para hundir las cinco naves

| Nivel | Estrategia | Promedio |
|---|---|---|
| Grumete | disparos al azar, sin perseguir | 95 |
| Capitán | persigue las casillas contiguas al impacto | 70 |
| Almirante | retícula alterna + deduce el eje del barco | 56 |

(azar puro ≈ 95; un humano bueno ronda 45-55)

**Motocross** — 2000 m, cambia potencia del motor y control en el aire

| Nivel | Mediana | Caídas |
|---|---|---|
| Aprendiz | 92 s | 4.7 |
| Rival | 76 s | 2.3 |
| Campeón | 68 s | 0.5 |

## Furia callejera (beat'em up cooperativo)

Es el único juego donde los dos están del mismo lado, y por eso necesita algo que
los demás no: **una autoridad**. Los enemigos son compartidos, así que quien crea
la sala los simula y reparte el daño; cada jugador mueve su propio personaje al
instante y transmite su posición. Sin eso, con 300 ms de latencia cada uno vería
a los matones en un sitio distinto.

La regla que hace jugable el género: **solo dos enemigos entran a pelear a la vez**
y el resto merodea esperando turno. Sin ella, seis matones rodean al jugador y lo
liquidan en segundos. Medido por simulación (25 partidas por caso):

| | Completan | Vidas perdidas |
|---|---|---|
| 1 jugador, poca destreza | 4% | 3 de 3 |
| 1 jugador, destreza media | 88% | 2.1 de 3 |
| 2 jugadores, poca destreza | 96% | 3.8 de 6 |
| 2 jugadores, destreza media | 100% | 3.6 de 6 |

Cooperar recompensa de verdad: en pareja se pasa incluso jugando mal.
