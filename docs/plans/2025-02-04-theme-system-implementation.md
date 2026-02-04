# Theme System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement CSS mask-based theme system allowing runtime color switching of Claudy sprites.

**Architecture:** Themes defined in TypeScript, applied via CSS custom properties. PNG sprites used as masks, filled with theme colors. Theme selection persisted in existing config.toml.

**Tech Stack:** TypeScript, CSS masks, Tauri IPC (existing)

---

## Task 1: Create Theme Definitions

**Files:**
- Create: `src/themes.ts`

**Step 1: Create themes.ts with theme interface and built-in themes**

```typescript
// src/themes.ts

export interface Theme {
  id: string;
  name: string;
  skinColor: string;
  eyeColor: string;
}

export const THEMES: Record<string, Theme> = {
  default: {
    id: 'default',
    name: 'Default',
    skinColor: '#DA7B5C',
    eyeColor: '#000000',
  },
  orc: {
    id: 'orc',
    name: 'Orc',
    skinColor: '#5A7F4B',
    eyeColor: '#8B0000',
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    skinColor: '#ADD9E6',
    eyeColor: '#000000',
  },
};

export function applyTheme(themeId: string): void {
  const theme = THEMES[themeId] || THEMES.default;
  document.documentElement.style.setProperty('--skin-color', theme.skinColor);
  document.documentElement.style.setProperty('--eye-color', theme.eyeColor);
}

export function getThemeIds(): string[] {
  return Object.keys(THEMES);
}
```

**Step 2: Verify file compiles**

Run: `cd /home/m0s/Projekt/claudy/.worktrees/orc-theme && npx tsc src/themes.ts --noEmit --esModuleInterop --skipLibCheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/themes.ts
git commit -m "feat: add theme definitions with default, orc, and winter themes"
```

---

## Task 2: Add CSS Mask Styles

**Files:**
- Modify: `src/claudy.css` (add at top, after BASE STYLES section ~line 28)

**Step 1: Add CSS custom properties and mask rules**

Add after line 27 (after `#app` block, before `PROJECT SWITCHER`):

```css
/* ===========================================
   THEME SYSTEM - CSS Custom Properties
   =========================================== */
:root {
  --skin-color: #DA7B5C;
  --eye-color: #000000;
}

/* ===========================================
   THEMED SPRITE MASKS
   Body, legs, claws use skin-color
   Eyes use eye-color
   =========================================== */
.claudy-body,
.claudy-legs,
.claudy-claws {
  /* Hide the original colored image */
  opacity: 0;
}

.claudy-body::after,
.claudy-legs::after,
.claudy-claws::after {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--skin-color);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}

.claudy-body::after {
  -webkit-mask-image: url('/claudy-parts/body.png');
  mask-image: url('/claudy-parts/body.png');
}

.claudy-legs::after {
  -webkit-mask-image: url('/claudy-parts/legs.png');
  mask-image: url('/claudy-parts/legs.png');
}

.claudy-claws::after {
  -webkit-mask-image: url('/claudy-parts/claws.png');
  mask-image: url('/claudy-parts/claws.png');
}

/* Eyes use separate eye-color */
.claudy-eyes {
  opacity: 0;
}

.claudy-eyes::after {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--eye-color);
  -webkit-mask-image: url('/claudy-parts/eyes.png');
  mask-image: url('/claudy-parts/eyes.png');
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}
```

**Step 2: Verify CSS syntax**

Run: `cd /home/m0s/Projekt/claudy/.worktrees/orc-theme && npx vite build --mode development 2>&1 | head -20`
Expected: Build succeeds (no CSS parse errors)

**Step 3: Commit**

```bash
git add src/claudy.css
git commit -m "feat: add CSS mask styles for theme system"
```

---

## Task 3: Apply Theme at Startup

**Files:**
- Modify: `src/main.ts` (lines 376-386, appearance config section)

**Step 1: Import applyTheme and call it during startup**

Add import at top of file (after line 4):

```typescript
import { applyTheme } from "./themes";
```

**Step 2: Modify the appearance config loading section**

Replace lines 376-386 (the appearance config try/catch block inside the Tauri init) with:

```typescript
    // Apply appearance config (background color and theme)
    try {
      const appearance = await invoke<{ background?: string; theme?: string }>("get_appearance_config");
      console.log("[Claudy] Appearance config:", appearance);
      if (appearance.background) {
        console.log("[Claudy] Setting background to:", appearance.background);
        document.body.style.backgroundColor = appearance.background;
      }
      // Apply theme (defaults to 'default' if not set or invalid)
      const themeId = appearance.theme || 'default';
      console.log("[Claudy] Applying theme:", themeId);
      applyTheme(themeId);
    } catch (e) {
      console.error("Failed to get appearance config:", e);
      applyTheme('default'); // Fallback to default theme
    }
```

**Step 3: Verify TypeScript compiles**

Run: `cd /home/m0s/Projekt/claudy/.worktrees/orc-theme && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: apply theme at startup from config"
```

---

## Task 4: Add Theme Selector to Config UI

**Files:**
- Modify: `src/config.html` (add after background field, ~line 177)
- Modify: `src/config.ts` (add theme handling)

**Step 1: Add theme dropdown to config.html**

Add after line 176 (after the background field's closing `</div>`, before the section's closing `</div>`):

```html
    <div class="field">
      <label for="theme">Theme</label>
      <select id="theme">
        <option value="default">Default</option>
        <option value="orc">Orc</option>
        <option value="winter">Winter</option>
      </select>
    </div>
```

**Step 2: Add select styling to config.html**

Add after line 58 (after the `input[type="text"]:focus` block):

```css
    select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #3a3a5c;
      border-radius: 4px;
      background: #1a1a2e;
      color: #e0e0e0;
      font-size: 14px;
      cursor: pointer;
    }
    select:focus {
      outline: none;
      border-color: #f97316;
    }
```

**Step 3: Add theme handling to config.ts**

Add element reference after line 17:

```typescript
const themeSelect = document.getElementById("theme") as HTMLSelectElement;
```

Update loadConfig function - add after line 94 (after backgroundPicker.value assignment):

```typescript
    // Set theme value
    if (currentConfig.appearance.theme) {
      themeSelect.value = currentConfig.appearance.theme;
    }
```

Update saveConfig function - replace line 105-106 with:

```typescript
    const background = backgroundInput.value.trim() || null;
    const theme = themeSelect.value;
    await invoke("save_appearance_config", { background, theme });
```

**Step 4: Update Rust backend to accept theme parameter**

Read the current main.rs to find save_appearance_config function.

**Step 5: Verify build succeeds**

Run: `cd /home/m0s/Projekt/claudy/.worktrees/orc-theme && npm run build 2>&1 | tail -10`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/config.html src/config.ts
git commit -m "feat: add theme selector dropdown to config UI"
```

---

## Task 5: Update Rust Backend for Theme Parameter

**Files:**
- Modify: `src-tauri/src/main.rs` (save_appearance_config command)

**Step 1: Read current main.rs to find the function**

Find the `save_appearance_config` Tauri command.

**Step 2: Update command to accept theme parameter**

Update the function signature and body to:

```rust
#[tauri::command]
fn save_appearance_config(background: Option<String>, theme: Option<String>) -> Result<(), String> {
    let mut config = config::load_config();
    config.appearance.background = background;
    if let Some(t) = theme {
        config.appearance.theme = t;
    }
    config::save_config(&config).map_err(|e| e.to_string())
}
```

**Step 3: Verify Rust compiles**

Run: `cd /home/m0s/Projekt/claudy/.worktrees/orc-theme && cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | tail -10`
Expected: No errors

**Step 4: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "feat: update save_appearance_config to accept theme parameter"
```

---

## Task 6: Manual Testing

**Step 1: Build and run the app**

Run: `cd /home/m0s/Projekt/claudy/.worktrees/orc-theme && npm run tauri dev`

**Step 2: Test theme switching**

1. Open config window (tray menu → Configuration)
2. Select "Orc" theme from dropdown
3. Click Save
4. Restart app (quit and relaunch)
5. Verify Claudy appears with green skin and red eyes

**Step 3: Test all themes**

Repeat for "Winter" and "Default" themes, verifying:
- Default: #DA7B5C skin, black eyes
- Orc: #5A7F4B skin, #8B0000 eyes
- Winter: #ADD9E6 skin, black eyes

**Step 4: Test persistence**

1. Set theme to "Orc"
2. Save and close config
3. Fully quit Claudy
4. Relaunch Claudy
5. Verify Orc theme persists

---

## Task 7: Final Commit and Cleanup

**Step 1: Verify all changes are committed**

Run: `git status`
Expected: Clean working directory

**Step 2: Review commit history**

Run: `git log --oneline -10`
Expected: Series of focused commits for each task

**Step 3: Final build verification**

Run: `cd /home/m0s/Projekt/claudy/.worktrees/orc-theme && npm run build && cargo build --manifest-path src-tauri/Cargo.toml --release 2>&1 | tail -5`
Expected: Both builds succeed
