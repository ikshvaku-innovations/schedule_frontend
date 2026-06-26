# Yudha Admin Platform — Design Language System

This document serves as the comprehensive design language and visual system reference for the **Yudha Admin Platform** (Design Quest Admin). It outlines all design principles, HSL custom properties, components, typography rules, layout structures, and interactive states that make up the unified platform experience.

---

## 1. Visual Philosophy & Core Identity

The Yudha design philosophy balances **academic precision** with a **premium, highly tactile web app interface**. 

### Key Characteristics:
*   **Vibrant Branding:** A single strong signature brand color (Vibrant Red) paired with a clean, low-contrast monochrome scale.
*   **Soft, Organic Shapes:** Unusually high border-radii (`1.5rem` / 24px) that give buttons, cards, dialogs, and inputs a soft, premium iOS-like feeling.
*   **Tactile Feedback:** Subtle elevation (drop shadows), backdrop filters (glassmorphism/blur), and micro-animations on interactive elements to make the dashboard feel responsive and alive.
*   **Deep Theme Support:** Seamless, high-contrast adaptation between clean Light Mode and deep Charcoal Dark Mode.

---

## 2. Color Palette & Custom Tokens

All colors are defined as **HSL coordinates** within `src/index.css` and mapped to Tailwind CSS variables in `tailwind.config.ts`. This allows smooth transitions and transparent overlays using HSL opacity modifiers (e.g., `bg-card/95`).

### Light & Dark Theme Configuration

| Token / Purpose | Light Mode HSL | Dark Mode HSL | Visual Representation / Color Name |
| :--- | :--- | :--- | :--- |
| **`--primary`** | `0 84% 60%` | `0 84% 60%` | Vibrant Brand Red (`#F23D3D`) |
| **`--primary-foreground`** | `0 0% 100%` | `0 0% 100%` | Pure White (`#FFFFFF`) |
| **`--background`** | `0 0% 100%` | `0 0% 5%` | Pure White / Deep Obsidian Charcoal (`#0D0D0D`) |
| **`--foreground`** | `0 0% 10%` | `0 0% 98%` | Ink Black (`#1A1A1A`) / Snow White (`#FAFAFA`) |
| **`--card`** | `0 0% 100%` | `0 0% 8%` | Pure White / Dark Slate Card Gray (`#141414`) |
| **`--card-foreground`** | `0 0% 10%` | `0 0% 98%` | Ink Black / Snow White |
| **`--popover`** | `0 0% 100%` | `0 0% 8%` | Pure White / Dark Slate Card Gray (`#141414`) |
| **`--popover-foreground`**| `0 0% 10%` | `0 0% 98%` | Ink Black / Snow White |
| **`--secondary`** | `0 0% 96%` | `0 0% 12%` | Light Muted Gray (`#F5F5F5`) / Dark Charcoal (`#1F1F1F`) |
| **`--secondary-foreground`**| `0 0% 10%` | `0 0% 98%` | Ink Black / Snow White |
| **`--muted`** | `0 0% 96%` | `0 0% 12%` | Light Muted Gray (`#F5F5F5`) / Dark Charcoal (`#1F1F1F`) |
| **`--muted-foreground`** | `0 0% 45%` | `0 0% 60%` | Medium Gray (`#737373`) / Light-Medium Gray (`#999999`) |
| **`--accent`** | `0 0% 96%` | `0 0% 12%` | Light Muted Gray / Dark Charcoal |
| **`--accent-foreground`** | `0 0% 10%` | `0 0% 98%` | Ink Black / Snow White |
| **`--success`** | `142 71% 45%`| `142 71% 45%`| Emerald Green (`#10B981`) |
| **`--success-foreground`** | `0 0% 100%` | `0 0% 100%` | Pure White (`#FFFFFF`) |
| **`--warning`** | `38 92% 50%` | `38 92% 50%` | Safety Amber Orange (`#F59E0B`) |
| **`--warning-foreground`** | `0 0% 100%` | `0 0% 100%` | Pure White (`#FFFFFF`) |
| **`--destructive`** | `0 84% 60%` | `0 84% 60%` | Vibrant Red (`#F23D3D`) |
| **`--destructive-foreground`**| `0 0% 100%` | `0 0% 100%` | Pure White (`#FFFFFF`) |
| **`--border`** | `0 0% 90%` | `0 0% 15%` | Light Border Gray (`#E5E5E5`) / Slate Border Gray (`#262626`) |
| **`--input`** | `0 0% 90%` | `0 0% 15%` | Light Border Gray (`#E5E5E5`) / Slate Border Gray (`#262626`) |
| **`--ring`** | `0 84% 60%` | `0 84% 60%` | Focus Brand Red (`#F23D3D`) |

### Sidebar Component Token Specs

The admin panel utilizes a dedicated high-contrast sidebar styling set:
*   **Background:** `var(--sidebar-background)` matches `--card` (White in Light, Dark slate gray in Dark).
*   **Foreground:** `var(--sidebar-foreground)` matches `--foreground`.
*   **Accent (Hover):** `var(--sidebar-accent)` matches `--muted` (Light Gray / Dark Charcoal).
*   **Primary (Active Item):** `var(--sidebar-primary)` is HSL Brand Red `0 84% 60%` with white text.
*   **Borders:** `var(--sidebar-border)` uses HSL `0 0% 90%` (Light) and `0 0% 15%` (Dark).

---

## 3. Shapes & Sizing Tokens

### Corner Radius System

Unlike typical design languages that use a standard `0.5rem` (8px) radius, Yudha implements a distinctive and premium highly-rounded radius scaling system:

```css
--radius: 1.5rem; /* 24px - Used for large Cards, Dialog containers, Page content areas */
```

Tailwind mappings calculate sub-elements to ensure visual nesting looks proportional:
*   **Large (lg):** `var(--radius)` — `1.5rem` (24px)
*   **Medium (md):** `calc(var(--radius) - 2px)` — `1.375rem` (22px) — *Used for buttons, main headers, inner containers, search bars.*
*   **Small (sm):** `calc(var(--radius) - 4px)` — `1.25rem` (20px) — *Used for tags, inputs, select boxes, badge elements.*

### Layout Spacing & Page Container
*   **Root Shell (`AdminLayout`):** Contains the header + page body with a full viewport background (`bg-background min-h-screen`).
*   **Page Margin & Padding:** Responsive scaling `p-4 md:p-6 lg:p-8` to handle standard laptops, desktop displays, and mobile views.
*   **Max Width Restraint:** Pages are wrapped in a container centered with a max-width of `max-w-7xl mx-auto w-full` to avoid wide horizontal line stretching on ultra-wide screens.

---

## 4. Typography & Formulas

Yudha utilizes a high-legibility system sans-serif font stack.

```css
body {
  font-feature-settings: "rlig" 1, "calt" 1; /* Ligature & context alternation active */
}
```

### Type Hierarchy:
*   **Main Headings (`h1`, `h2`, `h3`, `h4`, `h5`, `h6`):**
    *   Style: `@apply font-semibold tracking-tight;`
    *   Weight: `font-semibold` (600)
    *   Spacing: `tracking-tight` (negative letter spacing to give a robust, structural feeling)
*   **Body & Descriptions:**
    *   Main labels, controls: `text-sm` or `text-base` with standard tracking.
    *   Descriptions, auxiliary notes: `text-xs` or `text-sm` with `text-muted-foreground` color.

### Technical & Formula Formatting (LaTeX):
Since Yudha is an advanced assessment engine containing complex coding and mathematical formulas, typography handles math rendering seamlessly:
*   **Libraries:** Integrates LaTeX formatting utilizing math plugins (`remark-math` and `rehype-katex`).
*   **Component:** The standard `RichTextRenderer` processes math blocks and outputs beautiful, crisp academic-grade symbols.
*   **Visual Guidelines:** Code blocks and mathematical characters must always remain scrollable horizontally inside container bounds and avoid breaking visual columns.

---

## 5. UI Elements & Custom Editor Overrides

### Buttons
Standard Tailwind + Radix configurations:
*   **Primary Button:** `bg-primary text-primary-foreground hover:opacity-90 transition-opacity rounded-md` (rounded in standard variables).
*   **Secondary/Outline:** Muted colors with crisp border definitions.
*   **Ghost/Icon Controls:** Uses transparent background with hover highlights (`hover:bg-accent hover:text-accent-foreground`). Commonly paired with Lucide React icons.

### Inputs & Form Fields
*   **Background:** Matches `--background`.
*   **Borders:** Styled as `border-input` (`0 0% 90%` Light / `0 0% 15%` Dark).
*   **Focus Ring:** When selected, elements must glow with the brand focus ring: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.

### React Quill Rich-Text Editor Overrides

The rich text editor is customized in `src/index.css` to prevent standard white-canvas styles from clashing in dark mode or layout borders:

```css
/* Quill Toolbar styling matching background and borders */
.ql-toolbar.ql-snow {
  border-color: hsl(var(--border)) !important;
  background: hsl(var(--background)) !important;
}

/* Quill Editor Area overrides */
.ql-container.ql-snow {
  border-color: hsl(var(--border)) !important;
  background: hsl(var(--background)) !important;
}

.ql-editor {
  color: hsl(var(--foreground)) !important;
  min-height: 150px;
}

/* Input placeholder text */
.ql-editor.ql-blank::before {
  color: hsl(var(--muted-foreground)) !important;
}

/* Icons and fill SVG properties adjusted for Light/Dark themes */
.ql-snow .ql-stroke { stroke: hsl(var(--foreground)) !important; }
.ql-snow .ql-fill { fill: hsl(var(--foreground)) !important; }
.ql-snow .ql-picker-label { color: hsl(var(--foreground)) !important; }

/* Dropdown selections matching custom HSL border and popover colors */
.ql-snow .ql-picker-options {
  background: hsl(var(--popover)) !important;
  border-color: hsl(var(--border)) !important;
}

.ql-snow .ql-picker-item:hover {
  background: hsl(var(--accent)) !important;
  color: hsl(var(--accent-foreground)) !important;
}

/* Hover effects using signature Yudha Brand Red HSL */
.ql-toolbar.ql-snow .ql-picker-label:hover,
.ql-toolbar.ql-snow button:hover {
  color: hsl(var(--primary)) !important;
}

.ql-toolbar.ql-snow .ql-picker-label:hover .ql-stroke,
.ql-toolbar.ql-snow button:hover .ql-stroke {
  stroke: hsl(var(--primary)) !important;
}

.ql-toolbar.ql-snow .ql-active,
.ql-toolbar.ql-snow .ql-active .ql-stroke {
  stroke: hsl(var(--primary)) !important;
}
```

### Monaco Code Editor
*   **Theme Integration:** Integrates light and dark editor skins matching the admin console's main themes.
*   **Features:** Provides advanced bracket matching, linting alerts, code validation schemas, and high-readability syntax highlighting.

---

## 6. Feedback & Notification Design System (Toasts)

Notifications are managed with the **Sonner** library, customized to respect the Yudha HSL variables.

### Notification Categories:
1.  **Success:** Used for successful database saves, user updates, and correct authentication status.
2.  **Error:** Used for failed database connections, invalid credentials, and API timeouts.
3.  **Warning:** Alerts the admin about destructive actions (e.g., deleting questions, resetting passwords) or session timeouts.
4.  **Info:** General status notifications.

### Toast Styling Specifications:
*   **Border:** `border-border`
*   **Background:** `bg-background`
*   **Typography:** Title is standard color (`text-foreground`), and descriptions are muted (`text-muted-foreground`).
*   **Desktop Placement:** Positioned sticky in the **Top-Right** corner for quick peripheral notification without blocking workspace controls.
*   **Mobile Placement:** Positioned at the **Top** centered, full-width.

---

## 7. Motion & Interactive Polish

*   **Header Blur (Glassmorphism):** Header has a sticky positioning with translucent backdrop support:
    `bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60`
*   **Hover Transitions:** Standard clickable buttons, nav items, and links must transition colors over a `150ms` ease duration:
    `transition-colors duration-150`
*   **Dialog Overlay Fade-in:** Dialog modals enter with a clean background backdrop blur and scale-up zoom, controlled by Radix UI animations (`animate-in fade-in zoom-in-95`).
*   **Accordions:** Accordions animate their internal height with smooth transitions:
    *   *Expand:* `accordion-down 0.2s ease-out`
    *   *Collapse:* `accordion-up 0.2s ease-out`

---

## 8. Brand Logos & Assets

*   **Primary Admin Logo:** YudhaLogo.png
*   **Visual Properties:** Positioned in top-left header bar, styled as a responsive image (`h-12 w-auto object-contain`) with a responsive opacity transition `hover:opacity-80` to denote clickability back to home dashboard.
