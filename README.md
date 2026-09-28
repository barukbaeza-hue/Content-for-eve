# Mova

**Crea. Mueve. Crece.** — El sistema operativo de contenido para founder creators. Visión, ICP y hoja de ruta en [PRODUCTO.md](PRODUCTO.md).

Web: https://mova-one-amber.vercel.app

Mova es una plataforma todo en uno para creadores de contenido en redes sociales. Reúne en un solo lugar todo el proceso de trabajo de un creador: encontrar ideas, crear el contenido, editarlo, programarlo, publicarlo y medir sus resultados.

## Funcionalidades

- **Ideas:** análisis del nicho y de la competencia para detectar qué funciona y proponer contenido relevante.
- **Creación con IA:** generación de ideas y copys.
- **Edición de video:** edición automática según el estilo de marca, con cola de procesamiento.
- **Calendario y publicación:** programación y subida automática a redes, con descripción y hashtags.
- **Métricas:** rendimiento del contenido publicado.

El objetivo es que el creador deje de saltar entre herramientas y gestione todo su contenido, de la idea a la publicación, desde un solo sitio.

## Desarrollo

Stack: Next.js 16 (App Router) + Supabase (base de datos, auth y almacenamiento) + Tailwind + Claude Sonnet 5 (API de Anthropic) para la IA.

```bash
cp .env.example .env.local   # y añade ANTHROPIC_API_KEY
npm install
npm run dev
```

Abre http://localhost:3000 y entra con Google o con correo y contraseña.

### Estructura

- `src/proxy.ts`: refresca la sesión y redirige a `/login` si no hay usuario.
- `src/lib/supabase/`: clientes de Supabase para servidor y navegador.
- `src/lib/ai.ts`: generación de ideas con Claude.
- `src/app/login`: inicio de sesión con Google o con correo.
- `src/app/(app)`: zona privada (Ideas, Copys, Calendario, Mi marca).
- `supabase/migrations`: esquema de la base de datos.
