---
version: alpha
name: Zen Ryu Sensei
colors:
  primary: "#ffd700"
  secondary: "#bc002d"
  background: "#070807"
  surface: "#141614"
  text: "#f5f2eb"
  text-muted: "#7a8a7a"
  border: "rgba(212, 175, 55, 0.18)"
typography:
  heading:
    fontFamily: "Cinzel, serif"
    fontWeight: 700
  body:
    fontFamily: "Inter, sans-serif"
    fontWeight: 400
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
rounded:
  sm: 4px
  md: 8px
  lg: 16px
---

# Sistema de Diseño Zen Ryu Sensei (Ink & Gold)

Este documento define la identidad visual de **Zen Ryu Sensei**. Ha sido diseñado bajo la filosofía estética tradicional japonesa "Ink & Gold" (tinta sumi-e profunda combinada con destellos y detalles en hoja de oro), asegurando una experiencia interactiva inmersiva, limpia y de alta gama.

## Filosofía del Diseño

1. **Minimalismo e Intencionalidad (Zen)**: Las interfaces deben respirar. El uso del espacio negativo (`spacing.lg` y `spacing.xl`) es fundamental para evitar la fatiga mental del usuario.
2. **Contraste de Tinta y Oro (Sumi-e)**: El fondo es un negro absoluto de tinta sumi-e (`colors.background`), sobre el cual se erigen las superficies de carbón (`colors.surface`). Los acentos dorados (`colors.primary`) guían el ojo del guerrero hacia elementos interactivos clave, y el carmesí (`colors.secondary`) señala desafíos o avisos críticos.
3. **Glassmorphism Translúcido**: Las tarjetas, ventanas flotantes y modales utilizan fondos translúcidos con desenfoque de fondo (`backdrop-filter: blur(12px)`) y bordes dorados tenues (`colors.border`) para simular paneles de papel shoji de seda.

## Paleta de Colores

* **Fondo Absoluto ({colors.background})**: `#070807` - La base de toda la aplicación. Evoca el silencio y la introspección antes del entrenamiento.
* **Superficies ({colors.surface})**: `#141614` - Utilizado para paneles, tarjetas y barras de herramientas. Ofrece suficiente contraste sobre el fondo absoluto.
* **Oro Primario ({colors.primary})**: `#ffd700` - Se usa exclusivamente para acentos de éxito, recompensas (monedas), el nivel del usuario y el nodo activo de la senda.
* **Rojo Carmesí ({colors.secondary})**: `#bc002d` - Color representativo de la laca y el sol naciente. Usado para botones de cerrar, advertencias y niveles difíciles.
* **Texto Principal ({colors.text})**: `#f5f2eb` - Blanco cálido pergamino. Reduce la fatiga visual que produce el blanco puro sobre fondos oscuros.
* **Texto Secundario ({colors.text-muted})**: `#7a8a7a` - Gris salvia/piedra para subtítulos, etiquetas inactivas y descripciones secundarias.
* **Bordes Shoji ({colors.border})**: `rgba(212, 175, 55, 0.18)` - Filo dorado translúcido que delimita los componentes de forma elegante.

## Tipografía

* **Títulos (heading)**: `Cinzel, serif`. Aporta un carácter marcial, histórico y venerable a los encabezados, secciones principales e hitos.
* **Cuerpo de texto (body)**: `Inter, sans-serif`. Garantiza legibilidad impecable para las instrucciones de los ejercicios, los textos de los diarios y los ajustes del lector.

## Reglas de Componentes

### 1. Tarjetas de Ejercicios y Bazar
* **Fondo**: `var(--glass-bg)` o `{colors.surface}` con opacidad.
* **Borde**: `1px solid var(--glass-border)`.
* **Hover**: Elevación física leve de `-4px` en el eje Y y un resplandor dorado suave en el borde.

### 2. Nodos del Sendero (Zen Path Nodes)
* Los nodos completados deben brillar en verde tenue o dorado.
* El nodo activo actual debe pulsar mediante una animación de brillo concéntrico dorado (`zenPulse`).
* Los nodos bloqueados deben ser opacos y discretos.
