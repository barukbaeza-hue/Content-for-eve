# Mova · Producto

**Crea. Mueve. Crece.** El sistema operativo de contenido para founder creators.

## ICP

**Founder creators.** Fundadores y dueños de negocios pequeños o medianos que publican vídeos cortos en Instagram y TikTok para conseguir clientes. Son vídeos sencillos: hablan a cámara y editan poco.

- **Qué les duele:** no tienen tiempo, no saben qué contar, les cuesta la cámara y no son constantes.
- **Qué quieren:** que el contenido les traiga clientes sin que les coma el día.
- **Por qué los founder creators y no los creadores freelance:**
  - Pagan más y abandonan menos.
  - Casi nadie resuelve el vídeo corto para founder creators; las herramientas para fundadores se centran en LinkedIn.
  - Encajan de lleno con Scribe: vídeos hablando a cámara con poca edición.
- Evelyn es la primera usuaria de prueba. Casi todo lo que se construye vale para los dos perfiles.

## Propuesta de valor

De tu negocio a tus vídeos, con tu forma de hablar:

1. **Mova te conoce:** conectas tus redes, analiza tus vídeos y aprende cómo hablas, tus temas y qué te funciona.
2. **Ideas desde tu negocio:** preguntas de clientes, objeciones, historias, lo que sabes de tu sector.
3. **Guion en tu voz,** listo para leer mientras grabas.
4. **Grabas y Scribe edita:** corta silencios, quita ruido y pone subtítulos.
5. **Copy y publicación** en Instagram y TikTok.

## Hoja de ruta

| Fase | Qué incluye | Estado |
|---|---|---|
| 0 · Base | Web, login (Google y correo), sistema de diseño, Mi marca manual | Hecho |
| 1 · Ideas | Chat con IA (Claude Sonnet 5) con ideas guardables | Hecho |
| 2 · Mi marca automática | Conectar Instagram y TikTok por API oficial, analizar vídeos propios, perfil de voz, pilares y lo que mejor funciona | Siguiente |
| 3 · Guion y grabación | Guion en su voz y modo teleprompter en el móvil | |
| 4 · Edición | Integrar Scribe: cortar silencios, quitar ruido, subtítulos | |
| 5 · Copys y calendario | Descripción y hashtags, programación y publicación | |
| 6 · Inspiración | Vídeos de referencia y tendencias por vías oficiales (hashtags de Instagram) | |

## Reglas de plataforma

Mova es un producto comercial, así que solo usa las vías oficiales:

- **Contenido propio:** el usuario conecta su cuenta con OAuth.
  - Instagram API: requiere cuenta profesional y revisión de la app por Meta.
  - TikTok Login Kit y Display API: requieren aprobación de TikTok.
  - Durante el desarrollo, ambas funcionan en modo desarrollo con cuentas de prueba.
- **Contenido de otras cuentas:** no se extrae con scraping. Solo vías oficiales (hashtags de Instagram) o enlaces que aporte el usuario.
