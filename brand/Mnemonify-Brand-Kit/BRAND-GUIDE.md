# Mnemonify Brand Guide

## Brand foundation

**Name:** Mnemonify  
**Tagline:** Learning creation for everyone.  
**Values:** Open, Simple, Flexible, Community

## Approved logo

The approved mark is a perfectly symmetrical M-shaped pathway network. The four outside node centers form a square. Never stretch, skew, rotate, or redraw the mark.

### Primary files

- `logos/svg/mnemonify-primary-horizontal.svg` for websites and application interfaces
- `logos/png/mnemonify-primary-horizontal.png` for raster-only uses
- `logos/svg/mnemonify-mark.svg` for compact placements
- `app-icons/svg/mnemonify-app-icon-light.svg` and `mnemonify-app-icon-dark.svg` for app icon sources

## Logo geometry

- Mark aspect ratio: **1:1**
- Outer node centers: **140 by 140 units**, forming a square
- Connecting line width: **14 units**
- Outer node radius: **18 units**
- Center node radius: **16 units**
- Clear space: at least one outer-node diameter around the logo

## Color palette

### Primary

- Deep Navy: `#0A1020`
- Primary Blue: `#2563EB`
- Bright Cyan: `#06B6D4`
- Emerald: `#10B981`
- Violet: `#7C3AED`
- Light Gray: `#F1F5F9`

### Secondary

- Indigo: `#4F46E5`
- Purple: `#6D28D9`
- Coral: `#FF6B6B`
- Teal: `#14B8A6`
- Slate: `#475569`
- Soft White: `#FAFAFC`

### Brand gradient

Left to right: Bright Cyan, Primary Blue at 48%, Violet.

## Typography

- Display and wordmark: **DM Sans**, Extra Bold or Bold
- Interface and supporting copy: **Inter**
- Use Arial and sans-serif as fallbacks

Fonts are named in the SVG and token files but are not bundled in this package.

## Usage rules

1. Keep the M mark square and symmetrical.
2. Do not stretch the horizontal logo to fit a container.
3. Preserve clear space around the logo.
4. Use the full-color logo on white or very light backgrounds.
5. Use the reversed logo on Deep Navy or similarly dark backgrounds.
6. Use the one-color mark only when full color is unavailable.
7. Do not change the approved tagline or value names in official brand assets.

## App icon guidance

- Light icon: white rounded-square tile with the full-color M mark
- Dark icon: Deep Navy rounded-square tile with the full-color M mark
- Use the supplied size-specific PNGs instead of resizing a small PNG upward
- Use SVG as the source when the platform supports it

## Claude Code handoff

Give Claude Code the entire `Mnemonify-Brand-Kit` folder and instruct it to:

1. Treat the SVG files as the canonical logo sources.
2. Use PNG files only where SVG is unsupported.
3. Import `tokens/mnemonify-tokens.css` into the app's global styles.
4. Map existing colors, typography, radii, spacing, and shadows to the `--mn-*` variables.
5. Replace existing app icons using files from `app-icons/png` and `favicons`.
6. Preserve the logo's intrinsic aspect ratio. Never set both width and height unless the container itself is square.
7. Do not edit the SVG path geometry.

Suggested HTML:

```html
<img src="/brand/logos/svg/mnemonify-primary-horizontal.svg"
     alt="Mnemonify, Learning creation for everyone"
     class="mnemonify-logo" />
```

Suggested CSS:

```css
.mnemonify-logo {
  display: block;
  width: min(100%, 520px);
  height: auto;
}
```

## File formats

- **SVG:** canonical production artwork
- **PNG:** transparent and platform-sized raster exports
- **ICO:** browser favicon bundle
- **CSS and JSON:** design tokens for implementation
- **Markdown:** human-readable and AI-readable usage instructions
