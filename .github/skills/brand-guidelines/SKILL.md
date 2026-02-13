---
name: brand-guidelines
description: Applies USA Pawn Holdings brand colors and typography. Use it when brand colors, style guidelines, visual formatting, or company design standards apply to any frontend page, component, or visual asset.
license: Complete terms in LICENSE.txt
---

# USA Pawn Holdings — Brand Styling

## Overview

This skill applies the official USA Pawn Holdings brand identity to all visual artifacts. The aesthetic is **Red, White & Blue** — patriotic, bold, and trustworthy. Dark mode uses deep navy backgrounds; light mode uses clean whites. Blue serves as the primary accent, red as the action/urgency color. The feel is "modern American pawn shop meets fintech" — trustworthy, authoritative, and proud.

**Keywords**: branding, corporate identity, visual identity, styling, brand colors, typography, USA Pawn, visual formatting, visual design, patriotic, red white blue, pawn shop

## Brand Guidelines

### Colors

**Primary — Patriotic Blue (Dominant Brand Color):**

- Blue: `#4A90D9` (dark mode) / `#1B4D8E` (light mode) - Primary accent, nav bars, headers, CTAs, borders
- Blue Light: `#5BA0E8` (dark mode) / `#2A6AB5` (light mode) - Gradient endpoint, hover states
- Blue Gradient: `linear-gradient(135deg, #4A90D9, #5BA0E8)` - Primary gradient

**Secondary — Dark Navy (Page Canvas, dark mode):**

- Navy: `#111D33` - Primary backgrounds, footer, card surfaces
- Navy Deep: `#0B1426` - Page background, deepest layer
- Surface: `#142238` - Mid-layer surfaces
- Surface Elevated: `#1C2D47` - Elevated cards, modals, hover backgrounds

**Light Mode Backgrounds:**

- Off-white: `#F0F3F8` - Primary backgrounds
- White: `#F8FAFB` - Page background
- Surface: `#E8ECF2` - Mid-layer surfaces
- Surface Elevated: `#DDE3ED` - Elevated cards

**Accent — USA Red:**

- Red: `#CC0000` - The "USA PAWN" logo red. CTAs, urgency signals, alerts, pawnbroker globe icon
- Red Hover: `#E60000` - Hover state for red elements

**Text:**

- Light: `#FFFFFF` - Primary text on dark surfaces
- On Blue: `#FFFFFF` - Text on blue surfaces
- Muted: `#8B9DB7` (dark) / `#3D5070` (light) - Secondary text, captions, metadata

**Semantic:**

- Success: `#2ECC71` - On-time, completed, positive
- Warning: `#F39C12` - Late, attention needed
- Danger: `#CC0000` - Very late, no-show, critical
- Info: `#4A90D9` - Informational highlights (uses brand blue)

### Typography

- **Display/Headings**: Playfair Display or Cinzel — serif with gravitas (fallback: Georgia)
- **Body Text**: Outfit or DM Sans — warm, readable sans-serif (fallback: system-ui)
- **Monospace/Prices**: JetBrains Mono or Fira Code — for prices, data, code
- **NEVER USE**: Inter, Roboto, Arial, or generic sans-serif. These are banned.

## Features

### Smart Font Application

- Applies display serif (Playfair Display) to headings (24pt and larger)
- Applies body sans-serif (Outfit) to body text
- Applies monospace (JetBrains Mono) to prices, data tables, and code
- Automatically falls back to Georgia/system-ui if custom fonts unavailable
- Preserves readability across all systems

### Text Styling

- Headings (24pt+): Playfair Display — bold, uppercase optional for section headers
- Body text: Outfit — regular weight, generous line-height (1.6+)
- Prices/Data: JetBrains Mono — clear, professional numeric display
- Smart color selection: white text on dark, dark text on gold
- Preserves text hierarchy and formatting

### Shape and Accent Colors

- Non-text shapes use blue as primary accent
- Red accent for CTAs, urgency signals, alerts, and the pawnbroker globe icon
- Blue gradient applied to nav bars, info sections, and featured elements
- Dark navy surfaces (`#1C2D47`) for cards and containers on `#0B1426` backgrounds

### Design Principles

1. **Patriotic Pride**: Red, White & Blue evoke trust, strength, and American pride — perfect for a pawn shop brand
2. **Bold, Not Garish**: The blue is deep and confident, red is used for impact. Think "trusted American institution".
3. **Mobile-First**: All touch targets 44px minimum. Thumb-zone optimized layouts.
4. **Her Brand**: The logo, the colors, the store name — everything must feel like *her* store upgraded, not a stranger's product.
5. **Motion**: Subtle blue shimmer on hover. Smooth page transitions. Processing animations for appraisals.

## Technical Details

### Font Management

- Load Playfair Display and Outfit via Google Fonts
- Load JetBrains Mono via Google Fonts for monospace
- Provide automatic fallback to Georgia (headings) and system-ui (body)
- For best results, include font imports in `globals.css` or `layout.tsx`

### CSS Variable Implementation

```css
:root {
  /* Primary — Patriotic Blue */
  --vault-gold: #4A90D9;
  --vault-gold-light: #5BA0E8;
  --vault-gold-gradient: linear-gradient(135deg, #4A90D9, #5BA0E8);
  /* Backgrounds — Deep Navy */
  --vault-black: #111D33;
  --vault-black-deep: #0B1426;
  --vault-surface: #142238;
  --vault-surface-elevated: #1C2D47;
  /* Accent — USA Red */
  --vault-red: #CC0000;
  --vault-red-hover: #E60000;
  /* Text */
  --vault-text-light: #FFFFFF;
  --vault-text-on-gold: #FFFFFF;
  --vault-text-muted: #8B9DB7;
  /* Semantic */
  --vault-success: #2ECC71;
  --vault-warning: #F39C12;
  --vault-danger: #CC0000;
  --vault-info: #4A90D9;
}
```

### Color Application

- Uses CSS custom properties for brand consistency
- All components reference `--vault-*` variables, never hardcoded hex values
- Maintains color fidelity across different systems and browsers
