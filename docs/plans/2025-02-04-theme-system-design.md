# Theme System Design

**Date:** 2025-02-04
**Status:** Approved
**Branch:** feature/orc-theme

## Overview

A theme system for Claudy that allows users to change the character's appearance through predefined color schemes. Uses CSS mask technique to recolor PNG sprites without modifying original assets.

## Goals

- Enable runtime theme switching without app restart
- Preserve original PNG assets (no image modification)
- Simple dropdown UI in existing config panel
- Extensible for future themes

## Technical Approach

### CSS Mask Technique

PNG sprites are used as masks. The mask defines the shape; CSS variables define the fill color.

```css
:root {
  --skin-color: #DA7B5C;
  --eye-color: #000000;
}

.claudy-body::after {
  background-color: var(--skin-color);
  mask-image: url('/claudy-parts/body.png');
}
```

### Why CSS Mask

| Criteria | CSS Filter | CSS Mask | Canvas |
|----------|------------|----------|--------|
| Color precision | Approximate | Exact | Exact |
| Runtime switch | Instant | Instant | Requires reprocess |
| Complexity | Low | Medium | High |
| Selective coloring | No | Yes | Yes |

CSS mask chosen for exact color control with instant switching.

## Theme Definitions

### Data Structure

```typescript
interface Theme {
  id: string;
  name: string;
  skinColor: string;
  eyeColor: string;
}
```

### Built-in Themes

| ID | Name | Skin | Eyes | Notes |
|----|------|------|------|-------|
| `default` | Default | `#DA7B5C` | `#000000` | Original Claudy |
| `orc` | Orc | `#5A7F4B` | `#8B0000` | Green skin, red eyes |
| `winter` | Winter | `#ADD9E6` | `#000000` | Claude Code winter mascot |

### Sprite Color Analysis

| File | Colors | Themeable |
|------|--------|-----------|
| body.png | `#DA7B5C` + transparent | Yes (skin) |
| legs.png | `#DA7B5C` + transparent | Yes (skin) |
| claws.png | `#DA7B5C` + transparent | Yes (skin) |
| eyes.png | `#000000` + transparent | Yes (eyes) |

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/themes.ts` | Theme definitions, THEMES constant, applyTheme() |

### Modified Files

| File | Changes |
|------|---------|
| `src/claudy.css` | CSS variables, mask rules for all sprite classes |
| `src/main.ts` | Load and apply theme at startup |
| `src/config.ts` | Theme dropdown handler, live preview |
| `src/config.html` | Theme select element in Appearance section |

### Unchanged Files

| File | Reason |
|------|--------|
| `src-tauri/src/config.rs` | `theme` field already exists in AppearanceConfig |
| `public/claudy-parts/*.png` | Original assets preserved |

## UI Design

Theme selector added to existing Appearance section in config.html:

```html
<div class="setting-group">
  <label for="theme">Theme</label>
  <select id="theme">
    <option value="default">Default</option>
    <option value="orc">Orc</option>
    <option value="winter">Winter</option>
  </select>
</div>
```

## Configuration

Uses existing config infrastructure:

```toml
[appearance]
theme = "orc"
```

No Rust changes needed - `theme` field already defined with default "auto".

## Future Extensibility

Adding new themes requires only:

1. Add entry to `THEMES` constant in `themes.ts`
2. Add `<option>` to dropdown in `config.html`

No structural changes needed.
