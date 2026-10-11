# XeooAuditor — Design System Specification

## 1. Overview & Direction Rationale

### 1.1 Product Purpose & Target Audience
**XeooAuditor** is a privacy-first public website auditing toolkit. It evaluates technical aspects of submitted public URLs (e.g. SSL/TLS, robots.txt, sitemaps, canonical tags, broken links, response headers, and SEO hygiene) and presents actionable findings with clear evidence and remediation guidance.
The primary users are **website owners, developers, devops engineers, and technical SEO practitioners** who need accurate, objective data quickly.

### 1.2 Design Direction: Data-Dense Technical Dashboard
Generated and evaluated using the **`ui-ux-pro-max`** design intelligence engine (query: *"technical website auditing SaaS analytics dashboard professional data dense trustworthy"*).

- **Core Paradigm:** Enterprise Data-Dense Dashboard.
- **Tone & Mood:** Professional, precise, technical, objective, and trustworthy.
- **Visual Weight:** Restrained elevation and shadows; architectural 1px borders (`--color-border`) carry structure.
- **Information Density:** High information density without visual chaos. Compact table rows (36–38px), concise metric tiles, and collapsible technical evidence drawers.
- **Zero Decorative Fluff:** No artificial gradients, no glassmorphism, no oversized empty hero banners inside operational views, and no emojis as icons.

---

## 2. Token Architecture

The design system follows a strict **Three-Layer Token Architecture**:
```
┌────────────────────────────────────────┐
│  Layer 1: Primitive Tokens (Raw)      │  e.g. --blue-800: #1e40af;
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│  Layer 2: Semantic Tokens (Purpose)    │  e.g. --color-brand-primary: var(--blue-800);
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│  Layer 3: Component Tokens / Classes   │  e.g. .xa-btn-primary { background: var(--color-brand-primary); }
└────────────────────────────────────────┘
```
The canonical single source of truth is implemented in [`frontend/src/styles/design-tokens.css`](file:///c:/laragon/www/PROJECT_GIT/xeoo_auditor/frontend/src/styles/design-tokens.css), integrated seamlessly with Tailwind CSS v4 via `@theme`.

---

## 3. Color Palette & Semantic Usage

### 3.1 Primary Brand Palette (Technical Blue)
Technical Deep Blue conveys analytical precision, engineering rigor, and institutional trustworthiness:
- **`--blue-800` (`#1E40AF`):** Primary action color, brand anchor, active tabs.
- **`--blue-700` (`#1D4ED8`):** Text links, secondary actions.
- **`--blue-600` (`#2563EB`):** Focus rings, interactive highlights.
- **`--blue-500` (`#3B82F6`):** Secondary accent, active border states.
- **`--blue-50` (`#EFF6FF`):** Brand subtle tinted background, selected row highlight.

### 3.2 Neutral Surface & Typography Palette (Slate)
Provides high contrast and eliminates eye fatigue during dense code or audit log inspection:
- **`--slate-50` (`#F8FAFC`):** Application canvas background.
- **`--slate-100` (`#F1F5F9`):** Secondary surface, table header background, badge neutral bg.
- **`--slate-200` (`#E2E8F0`):** Standard component border, card outline.
- **`--slate-300` (`#CBD5E1`):** Form input borders, emphasized dividers.
- **`--slate-500` (`#64748B`):** Muted metadata, helper labels, timestamps.
- **`--slate-700` (`#334155`):** Secondary text, table headers.
- **`--slate-900` (`#0F172A`):** Primary headings, body copy (high-contrast WCAG AAA 14:1+).

### 3.3 Audit Status Semantic Colors
Crucial for XeooAuditor findings as mandated by `AGENTS.md` and website auditing requirements:

| Status | Meaning | Text / Icon Color | Background Color | Border Color | Light Hex | Dark Hex |
|:---|:---|:---|:---|:---|:---|:---|
| **`PASS`** | Verified compliant check | `--color-status-pass-text` | `--color-status-pass-bg` | `--color-status-pass-border` | `#15803D` / `#F0FDF4` | `#4ADE80` / `#052E16` |
| **`FAIL`** | Non-compliant / critical issue | `--color-status-fail-text` | `--color-status-fail-bg` | `--color-status-fail-border` | `#B91C1C` / `#FEF2F2` | `#F87171` / `#450A0A` |
| **`WARNING`** | Suboptimal / advisory finding | `--color-status-warning-text` | `--color-status-warning-bg` | `--color-status-warning-border` | `#B45309` / `#FFFBEB` | `#FBBF24` / `#422006` |
| **`NOT_CHECKED`** | Skipped, timed out, or rate-limited | `--color-status-not-checked-text`| `--color-status-not-checked-bg`| `--color-status-not-checked-border`| `#475569` / `#F1F5F9` | `#94A3B8` / `#1E293B` |
| **`MANUAL_REQUIRED`**| Needs manual audit / credentials | `--color-status-manual-text` | `--color-status-manual-bg` | `--color-status-manual-border` | `#6D28D9` / `#F5F3FF` | `#A5B4FC` / `#1E1B4B` |

---

## 4. Typography & Font Pairing

Technical auditing interfaces require two distinct typography tiers:
1. **Sans-Serif (`--font-sans`):** `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif.
   - Used for: Navigation, page headings, card titles, form labels, general descriptive prose.
2. **Monospace (`--font-mono`):** `Fira Code`, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace.
   - Used for: Target URLs, HTTP status codes (`200 OK`, `301 Moved`, `404 Not Found`), response headers (`Content-Security-Policy`), timing latencies (`142ms`), IP addresses, SSL cipher suites, robots.txt directives.

### 4.1 Type Scale
- **`--text-2xs` (11px / 0.6875rem):** Micro-badges, table cell metadata, status timestamps.
- **`--text-xs` (12px / 0.75rem):** Data table headers, code snippet badges, input labels.
- **`--text-sm` (14px / 0.875rem):** Default body text, data table cells, button text, form inputs.
- **`--text-base` (16px / 1.0rem):** Card titles, leading summary text.
- **`--text-lg` (18px / 1.125rem):** Section titles, modal titles.
- **`--text-xl` (20px / 1.25rem):** Page sub-headings, KPI card metrics.
- **`--text-2xl` (24px / 1.5rem):** Primary page titles.

---

## 5. Spacing, Radii, Shadows & Motion

### 5.1 Spacing Scale (4px Base)
Dense interface spacing:
- `--space-0-5` (2px), `--space-1` (4px), `--space-1-5` (6px), `--space-2` (8px), `--space-2-5` (10px)
- `--space-3` (12px), `--space-4` (16px), `--space-5` (20px), `--space-6` (24px), `--space-8` (32px)

### 5.2 Technical Border Radius
Restrained radii ensure an engineering/tool aesthetic rather than a consumer playful feel:
- **`--radius-xs` (2px):** Monospace tags, status dots.
- **`--radius-sm` (4px):** Buttons, text inputs, status badges.
- **`--radius-md` (6px):** Metric tiles, cards, dropdown menus.
- **`--radius-lg` (8px):** Dialog modals, major section containers.
- **`--radius-full` (9999px):** Circular status indicators, pill tags.

### 5.3 Elevation & Shadows
- Shadows are restrained (`--shadow-xs`, `--shadow-sm`). Visual hierarchy is maintained through subtle borders (`1px solid var(--color-border)`).
- Modals and overlays use `--shadow-lg` combined with a semi-transparent backdrop (`rgb(15 23 42 / 0.5)`).

### 5.4 Motion & Transitions
- Micro-interactions (button hovers, row highlights) use **150ms** (`--duration-fast`) with cubic-bezier standard curve.
- Drawer expansions or tab switches use **200ms** (`--duration-normal`).
- **Reduced Motion:** If `prefers-reduced-motion: reduce` is active, animations and transitions are forced to `0.01ms`.

---

## 6. Layout Grid & Breakpoints

- **Max Container:** `1360px` (`--container-max`).
- **Sidebar Width:** `240px` (`--sidebar-width`).
- **Top Header Height:** `56px` (`--header-height`).
- **Responsive Breakpoints:**
  - `sm` (640px): Single-column forms stack; audit search bar full width.
  - `md` (768px): KPI summary cards switch from 1 column to 2 columns.
  - `lg` (1024px): 12-column grid active; audit category navigation sidebar appears.
  - `xl` (1280px): Complete data table with all evidence columns expanded.

---

## 7. Component Specifications & Interaction States

### 7.1 Buttons (`.xa-btn`)
- **Primary (`.xa-btn-primary`):** For key actions ("Start Audit", "Export Report"). Deep blue background with high contrast white text.
- **Secondary (`.xa-btn-secondary`):** For neutral actions ("Filter", "Refresh"). White/surface background with border.
- **Ghost (`.xa-btn-ghost`):** For subtle inline actions ("Copy URL", "View Raw Headers").
- **States:**
  - `Default`: Clear border and background.
  - `Hover`: 1 shade darker background, cursor pointer.
  - `Focus-Visible`: 2px solid `--color-focus` with 2px offset.
  - `Disabled`: Opacity 0.6, cursor not-allowed, pointer-events none where appropriate.

### 7.2 Audit Status Badges (`.xa-badge`)
- Compact height (20–22px), small font (12px), semibold.
- Paired with an icon (`CheckCircle2`, `XCircle`, `AlertTriangle`, `MinusCircle`, `HelpCircle`) and descriptive text.

### 7.3 Data Tables (`.xa-table`)
- Sticky header (`position: sticky; top: 0; background: var(--color-surface-secondary);`).
- Row height: 38px standard, 32px compact.
- Hover state: Subtle background tint (`--color-surface-hover`).
- Cells format URLs and status codes with `.xa-code`.

---

## 8. Accessibility (WCAG 2.1 AA Compliance)

1. **Non-Color Exclusivity:** Statuses (`PASS`, `FAIL`, `WARNING`, `NOT_CHECKED`, `MANUAL_REQUIRED`) MUST NEVER be communicated via color alone. Every indicator must feature an explicit text label and/or an accessible icon with text alternative.
2. **Contrast Targets:** All text elements meet or exceed 4.5:1 contrast against their backgrounds (7:1 for headers).
3. **Keyboard Focus:** Every interactive control has an unmistakable `:focus-visible` ring (`outline: 2px solid var(--color-focus); outline-offset: 2px`).
4. **Touch Target Size:** Interactive elements maintain at least 36px height on desktop and 44px on mobile viewports.
5. **Screen Reader Live Regions:** Dynamic audit progress updates announce state transitions atomically using `aria-live="polite"`.

---

## 9. Anti-Patterns Specific to XeooAuditor

To maintain visual rigor and system integrity, avoid the following:
- ❌ **No Fake PASS Ratings:** Never mark an audit check as `PASS` if the test was omitted, rate-limited, or errored. Use `NOT_CHECKED` or `MANUAL_REQUIRED`.
- ❌ **No Emoji Icons:** Do not use Unicode emojis (e.g. ❌, ✅, ⚠️). Always use SVG Lucide icons (`lucide-react`).
- ❌ **No Consumer SaaS Fluff:** Avoid oversized illustrated mascots, confetti animations, or glassmorphic floating cards.
- ❌ **No Competing Token Systems:** Do not invent ad-hoc hex codes in inline styles or Tailwind arbitrary values (e.g. `bg-[#7a3b12]`). Reference defined tokens.
- ❌ **No Secret Exposure in UI:** Do not display credentials, authorization tokens, or internal stack traces in audit tables or error cards.

