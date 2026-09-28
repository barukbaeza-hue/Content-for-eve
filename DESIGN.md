# Sistema de diseño de Mova

Inspirado en el sistema de Linear, en versión monocromática: interfaz sobria, densa y rápida, sin sombras. La profundidad se consigue con capas de superficie y bordes de 1px. Los tokens viven en `src/app/globals.css`: la paleta por defecto de Tailwind está desactivada, así que solo se pueden usar los tokens de este documento.

## Principios

1. **Una acción principal por pantalla.** Solo un botón `primary` visible a la vez.
2. **Cada pantalla vacía dice qué hacer.** Siempre con un `EmptyState` que explica el siguiente paso.
3. **Jerarquía por contraste, no por color.** El máximo contraste (acento) se reserva para la acción principal y el foco.
4. **Sin sombras.** Capas de superficie + bordes `line`. La única sombra es `shadow-popover` para elementos flotantes.

## Tipografía

Geist. Solo dos pesos: **Regular (400)** para texto y **Medium (500)** para títulos, etiquetas y botones. `font-semibold` y `font-bold` no existen en el sistema.

Base de 14px. Interlineado siempre en múltiplos de 4px. Tracking negativo que crece con el tamaño; el texto pequeño es casi neutro para que se lea bien.

| Clase | Tamaño | Interlineado | Tracking | Uso |
|---|---|---|---|---|
| `text-2xs` | 11px | 16px | -0.003em | Badges, pestañas móviles |
| `text-xs` | 12px | 16px | -0.006em | Metadatos, textos de ayuda |
| `text-sm` | 13px | 20px | -0.009em | Navegación, etiquetas, botones, cabeceras de página |
| `text-base` | 14px | 20px | -0.011em | Cuerpo por defecto, inputs |
| `text-md` | 16px | 24px | -0.013em | Títulos de estados vacíos, cuerpo destacado |
| `text-lg` | 18px | 28px | -0.016em | Títulos de sección |
| `text-xl` | 20px | 28px | -0.018em | Títulos de tarjeta y modal |
| `text-2xl` | 24px | 32px | -0.021em | Títulos de página grandes |
| `text-3xl` | 32px | 40px | -0.025em | Display |

## Color

**Monocromático:** solo grises neutros, sin tinte. El acento es el propio texto principal (blanco en oscuro, casi negro en claro). No hay colores de estado: errores y confirmaciones se distinguen por su icono. La única excepción es el logo de Google, que su guía de marca obliga a mostrar en color.

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

## Espaciado, radios y alturas

- **Espaciado:** múltiplos de 4px (escala por defecto de Tailwind).
- **Radios:** `rounded-sm` 4px (badges) · `rounded-md` 6px (botones, inputs, items) · `rounded-lg` 8px (tarjetas) · `rounded-xl` 12px (paneles).
- **Alturas de control:** 28px (`sm`, items de menú) · 32px (`md`, botón por defecto) · 36px (inputs) · 40px (`lg`, formularios de acceso).
- **Iconos:** Lucide, 16px en escritorio y 20px en la barra móvil, trazo 1.75.

## Estructura

- **Escritorio:** barra lateral de 240px sobre `canvas` y el contenido en un panel `surface-1` con borde y `rounded-xl`. Cabecera de página de 44px.
- **Móvil:** cabecera superior con el logo y barra de pestañas inferior de 56px.

## Componentes

En `src/components/ui`: `Button` (`primary`, `secondary`, `ghost`), `Input`, `Textarea`, `Label`, `Notice` y `EmptyState`. En `src/components/shell`: `Nav`, `TabBar`, `Page` y `Logo`.
