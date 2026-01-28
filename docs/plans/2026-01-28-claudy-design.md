# Claudy - Design Document

> En modern "Clippy" för Claude Code som lever som en systemdaemon med tray-ikon och animerad overlay.

## Vision

Claudy är en desktop companion som visuellt reagerar på Claude Code-aktivitet. Den övervakar pågående sessions och visar en animerad maskot som uttrycker vad Claude gör - tänker, arbetar, är klar, eller stöter på problem.

## Tekniska beslut

### Platform: Tauri

- **Runtime**: Rust backend + Web frontend (HTML/CSS/JS)
- **Binärstorlek**: ~10-15MB (vs Electron ~150MB)
- **Cross-platform**: Linux (Wayland/X11), macOS, Windows
- **Tray-stöd**: Inbyggt via `tauri-plugin-system-tray`

### Event-källa: Passiv fil-watching

Claudy observerar Claude Code's session-filer utan att kräva konfiguration från användaren.

```
~/.claude/projects/<project-slug>/<session-id>.jsonl
```

Filen innehåller JSONL med events:
- `type: "progress"` → `hook_progress` för hook-events
- `type: "user"` → användaren skickade meddelande
- `type: "assistant"` → Claude svarar/arbetar
- `type: "system"` → systemmeddelanden

**Implementation**: `notify` (Rust) eller `inotify`/`fswatch` för fil-watching.

### Animation: Rive

- **Format**: `.riv` filer med inbyggd state machine
- **Runtime**: `@rive-app/webgl` eller `@rive-app/canvas` i webview
- **States**: Definieras i Rive Editor, triggas från Rust via JS bridge
- **Fördelar**: Smooth transitions, interaktiva animationer, liten filstorlek

## Claudy States

| State | Trigger | Beskrivning |
|-------|---------|-------------|
| `wake` | SessionStart | Claudy vaknar, stretchar |
| `idle` | Ingen aktivitet 30s+ | Lugn, blinkar ibland |
| `listening` | User message | Uppmärksam, väntar på Claude |
| `thinking` | Assistant börjar | Funderar, kanske skriver |
| `working` | Tool use (Bash/Edit) | Fokuserad, hackar kod |
| `happy` | Stop (success) | Nöjd, tumme upp |
| `confused` | Error/failure | Kliar sig i huvudet |
| `sleepy` | Inaktivitet 5min+ | Slumrar till |

## UI-komponenter

### Tray-ikon

- **Vänsterklick**: Toggle Claudy overlay (visa/göm)
- **Högerklick**: Kontextmeny

**Kontextmeny:**
- Show/Hide Claudy
- Settings
- Current status
- Mute notifications
- Quit

### Overlay-fönster

```
     1 [2] 3              ← Workspace indicator (visas om >1 session)
   my-project             ← Projektnamn (klickbar för session-switch)
┌─────────────────┐
│                 │
│     ◕   ◕       │       ← Claudy (Rive animation)
│       ‿         │
│                 │
└─────────────────┘
   ╭──────────────╮
   │ Task done!   │       ← Pratbubbla (vid events)
   ╰──────────────╯
```

**Positionering:**
- Fixed position med konfigurerbar X,Y offset
- Default: nedre högra hörnet
- Sparas i config

### Multi-session hantering

- Workspace indicator: `1 [2] 3` visar aktiva sessions
- Brackets `[ ]` markerar fokuserad session
- Klick på projektnamn cyklar genom sessions
- Indikatorn döljs om bara en session är aktiv

### Notifikationer

1. **Pratbubbla**: Visas bredvid Claudy när overlay är synlig
   - Försvinner efter 5s eller vid klick
   - Stöd för emoji och kort text

2. **OS Notification**: Fallback när overlay är gömd
   - Använder system notification API
   - Klick öppnar Claudy overlay

## CLI

```bash
claudy                 # Starta daemon (om inte redan igång)
claudy register        # Registrera nuvarande mapp för watching
claudy unregister      # Avregistrera nuvarande mapp
claudy list            # Lista registrerade projekt
claudy status          # Visa aktiva sessions och Claudy's state
claudy config          # Öppna settings / visa config path
claudy quit            # Stäng ner Claudy daemon
```

## Konfiguration

**Path**: `~/.config/claudy/config.toml`

```toml
[position]
x = 100          # Offset från höger kant
y = 100          # Offset från nedre kant
anchor = "bottom-right"

[appearance]
size = "medium"  # small | medium | large
theme = "auto"   # auto | light | dark

[notifications]
sound = true
os_notifications = true
bubble_duration = 5  # sekunder

[behavior]
auto_start = false
idle_timeout = 30      # sekunder innan idle state
sleepy_timeout = 300   # sekunder innan sleepy state

[projects]
registered = [
  "/home/user/projekt/my-app",
  "/home/user/projekt/other-app"
]
```

**GUI Settings**: Enkelt fönster för vanliga inställningar (position, storlek, notifikationer). Power users kan editera TOML direkt.

## Design

### Visuell stil

- **Baserad på**: Claude's officiella maskot
- **Färgpalett**: Orange/beige (Claude's varumärkesfärger)
- **Upplösning**: Högre än original 8-bit, mer "16-bit" känsla
- **Ansikte**: Mer expressivt och levande än originalet
- **Form**: Mjuk, avrundad, vänlig

### Rive State Machine

```
[idle] ←──────────────────────────────┐
   │                                  │
   ▼ SessionStart                     │
[wake] ──────────────────────────────→│
   │                                  │
   ▼ timeout                          │
[idle] ←──────┬───────────────────────┤
   │          │                       │
   │ user     │ timeout 5min          │
   ▼          ▼                       │
[listening] [sleepy]                  │
   │          │                       │
   │ assistant│ any event             │
   ▼          └───────────────────────┤
[thinking]                            │
   │                                  │
   │ tool_use                         │
   ▼                                  │
[working]                             │
   │                                  │
   ├─ stop (success) → [happy] ───────┤
   │                                  │
   └─ error → [confused] ─────────────┘
```

## Arkitektur

```
┌─────────────────────────────────────────────────────────┐
│                      Tauri App                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   Rust Backend  │    │      Webview Frontend       │ │
│  │                 │    │                             │ │
│  │  ┌───────────┐  │    │  ┌─────────────────────┐   │ │
│  │  │  Watcher  │──┼────┼─→│   Rive Animation    │   │ │
│  │  │ (notify)  │  │    │  │                     │   │ │
│  │  └───────────┘  │    │  └─────────────────────┘   │ │
│  │                 │    │                             │ │
│  │  ┌───────────┐  │    │  ┌─────────────────────┐   │ │
│  │  │  Config   │  │    │  │   Speech Bubble     │   │ │
│  │  │ Manager   │  │    │  │                     │   │ │
│  │  └───────────┘  │    │  └─────────────────────┘   │ │
│  │                 │    │                             │ │
│  │  ┌───────────┐  │    │  ┌─────────────────────┐   │ │
│  │  │  Session  │  │    │  │  Project Switcher   │   │ │
│  │  │  Manager  │  │    │  │                     │   │ │
│  │  └───────────┘  │    │  └─────────────────────┘   │ │
│  │                 │    │                             │ │
│  │  ┌───────────┐  │    └─────────────────────────────┘ │
│  │  │   Tray    │  │                                    │
│  │  │  Handler  │  │                                    │
│  │  └───────────┘  │                                    │
│  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────┐
│  Claude Code    │
│  Session Files  │ ←── ~/.claude/projects/*/*.jsonl
└─────────────────┘
```

## Tech Stack

### Rust (Backend)
- `tauri` - App framework
- `notify` - Fil-watching
- `serde` / `toml` - Config parsing
- `tauri-plugin-notification` - OS notifications

### Frontend (Webview)
- Vanilla JS eller Svelte (lättviktigt)
- `@rive-app/canvas` - Rive runtime
- CSS för pratbubbla och UI-element

### CLI
- `clap` - Argument parsing
- Kommunicerar med daemon via Unix socket eller named pipe

## Framtida utökningar

Dessa är **inte** del av MVP, men bra att ha i åtanke:

- **Hotkeys**: Global hotkey för att visa/gömma Claudy
- **Themes**: Användarskapade teman och maskot-varianter
- **Sounds**: Ljudeffekter synkade med animationer
- **Widgets**: Visa mer info (token usage, session duration)
- **Hooks integration**: Opt-in för rikare events via Claude Code hooks

---

*Design dokumenterat 2026-01-28*
