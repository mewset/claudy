# Claudy Lottie Animation Guide

En guide för att skapa Claudy-animationerna med Lottie.

---

## Verktyg för att skapa Lottie

**Gratis alternativ:**
- **LottieFiles Creator** (https://lottiefiles.com/creator) - Web-based, enkelt
- **Haiku Animator** - Open source desktop app
- **Cavalry** - Gratis för indie-projekt
- **After Effects + Bodymovin** - Om du har Adobe CC

**Rekommendation:** LottieFiles Creator för att komma igång snabbt.

---

## Filstruktur

Skapa en fil per state:

```
src/
  animations/
    idle.json        # Looping: lugn, andning, blink
    wake.json        # One-shot: vaknar upp
    listening.json   # Looping: uppmärksam
    thinking.json    # Looping: funderar
    working.json     # Looping: aktiv, jobbar
    happy.json       # One-shot: nöjd, celebration
    confused.json    # One-shot: förvirrad
    sleepy.json      # Looping: trött, slumrar
```

---

## States att animera

| State | Typ | Längd | Känsla | Förslag |
|-------|-----|-------|--------|---------|
| **idle** | Loop | 3-4s | Lugn, avslappnad | Långsam andning, ögonblink var 3-4s |
| **wake** | One-shot | 0.5-0.8s | Alert, redo | Ögon öppnas stort, liten stretch |
| **listening** | Loop | 2s | Uppmärksam | Lätt framåtlutning, fixerade ögon |
| **thinking** | Loop | 2-3s | Funderar | Ögon rör sig upp/åt sidan |
| **working** | Loop | 1-2s | Fokuserad, aktiv | Snabba rörelser, typing på klor |
| **happy** | One-shot | 1-1.5s | Nöjd, stolt | Leende, bounce, sen settle till idle |
| **confused** | One-shot | 0.8-1s | Förvirrad | Huvudlutning, frågetecken-uttryck |
| **sleepy** | Loop | 4-5s | Trött | Tunga ögonlock, gäspning |

**One-shot states** återgår automatiskt till `idle` när de är klara.

---

## Workflow i LottieFiles Creator

### 1. Importera assets
- Ladda upp dina Piskel PNG-exports (kropp, klor, ben, ögon)
- Varje del blir ett separat lager

### 2. Rigging (om du vill ha bone-animation)
LottieFiles Creator har basic rigging:
- Skapa parent-child relationer mellan lager
- Anchor points för rotation

### 3. Animera
- Använd keyframes för position, rotation, scale, opacity
- Tips: Ease in/out för naturlig rörelse

### 4. Exportera
- Exportera som `.json` (Lottie format)
- Namnge enligt state: `idle.json`, `wake.json`, etc.

---

## Animationstips

### Looping animations
- **Första och sista frame ska matcha** för seamless loop
- Eller använd ease som gör loop naturlig
- Håll rörelse subtil - det ska inte vara distraherande

### One-shot animations
- Starta från neutral pose
- Ha en tydlig "peak" i mitten
- Avsluta nära neutral (idle tar över)

### Generellt
- **Timing**: 24-30 fps är standard
- **Ease**: Använd ease-out för snabba rörelser, ease-in-out för lugna
- **Breathing**: Lägg alltid till subtil "andning" i idle
- **Blinks**: 2-4 frames för naturlig blink

---

## Teknisk integration

### Filplacering
```
public/animations/idle.json
public/animations/wake.json
... etc
```

Eller i `src/assets/` och importera direkt.

### Kod (redan uppdaterad)

```typescript
// src/claudy.ts hanterar:
// - Ladda rätt animation baserat på state
// - Loop vs one-shot automatiskt
// - Återgång till idle efter one-shot
```

### Använda i main.ts (framtida)

```typescript
import { ClaudyAnimation } from "./claudy";

const claudy = new ClaudyAnimation("/animations");
const container = document.getElementById("claudy-container");
claudy.init(container);

// När state ändras:
claudy.setState("thinking");
```

---

## Checklista

- [ ] Skapa `idle.json` - loop med andning + blink
- [ ] Skapa `wake.json` - one-shot, ögon öppnas
- [ ] Skapa `listening.json` - loop, uppmärksam
- [ ] Skapa `thinking.json` - loop, ögonrörelse
- [ ] Skapa `working.json` - loop, aktiv
- [ ] Skapa `happy.json` - one-shot, celebration
- [ ] Skapa `confused.json` - one-shot, frågetecken
- [ ] Skapa `sleepy.json` - loop, trött
- [ ] Placera i `public/animations/`
- [ ] Testa i Claudy!

---

## Snabbstart: Minimal viable animation

Om du vill testa snabbt, börja med bara **3 states**:

1. **idle.json** - Statisk bild med blink (kan vara 2 frames som loopar)
2. **thinking.json** - Ögon som rör sig
3. **happy.json** - Leende som poppar in

Det ger dig en fungerande grund att bygga vidare på.

---

Lycka till! 🎨🧡
