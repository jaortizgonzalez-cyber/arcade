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
| `aviones.html` | Combate aéreo en línea |
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


## Motocross con varios corredores

`Sala` admite ahora hasta seis puestos (`new Sala(juego, max)`), asignados por orden
de llegada: A, B, C… El motocross usa cinco. Los juegos de dos siguen creándose con
el valor por defecto, así que nada cambió para ellos.

Con más de dos puestos, quien crea la sala no queda bloqueado esperando: puede
entrar de una y los demás se suman sobre la marcha. La carrera arranca cuando todos
los que están dentro confirman "Estoy listo".

### Escenarios

Cinco paletas con terreno propio, verificadas por simulación (25 semillas cada una):

| Escenario | Pendiente máxima | Se completan | Tiempo mediano |
|---|---|---|---|
| Ciudad nocturna | 49° | 25/25 | 67 s |
| Desierto | 51° | 25/25 | 68 s |
| Bosque | 56° | 25/25 | 69 s |
| Nieve | 49° | 25/25 | 67 s |
| Volcán | 59° | 25/25 | 71 s |

El volcán es el más quebrado (rampas más juntas y altas); la nieve, el más suave.

## Furia callejera (beat'em up)

Se juega solo contra la banda, o en línea de dos a cuatro. **No hay modo de dos en
un mismo teclado**: en un beat'em up cada quien necesita su cruceta.

Como los enemigos son compartidos, hace falta una autoridad: quien crea la sala los
simula y reparte el daño. Los demás mueven su personaje al instante y publican dos
cosas — su posición y sus golpes. El anfitrión aplica esos golpes contra los enemigos
y devuelve la salud de todos. Sin ese ida y vuelta, los puñetazos de los invitados
no le harían nada a nadie.

La regla que hace jugable el género: **solo dos enemigos entran a pelear a la vez**
(tres si son más de dos jugadores) y el resto merodea esperando turno.

Curva de dificultad, medida por simulación con un jugador de destreza media:

| | Pandilla floja | Pandilla | Pandilla brava |
|---|---|---|---|
| 1 jugador | 100% | 50% | 0% (17% jugando muy bien) |
| 2 jugadores | 100% | 100% | 92% |
| 4 jugadores | 100% | 100% | 100% |

La partida dura entre 90 s y 2:30. "Pandilla brava" en solitario está pensada para
ser casi imposible: es el reto de verdad.

## Combate de tanques

De uno a cuatro tanques, con bot para jugar solo. Cuatro campos simétricos por
rotación de 180°, generados dibujando un cuadrante y rotándolo: la simetría queda
garantizada por construcción. Un paso de reparación abre muros (siempre en pareja,
para no romper la simetría) hasta que todas las celdas quedan conectadas — hizo
falta en el mapa Arena, que salía con una bolsa cerrada.

### Armas y premios

| Arma | Cómo se consigue | Carácter |
|---|---|---|
| Cañón | siempre | Lento, rebota 4 veces, un tiro a la vez |
| Metralleta | premio (40 balas) | Ráfaga rápida, 5 en vuelo, un solo rebote |
| Láser | premio (6 cargas) | Instantáneo hasta el primer muro, no rebota |

También caen escudo (absorbe un impacto) y turbo (70% más velocidad).

### El bot

Lo que separa los niveles no es solo la puntería: es la **predicción**. El nivel As
apunta a donde va a estar el rival, no a donde está. Medido contra un rival errático
(3 repeticiones × 4 mapas, 90 s cada una):

| Nivel | Impactos en 90 s (rival errático) |
|---|---|
| Recluta | 14.0 |
| Veterano | 18.8 |
| As | 21.0 |

La mala puntería se modela **desviando el disparo** unos grados, no ampliando el
margen para apretar el gatillo: con proyectiles que rebotan cuatro veces, un tiro
mal apuntado acaba acertando igual, y así los tres niveles daban lo mismo.

Nota metodológica: medir bot contra bot no servía — ambos saturan la cadencia de
recarga y los tres niveles daban lo mismo. La diferencia solo aparece frente a un
rival que se mueve de forma imprevisible.

## Alas de combate

De uno a cuatro pilotos. Se arranca en la pista: hay que acelerar hasta la velocidad
de despegue y tirar del morro. En el aire no hay sustentación mágica — el avión avanza
en la dirección de su morro, subir cuesta velocidad y picar la regala.

**El ajuste que decide si el juego funciona** es la relación entre gravedad y empuje.
Con la gravedad original (150 frente a 44 de empuje), subir en pendiente pronunciada
era imposible: el avión entraba en pérdida en cuanto levantaba el morro y se caía.
Medido con un piloto automático de crucero: 15 choques en 60 s. Con la gravedad en 55
el mismo piloto mantiene 743 m indefinidamente sin un segundo en pérdida.

| Prueba | Resultado |
|---|---|
| Despegue | 1.7 s de carreteo |
| Crucero a 700 m (90 s) | altura final 743 m, 0 s en pérdida |
| Pérdida provocada | se recupera picando, sin estrellarse |

Los aviones **evolucionan con los derribos**: avioneta de hélice → caza (alas en
flecha y cañones bajo las alas) → jet (toberas y postcombustión). Cada salto sube
velocidad, empuje, maniobra y blindaje.

Los bots vuelan con la misma física y nunca se estrellan contra el suelo: descienden
como mínimo a 116 m. Los tres niveles cambian cuántos son, su rango de partida y su
puntería — de 41 a 175 disparos por minuto.
