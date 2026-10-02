# Sistema de diseño de Mova

Inspirado en el sistema de Linear, en versión monocromática: interfaz sobria, densa y rápida, sin sombras. La profundidad se consigue con capas de superficie y bordes de 1px. Los tokens viven en `src/app/globals.css`: la paleta por defecto de Tailwind está desactivada, así que solo se pueden usar los tokens de este documento.

## Principios

1. **Una acción principal por pantalla.** Solo un botón `primary` visible a la vez.
2. **Cada pantalla vacía dice qué hacer.** Siempre con un `EmptyState` que explica el siguiente paso.
3. **Jerarquía por contraste, no por color.** El máximo contraste (acento) se reserva para la acción principal y el foco.
4. **Sin sombras.** Capas de superficie + bordes `line`. Los elementos flotantes (menús, diálogos) usan **cristal**: la utilidad `glass`, fondo translúcido con desenfoque del contenido de detrás, borde sutil y sombra suave (inspirado en Google Flow).
5. **Escritorio primero.** Mova se usa sobre todo en el computador: cada pantalla se diseña primero para escritorio (contenido ancho, arrastrar y soltar, acciones al pasar el ratón) y después se adapta al móvil.
6. **Nada nativo del navegador.** Casillas, interruptores, desplegables, selectores de hora o fecha, burbujas de ayuda (`title`), alertas y confirmaciones del navegador se ven amateurs. Siempre se usa (o se crea) un componente propio con el estilo del sistema.

## Tipografía

Geist. Solo dos pesos: **Regular (400)** para texto y **Medium (500)** para títulos, etiquetas y botones. `font-semibold` y `font-bold` no existen en el sistema.

Base de 15px. Interlineado siempre en múltiplos de 4px. Tracking negativo que crece con el tamaño; el texto pequeño es casi neutro para que se lea bien.

| Clase | Tamaño | Interlineado | Tracking | Uso |
|---|---|---|---|---|
| `text-2xs` | 11px | 16px | -0.003em | Badges, pestañas móviles |
| `text-xs` | 12px | 16px | -0.006em | Metadatos, textos de ayuda |
| `text-sm` | 14px | 20px | -0.011em | Navegación, etiquetas, botones, cabeceras de página |
| `text-base` | 15px | 24px | -0.012em | Cuerpo por defecto, inputs en escritorio |
| `text-md` | 16px | 24px | -0.013em | Títulos de estados vacíos, inputs en móvil (evita el zoom de iOS) |
| `text-lg` | 18px | 28px | -0.016em | Títulos de sección |
| `text-xl` | 22px | 28px | -0.019em | Títulos de sección de página, tarjetas y modales |
| `text-2xl` | 26px | 32px | -0.022em | Títulos grandes (login) |
| `text-3xl` | 32px | 40px | -0.025em | Display |

## Color

**Monocromático:** solo grises neutros, sin tinte. El acento es el propio texto principal (blanco en oscuro, casi negro en claro). No hay colores de estado: errores y confirmaciones se distinguen por su icono. Excepciones: el rojo `danger`, solo para acciones destructivas (borrar), y el logo de Google, que su guía de marca obliga a mostrar en color.

Claro y oscuro automáticos según el sistema del usuario.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `canvas` | `#0c0c0c` | `#fdfdfd` | Fondo de la app |
| `surface-1` | `#0f0f0f` | `#ffffff` | Panel de contenido, inputs |
| `surface-2` | `#171717` | `#f4f4f4` | Hover, avisos |
| `surface-3` | `#1f1f1f` | `#ebebeb` | Estado activo |
| `line` | `#242424` | `#e6e6e6` | Bordes |
| `line-strong` | `#333333` | `#d4d4d4` | Bordes en hover |
| `fg` | `#f5f5f5` | `#171717` | Texto principal |
| `fg-2` | `#d4d4d4` | `#3d3d3d` | Etiquetas |
| `fg-3` | `#8f8f8f` | `#6e6e6e` | Texto secundario, iconos |
| `fg-4` | `#636363` | `#9e9e9e` | Placeholders, deshabilitado |
| `accent` | `#f5f5f5` | `#171717` | Acción principal, foco, logo |
| `accent-hover` | `#d4d4d4` | `#3d3d3d` | Hover de la acción principal |
| `on-accent` | `#0c0c0c` | `#ffffff` | Texto sobre el acento |
| `danger` | `#f87171` | `#dc2626` | Solo acciones destructivas (borrar) |
| `glass` | `rgb(28 28 28 / 0.6)` | `rgb(255 255 255 / 0.72)` | Fondo de menús y diálogos, con desenfoque |

## Espaciado, radios y alturas

- **Espaciado:** múltiplos de 4px (escala por defecto de Tailwind).
- **Radios:** `rounded-sm` 4px (badges) · `rounded-md` 6px (botones, inputs, items) · `rounded-lg` 8px (tarjetas) · `rounded-xl` 12px (paneles).
- **Alturas de control:** 28px (`sm`, items de menú) · 32px (`md`, botón por defecto) · 36px (inputs) · 40px (`lg`, formularios de acceso).
- **Iconos:** Lucide, 16px en escritorio y 20px en la barra móvil, trazo 1.75.

## Estructura

- **Escritorio:** barra lateral de 240px sobre `canvas` y el contenido en un panel `surface-1` con borde y `rounded-xl`. Cabecera de página de 44px.
- **Móvil:** cabecera superior con el logo y barra de pestañas inferior de 56px.

## Componentes

En `src/components/ui`: `Button` (`primary`, `secondary`, `ghost`, `danger`), `Input`, `Textarea`, `Label`, `Notice`, `EmptyState` y `ConfirmDialog` (diálogo de cristal, en lugar de `confirm`).

Controles propios (`controls.tsx`), nunca los nativos: `Checkbox` (casilla de 16px que se rellena con el acento), `Switch` (interruptor para activar opciones), `Select` (botón como un campo que abre un menú de cristal) y `Pill` (píldora que se marca, por ejemplo para elegir redes). También `MenuButton` (botón con icono que abre un menú de cristal: filtros, orden), `Pagination` (flechas y números), `Skeleton` (esqueletos de carga con el mismo layout de cada sección), burbujas de ayuda con el atributo `data-tip="…"` (las muestra `Tooltips`, en el layout) y avisos breves con `toast("…")` (en lugar de `alert`). En `src/components/shell`: `Nav`, `TabBar`, `Page` y `Logo`.

Los menús flotantes de cristal (tres puntos, banco del calendario, selectores) usan las clases compartidas de `src/components/ui/menu.ts`: mismo cristal, relleno, filas y separadores. Lo único que cambia entre ellos es el fondo que tienen detrás.

El calendario de publicación usa **FullCalendar** (vistas de mes y semana, arrastrar y soltar), con sus colores sacados de los tokens en `globals.css` (`.mova-calendar`). No se reinventan componentes que ya existen y están probados.
