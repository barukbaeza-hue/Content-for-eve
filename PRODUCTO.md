# Mova · Producto

**Crea. Mueve. Crece.** El sistema operativo de contenido para founder creators.

## ICP

**Founder creators.** Fundadores que construyen su **marca personal** con vídeos cortos en Instagram y TikTok. La marca personal es su **vía de distribución y de confianza**: documentan lo que construyen, comparten lo que saben y dan su opinión. No es contenido de venta de un negocio. Son vídeos sencillos: hablan a cámara y editan poco.

- **Qué les duele:** no tienen tiempo, no saben qué contar, les cuesta la cámara y no son constantes.
- **Qué quieren:** una marca personal que les dé alcance y confianza, sin que les coma el día.
- **Por qué los founder creators y no los creadores freelance:**
  - Pagan más y abandonan menos.
  - Casi nadie resuelve el vídeo corto para founder creators; las herramientas para fundadores se centran en LinkedIn.
  - Sus vídeos (hablando a cámara, poca edición) son ideales para editar de forma automática y en cola.
- Evelyn es la primera usuaria de prueba. Casi todo lo que se construye vale para los dos perfiles.

## Propuesta de valor

De tu historia a tus vídeos publicados, a tu ritmo, sin perder horas:

1. **Mova te conoce:** conectas tus redes y aprende cómo hablas, de qué hablas y qué te funciona.
2. **Ideas y guiones desde tu marca personal:** lo que estás construyendo, tu historia, lo que sabes, tus opiniones y lo que te pregunta tu audiencia, convertidos en guiones con tu forma de hablar. Si quieres, los afinas tú.
3. **Solo grabar va fuera de Mova.** Subes los vídeos y Mova los edita automáticamente y les escribe el copy.
4. **Tu banco de vídeos se publica solo** en Instagram y TikTok, según tu plan.
5. **Tu comunidad no se queda sin respuesta:** comentarios atendidos y conversaciones que construyen confianza.

## Idea central: un agente con memoria

Mova es un agente, no un conjunto de herramientas sueltas. Todo gira alrededor de **una memoria única del founder**: cada parte de Mova lee de ella y escribe en ella. El agente siempre sabe quién eres, qué has publicado, qué tienes planeado y en el banco, qué te funciona y qué te dice tu comunidad. Nunca hay que repetirle nada.

## Los 6 pilares

Los pilares forman un ciclo: lo que aprende el pilar 6 alimenta el pilar 1.

| # | Pilar | Qué hace | Qué aporta a la memoria |
|---|---|---|---|
| 1 | **Conocer** | Tu marca personal: quién eres, cómo hablas, qué construyes, tu historia, lo que sabes, tus opiniones y tu contenido pasado | La base de todo |
| 2 | **Idear** | Ideas a partir de tu marca personal y de lo que funciona, y **guion en tu voz** para cada una (lo puedes afinar tú). **Inspiración:** ideas que salen de tu competencia y de las tendencias de tu nicho, más ideas nuevas creadas con el agente desde tu marca personal. Plan semanal con equilibrio de temas | El plan, los guiones y la inspiración |
| 3 | **Editar** | Subes tus vídeos grabados y Mova los edita automáticamente en cola (cortar silencios, limpiar el audio, subtítulos) y escribe el copy (descripción y hashtags). Solo la grabación se hace fuera de Mova. Ver [Edición automática](#edición-automática) | Vídeos listos en el banco |
| 4 | **Publicar** | Banco de vídeos, calendario y publicación en Instagram y TikTok a la mejor hora | Qué salió y cuándo |
| 5 | **Conversar** | Bandeja única de comentarios, respuestas en tu voz y automatizaciones tipo ManyChat. Por ejemplo, alguien comenta "INFO" y recibe un mensaje privado con tu enlace | Leads, dudas frecuentes y lo que pide la audiencia |
| 6 | **Aprender** | Qué vídeos traen alcance, confianza y conversaciones | Qué funciona, y vuelve al pilar 1 |

## Inspiración

Es una parte clave del pilar Idear y **hay que hacerla**. Mezcla dos fuentes de ideas en un mismo lugar:

1. **Ideas de fuera:** vídeos de tu competencia, de tus referentes y de las tendencias de tu nicho (hashtags, formatos y temas que están funcionando).
2. **Ideas nuevas:** las que creas con el agente a partir de tu marca personal y lo que te funciona. Es el chat de ideas actual.

Las dos acaban en el mismo banco de ideas, y de ahí van a guion.

### Feed de referencias

El método técnico para conseguir el contenido de las redes está por definir.

**Qué es:** un feed dentro de Mova, estilo TikTok, con vídeos reales de Instagram y TikTok de tu nicho, de tus referentes y de las tendencias. Mova los recomienda según lo que tú haces. No hace falta ir a buscarlos.

**Cómo se usa:**
- Tocas un vídeo y se abre el reproductor.
- Al lado se abre un chat con el agente, que tiene ese vídeo como contexto. Le puedes preguntar por qué funciona, o pedirle que lo adapte a tu marca y te dé el guion.
- Las ideas que salen de ahí se guardan como cualquier otra.

**Métodos candidatos** (hay que investigarlos y decidir; lo ideal es combinar varios):

| Método | Qué da | Estado legal |
|---|---|---|
| Instagram Business Discovery API | Publicaciones, textos y métricas públicas de otras cuentas profesionales, indicando su usuario | Oficial. Requiere la aprobación de Meta |
| Instagram Hashtag Search API | Publicaciones más populares y más recientes de un hashtag. Límite de 30 hashtags por semana | Oficial. Requiere la aprobación de Meta |
| oEmbed de Instagram y TikTok | Reproducir dentro de Mova cualquier vídeo público a partir de su enlace | Oficial |
| "Guardar en Mova" (extensión de navegador o compartir desde el móvil) | El founder guarda vídeos que ve en la app y Mova los analiza y los usa para recomendar | Oficial. Lo aporta el usuario |
| Proveedores de datos de terceros (scraping) | Descubrir contenido de TikTok y búsquedas amplias | Va contra las condiciones de las plataformas. Solo si se asume el riesgo |

TikTok no ofrece una API oficial de descubrimiento de contenido para uso comercial: su Research API es solo académica. Es el punto más difícil.

## Edición automática

Decidido. Se empieza de cero: Scribe se hizo con ffmpeg y no funcionó bien. Cada vídeo se edita **con el contexto de los vídeos del founder** y con **sus indicaciones**.

### Qué hace en la primera versión

- Corta silencios y tomas repetidas, usando el guion para quedarse con la mejor toma.
- Limpia el audio: quita ruido y nivela el volumen.
- Subtítulos animados y zooms suaves en momentos clave.
- Música libre de derechos incluida en el vídeo. Mova tiene una biblioteca propia, elige el tema según el tono y baja el volumen mientras hablas. La API de Instagram no permite usar su biblioteca de canciones.
- Más adelante: b-roll (imágenes de apoyo encima de lo que dices).

### Editado con contexto

- **Estilo del founder:** Mova aprende de sus vídeos cómo edita (ritmo de cortes, estilo de subtítulos, zooms, tipo de música y duración) y qué estilo le da mejores métricas. Los vídeos nuevos siguen ese estilo.
- **Memoria del founder:** usa el guion, su tono y las fichas de sus vídeos anteriores, por ejemplo para no repetir la misma música varios días seguidos.
- **Indicaciones (prompt):** el founder puede escribir cómo quiere la edición, para un vídeo, para un lote o como preferencia fija ("más dinámico", "música tranquila", "sin zooms"). También se lo puede pedir al agente en el chat.
- **Prioridad:** primero las indicaciones, después el estilo aprendido y, si no hay nada, el estilo por defecto de Mova.

### Estilo de subtítulos

- **Por defecto: solo subtítulos.** Geist SemiBold en blanco, a la altura del pecho, de 2 a 4 palabras, aparición suave, sin rebotes ni colores, con una sombra difusa solo para que se lea. Acompaña, no roba protagonismo. Nada más.
- **Edición más desarrollada:** Mova la aplica si la ve en el perfil del founder (su estilo aprendido) o si la pide con un prompt. Por ejemplo: "empieza con un hook de b-roll y música de suspenso, después salgo yo hablando a cámara y al final un fragmento de una película". Claude arma el plan de edición y el worker lo monta con el material que el founder suba (b-roll, clips) y la biblioteca de música. Los fragmentos de películas tienen derechos de autor: Instagram puede silenciarlos o bloquear el vídeo.
- **Tipografías de cada marca:** en el onboarding, Claude analiza los vídeos del founder y define su estilo de subtítulos (tipografía, peso, tamaño, posición, color, mayúsculas y palabras a la vez). Elige la tipografía más parecida de **Google Fonts** (~1.800, uso comercial gratis) y el worker la descarga la primera vez. No se descargan tipografías de otros sitios: muchas son de pago.
- El estilo queda guardado en su marca. El founder puede cambiarlo o subir su propia tipografía si tiene la licencia.

### Visión: vídeo de referencia

- **Estilo más común de los founders (referencia 2):** cámara frontal en casa, título arriba al empezar, subtítulos a la altura del pecho y cortes con zoom. Sirve para entender cómo graban la mayoría; no es el estilo por defecto.

Estilo al que queremos llegar (vídeo de un founder, 35 s):

- **Gancho (primeros ~8 s):** montaje con planos de apoyo cortados cada ~1 s, color oscuro y cinematográfico, textura de grano y líneas. Texto grande en el centro, palabra a palabra, mezclando una sans en negrita con una **serif cursiva ligera** para la palabra clave ("is very *important*", "cashflow *management*").
- **Cuerpo:** entrevista con varios planos (primer plano y plano general), color natural. Subtítulos pequeños en sans regular blanca, de 3 a 5 palabras, a veces con una caja oscura translúcida detrás.
- **Qué puede hacer Mova:** gancho tipográfico con palabra clave destacada (Claude elige cuál, Remotion lo anima), gradación de color y grano, subtítulos pequeños con caja opcional, y simular varios planos con una sola cámara (zoom de encuadre en cada corte). Música.
- **Qué depende de la grabación:** los planos de apoyo (b-roll) y los planos reales de varias cámaras necesitan que el founder grabe ese material. Mova puede pedirlo en el guion ("graba 3 planos de ti trabajando") y montarlo solo.

### Cómo funciona

1. **Whisper** transcribe con marcas de tiempo por palabra.
2. **Claude** decide los cortes y el plan de edición, con el contexto y las indicaciones.
3. **ffmpeg** corta el vídeo (el trabajo pesado, rápido y barato) y **DeepFilterNet** limpia el audio: quita el ruido y realza la voz.
4. **Remotion** añade los subtítulos animados, los zooms, los efectos y la música.

### Dónde corre

- Por ahora en el computador del equipo (Windows, 16 GB de RAM, 512 GB de disco), como un programa (worker) que revisa una cola en Supabase.
- El computador no queda expuesto a internet: el worker sale a buscar trabajo y no recibe conexiones.
- Si el computador está apagado, los vídeos esperan en la cola.
- Cuando haya clientes, el mismo worker pasa a un servidor en la nube sin reescribirlo.

### Tiempos de edición

Medido en el PC del equipo (Windows, procesador sin tarjeta gráfica dedicada): un vídeo de 21 s tardó 44-47 s. **La edición tarda unas 2 veces lo que dura el vídeo**, más el tiempo de subida.

| Vídeo | Tiempo de edición aprox. |
|---|---|
| 30 s | ~1 min |
| 60 s | ~2 min |
| 90 s | ~3 min |
| Lote de 10 vídeos de 45 s | ~15 min (se editan uno detrás de otro) |

- Es una medida con un vídeo de WhatsApp (baja resolución). Un original del móvil en 1080p tardará algo más, y en 4K bastante más: conviene grabar en 1080p.
- Cuando se sumen Remotion (efectos) y Claude (plan de edición), el tiempo subirá un poco.
- En un servidor en la nube con más núcleos, o con varios workers a la vez, baja a ~1 vez la duración o menos.

### Almacenamiento: Cloudflare R2

- 10 GB gratis; después, ~$0,015 por GB al mes y sin costo por descargas.
- Da el enlace público que Instagram necesita para publicar.
- Ciclo de cada vídeo: el original se borra al editarlo, el editado vive en el banco y, al publicarse en Instagram, se borra de Mova.

### Ficha de cada vídeo

Antes de borrar el vídeo, Mova guarda su ficha en la memoria del founder. Es solo texto:

- **Lo que dice:** transcripción, temas, gancho y llamada a la acción.
- **Lo que se ve:** Claude mira unos fotogramas y anota ropa, lugar, encuadre, luz y si sale alguien más (~1 céntimo por vídeo).
- **Cómo se editó:** estilo, música e indicaciones usadas.
- **Cómo rindió:** las métricas de Instagram.

Con la ficha, el agente puede avisar si repites ropa o lugar, cruzar lo visual y la edición con las métricas ("tus vídeos en exteriores tienen el doble de vistas") y encontrar vídeos pasados ("¿en qué vídeo hablé de mi primera venta?").

## Principios

### 1. Hecho para personas y para agentes: el humano decide, el agente ejecuta

- **Todo se puede hacer desde la interfaz o pidiéndoselo al agente.** Son las mismas acciones por los dos caminos. Por ejemplo, "Calendarízame los últimos vídeos para esta semana" hace lo mismo que arrastrarlos al calendario.
- **La interfaz humana no es secundaria.** Tiene que ser clara, rápida y agradable aunque nunca uses el chat.
- **El agente siempre tiene contexto.** Está disponible en todas las pantallas y sabe qué estás viendo.
- **Es proactivo, pero no decide por ti.** Te propone el plan de la semana, te avisa si el banco se vacía, detecta dudas repetidas en los comentarios y te las propone como vídeo, y marca las conversaciones que merecen tu atención.
- **Tiene autonomía por niveles, y la eliges tú:**
  - **Sugiere:** te propone algo.
  - **Prepara:** lo deja listo para que lo apruebes.
  - **Ejecuta:** lo hace cuando lo apruebas.
  - **Automático:** actúa sin preguntar, pero solo con reglas que tú creaste, como la respuesta automática a "INFO".
- **Es transparente.** Todo lo que hace queda registrado y se puede deshacer. Nunca publica ni responde nada que no hayas autorizado.

### 2. El banco de vídeos

- Los vídeos editados y con copy entran en un **banco**, una cola de vídeos listos para publicar.
- El calendario se llena desde el banco, a mano o pidiéndoselo al agente, y **el banco se vacía a medida que se publica**.
- Mova muestra siempre **cuántos días de contenido te quedan** y avisa antes de que se acabe.

### 3. Alto volumen y rapidez

- Los founder creators publican **uno o dos vídeos al día, como mínimo**. Mova tiene que aguantar ese ritmo sin fricción.
- **Todo por lotes:** subir 10 vídeos de golpe, editarlos en cola en segundo plano, generar sus copys y programar la semana en una sola acción.
- **Rápido de verdad:** la interfaz responde al instante, el trabajo pesado va en segundo plano y nunca te hace esperar para seguir.

## MVP para clientes

Todo menos **automatizaciones** y **comunidad** (pilar Conversar), que van después.

| Módulo | Qué incluye | Depende de |
|---|---|---|
| Onboarding y perfil | Conectar Instagram y TikTok; Mova crea el perfil a partir de los vídeos | App de Meta, app de TikTok, IA |
| Ideas y guiones | Chat con IA, ideas y guion en tu voz | Clave de Anthropic |
| Feed de inspiración | Vídeos de tu nicho y tus referentes, con chat al lado para sacar ideas | Método por decidir (ver Inspiración) |
| Banco de vídeos | Subida por lotes, copy con IA, cola con días de contenido | Clave de Anthropic |
| Edición automática | Cortes, audio limpio, subtítulos animados, zooms y música, en cola | Worker con Whisper, ffmpeg, DeepFilterNet y Remotion; Cloudflare R2 |
| Calendario y publicación | Programar la semana y publicar solo en Instagram y TikTok | Apps de Meta y TikTok |
| Métricas | Alcance e interacción de cada vídeo, y qué te funciona | Apps de Meta y TikTok |

## Hoja de ruta

| Fase | Pilar | Qué incluye | Estado |
|---|---|---|---|
| 0 · Base | | Web, login (Google y correo), sistema de diseño, Mi marca manual | Hecho |
| 1 · Ideas | Idear | Chat con IA (Claude Sonnet 5) con ideas guardables y guion breve | Hecho |
| 2 · Mi marca automática | Conocer | Conectar Instagram y TikTok por API oficial, analizar vídeos propios, perfil de voz. Sección "Tu historia y tu visión" (hecho) | Siguiente |
| 2b · Guiones | Idear | Guion completo en la voz del founder a partir de una idea, editable | |
| 2c · Inspiración | Idear | Feed de competencia y tendencias con chat lateral para sacar ideas, unido al chat de ideas nuevas. Método de obtención por definir | |
| 3 · Banco y edición | Editar | Subida por lotes, edición automática en cola (ver Edición automática), ficha de cada vídeo, copys automáticos | |
| 4 · Publicación | Publicar | Calendario desde el banco y publicación automática en Instagram y TikTok | |
| 5 · Agente | Todos | Chat con contexto en todas las pantallas que ejecuta acciones, y proactividad | |
| 6 · Comunidad | Conversar | Bandeja de comentarios, respuestas sugeridas, automatizaciones tipo ManyChat (primero en Instagram) | |
| 7 · Resultados | Aprender | Métricas por vídeo que vuelven a la memoria | |

## Reglas de plataforma

Mova es un producto comercial, así que solo usa las vías oficiales:

- **Contenido propio:** el usuario conecta su cuenta con OAuth.
  - Instagram API: requiere cuenta profesional y revisión de la app por Meta.
  - TikTok Login Kit y Display API: requieren aprobación de TikTok.
  - Durante el desarrollo, ambas funcionan en modo desarrollo con cuentas de prueba.
- **Comentarios y mensajes (Conversar):** Instagram permite, por su API oficial, responder comentarios y mandar un mensaje privado a quien comenta, que es como funciona ManyChat. En TikTok las opciones oficiales son más limitadas.
- **Contenido de otras cuentas:** no se extrae con scraping. Solo vías oficiales (hashtags de Instagram) o enlaces que aporte el usuario.
