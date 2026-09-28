# Sistema de diseño de Mova

Inspirado en el sistema de Linear: interfaz sobria, densa y rápida, sin sombras. La profundidad se consigue con capas de superficie y bordes de 1px. Los tokens viven en `src/app/globals.css`: la paleta por defecto de Tailwind está desactivada, así que solo se pueden usar los tokens de este documento.

## Principios

1. **Una acción principal por pantalla.** Solo un botón `primary` visible a la vez.
2. **Cada pantalla vacía dice qué hacer.** Siempre con un `EmptyState` que explica el siguiente paso.
3. **El color comunica, no decora.** El acento se reserva para la acción principal, el foco y el estado activo.
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

Claro y oscuro automáticos según el sistema del usuario.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `canvas` | `#0c0d0e` | `#fdfdfd` | Fondo de la app |
| `surface-1` | `#0f1011` | `#ffffff` | Panel de contenido, inputs |
| `surface-2` | `#17181a` | `#f4f5f6` | Hover, avisos |
| `surface-3` | `#1f2023` | `#ebecee` | Estado activo |
| `line` | `#23252a` | `#e6e7ea` | Bordes |
| `line-strong` | `#34343a` | `#d4d6da` | Bordes en hover |
| `fg` | `#f7f8f8` | `#1b1c1f` | Texto principal |
| `fg-2` | `#d0d6e0` | `#3c3f45` | Etiquetas |
| `fg-3` | `#8a8f98` | `#6b6f76` | Texto secundario, iconos |
| `fg-4` | `#62666d` | `#9b9ea5` | Placeholders, deshabilitado |
| `accent` | `#5e6ad2` | `#5e6ad2` | Acción principal, foco |
| `success` / `warning` / `danger` | `#4cb782` / `#f2994a` / `#eb5757` | `#1f9d55` / `#d97a1e` / `#d93b3b` | Estados |

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
