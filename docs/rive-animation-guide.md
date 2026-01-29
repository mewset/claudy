# Claudy Rive Animation Guide

En guide för att skapa Claudy-animationerna i Rive.

---

## States att animera

| State | Trigger | Känsla | Förslag |
|-------|---------|--------|---------|
| **idle** | Default / ingen aktivitet | Lugn, avslappnad | Långsam andning, ögonblink var 3-4s |
| **wake** | SessionStart | Alert, redo | Ögon öppnas stort, liten "stretch" |
| **listening** | User skickar meddelande | Uppmärksam, fokuserad | Lätt framåtlutning, ögon fixerade |
| **thinking** | Claude börjar svara | Funderar, processerar | Ögon rör sig upp/åt sidan, kanske "..." bubbla |
| **working** | Tool use (Bash/Edit) | Fokuserad, aktiv | Snabbare rörelser, "typing" på klor |
| **happy** | Task klar (success) | Nöjd, stolt | Leende, kanske liten "bounce" eller tumme upp |
| **confused** | Error/failure | Förvirrad, osäker | Huvudlutning, frågetecken-uttryck, klia sig |
| **sleepy** | Lång inaktivitet (5min+) | Trött, slumrar | Tunga ögonlock, gäspning, nickar till |

---

## Animationslängder

### Looping animations (states som varar)
- **idle**: 3-4 sekunder loop (andning + blink)
- **listening**: 2 sekunder loop (subtle rörelse)
- **thinking**: 2-3 sekunder loop (ögonrörelse)
- **working**: 1-2 sekunder loop (snabb, aktiv)
- **sleepy**: 4-5 sekunder loop (långsam, drömmande)

### One-shot animations (transitions)
- **wake**: 0.5-0.8 sekunder (snabb, energisk)
- **happy**: 1-1.5 sekunder (celebration, sen settle)
- **confused**: 0.8-1 sekund (reaktion, sen hold)

---

## Tips för seamless transitions

### 1. Neutral pose
Skapa en **neutral pose** som alla states utgår från och återgår till. Detta gör transitions smidigare.

```
idle ←→ neutral ←→ thinking
              ↕
           working
```

### 2. Entry/Exit animations
I Rive State Machine:
- **Entry**: Kort animation IN till staten (0.3-0.5s)
- **Loop**: Huvudanimationen som loopar
- **Exit**: Kort animation UT (0.3s) - eller blend direkt

### 3. Blend duration
Sätt **blend time** till 0.2-0.3 sekunder mellan states för smooth transitions. Rive hanterar detta automatiskt om du använder State Machine.

### 4. Undvik hårda poser
Låt alltid något röra sig lite (andning, subtle sway). Helt stilla = dött.

---

## Rive State Machine Setup

### Inputs att skapa
```
Number: state (0-7)
  0 = idle
  1 = wake
  2 = listening
  3 = thinking
  4 = working
  5 = happy
  6 = confused
  7 = sleepy
```

### States i State Machine
```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌──────┐    state=1    ┌──────┐           │
│  │ idle │ ───────────→  │ wake │           │
│  └──────┘               └──────┘           │
│      ↑                      │              │
│      │     state=0          │ auto         │
│      └──────────────────────┘              │
│                                             │
│  state=2 → listening                       │
│  state=3 → thinking                        │
│  state=4 → working                         │
│  state=5 → happy                           │
│  state=6 → confused                        │
│  state=7 → sleepy                          │
│                                             │
│  Alla → idle (via state=0)                 │
└─────────────────────────────────────────────┘
```

### Transitions
- **Any → idle**: När `state == 0`, blend 0.3s
- **idle → wake**: När `state == 1`, instant
- **wake → idle**: Auto efter animation klar
- **idle → listening**: När `state == 2`, blend 0.2s
- etc.

---

## Assets du har

Du nämnde att du redan skapat i Piskel (32x32 → 512x512):
- Kropp
- Klor
- Ben

### Rigging i Rive
1. **Importera** varje PNG som separat image
2. **Skapa bones**:
   - Spine (ryggrad) för kropp-rotation/böjning
   - Arm bones för klor
   - Eventuellt eye bones för ögonrörelser
3. **Bind** images till bones
4. **Animera** bones, inte images direkt

### Ansiktsuttryck
Två alternativ:
1. **Sprite swap**: Olika eye/mouth images som byts
2. **Shape morphing**: Om du ritar i Rive (vektorer)

För pixel art är **sprite swap** enklast:
- Skapa olika ögon-frames (öppna, stängda, halv, uppåt, etc.)
- Byt mellan dem i animationen

---

## Checklista innan implementation

- [ ] Idle loop med andning + blink
- [ ] Wake one-shot
- [ ] Listening loop (uppmärksam)
- [ ] Thinking loop (ögonrörelse)
- [ ] Working loop (aktiv/typing)
- [ ] Happy one-shot → settle
- [ ] Confused one-shot → hold
- [ ] Sleepy loop (trött)
- [ ] State Machine med `state` input (Number 0-7)
- [ ] Transitions mellan alla states
- [ ] Export som `.riv`

---

## Integration med Claudy

När `.riv` är klar:

1. Placera i `src/assets/claudy.riv`
2. Uppdatera `src/claudy.ts` för att ladda filen
3. Frontend skickar `state` värde till Rive runtime
4. Rive State Machine byter animation automatiskt

```typescript
// I claudy.ts
this.stateInput.value = stateMap[state]; // 0-7
```

---

Lycka till med animationerna! 🎨🧡
