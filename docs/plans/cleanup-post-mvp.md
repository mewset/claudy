# Post-MVP Cleanup Tasks

Issues discovered during MVP testing that should be fixed after all phases complete.

---

## Bug 1: Path slug format mismatch

**Location:** `src-tauri/src/watcher.rs` → `path_to_slug()` function

**Problem:**
- Claudy generates: `home-m0s-Projekt-claudy`
- Claude Code uses: `-home-m0s-Projekt-claudy` (leading dash)

**Current code:**
```rust
fn path_to_slug(path: &Path) -> String {
    path.to_string_lossy()
        .replace("/", "-")
        .trim_start_matches('-')
        .to_string()
}
```

**Fix:** Remove `.trim_start_matches('-')` - the leading dash is intentional in Claude Code's format.

```rust
fn path_to_slug(path: &Path) -> String {
    path.to_string_lossy()
        .replace("/", "-")
        .to_string()
}
```

**Test:** After fix, run Claudy and verify it finds:
```
/home/m0s/.claude/projects/-home-m0s-Projekt-claudy
```

---

## Bug 2: cargo tauri dev doesn't know which binary

**Location:** `src-tauri/Cargo.toml`

**Problem:** `cargo tauri dev` fails with "could not determine which binary to run"

**Fix:** Add to `[package]` section:
```toml
default-run = "claudy"
```

---

## Improvement 1: Remove debug print

**Location:** `src-tauri/src/main.rs`

**Problem:** `Config loaded: ...` prints on every startup

**Fix:** Remove or wrap in `#[cfg(debug_assertions)]`

---

## Improvement 2: Suppress ayatana-appindicator warnings

**Location:** System tray initialization

**Problem:** Deprecation warnings from libayatana-appindicator on Linux

**Fix:** Low priority - cosmetic only. Can suppress or migrate to newer lib.

---

---

## Future Ideas

### Multi-Screen / Kiosk Mode

**Concept:** Claudy on your phone as a desk companion while coding!

**Why:**
- Many devs have their phone on the desk charging
- Dedicated Claudy display without taking screen real estate
- Could run on tablet, old phone, or secondary monitor

**Implementation:**
1. Add WebSocket server to Rust backend
2. Frontend detects environment (Tauri vs browser)
3. Browser mode connects via WS instead of Tauri API
4. Same events, same animations, any device

**Vite setup:**
```bash
npm run dev -- --host
# Access from any device: http://<ip>:5173
```

**Nice to have:**
- Touch interactions (pet Claudy!)
- Portrait/landscape layouts
- "Always on display" mode for OLED phones

---

*Created 2026-01-28*
