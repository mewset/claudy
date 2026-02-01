# Claudy

**Your desktop companion for Claude Code**

<p align="center">
  <img src="demo.gif" alt="Claudy demo" width="400">
</p>

Claudy is a small animated character that lives in your system tray and reacts to everything Claude does while you code together. Think Clippy, but actually helpful... maybe.

---

## Installation

### From Release (Recommended)

Download the latest release for your platform from [Releases](https://github.com/mewset/claudy/releases).

**Linux (Debian/Ubuntu):**
```bash
sudo dpkg -i Claudy_x.x.x_amd64.deb
```

### From Source

**Prerequisites:**
- [Rust](https://rustup.rs/)
- [Node.js](https://nodejs.org/) (v18+)
- [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

**Build:**
```bash
git clone https://github.com/mewset/claudy.git
cd claudy
npm install
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

---

## Configuration

Claudy stores its config at `~/.config/claudy/config.toml`.

You can also access settings via the system tray icon → **Configuration**.

### Register a project

Add your project paths to watch for Claude activity:

```toml
[projects]
registered = [
    "/home/user/my-project",
    "/home/user/another-project"
]
```

### Appearance

```toml
[appearance]
background = "#1a1a2e"  # or leave empty for transparent
```

---

## License

MIT
