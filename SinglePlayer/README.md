# Crypto Beast — Single Player

An endless side-scrolling runner built with [Phaser 3](https://phaser.io/) and TypeScript. Dodge ground and flying hazards, survive as long as you can, and chase a high score that ramps up in speed and difficulty the longer you last.

The game is designed to run **standalone in the browser** or **embedded in a host page** (e.g. a React/web3 wallet app) that drives authentication, play-unlock, and reward flows through a small event bridge.

## Features

- 🦖 Variable-height jump (tap for a short hop, hold to jump higher), duck, and death animations
- 🌄 Parallax sky/background/ground scrolling with a day ⇄ night cycle every 500 points
- ⚡ Escalating difficulty — speed and spawn rate ramp up over time
- 🎲 Weighted obstacle spawning (ground, flying, and mixed hazards)
- 🏆 High score persisted in `localStorage`
- 📱 Keyboard **and** touch/pointer input
- 🔌 Host-page integration via an event bus (wallet auth, balance checks, rewards)

## Tech stack

| | |
|---|---|
| Engine | Phaser `^3.88` |
| Language | TypeScript `^5.7` |
| Bundler | Vite `^6.3` |
| Node | `>=24`, npm `>=11` |

## Getting started

```bash
# from the SinglePlayer/ directory
npm install
npm run dev
```

Vite prints a local URL (default `http://localhost:5173/`, or the next free port). Open it in your browser and play.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server with hot-reload |
| `npm run build` | Type-check-clean production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Jump (hold to jump higher) | `Space` / `↑` | Tap |
| Duck | `↓` | — |

## Project structure

```
src/
  game/
    main.ts                  # Phaser game config + StartGame() entry, host bridge
    EventBus.ts              # Phaser EventEmitter used to talk to the host page
    eventTypes.ts            # Event channel + message-type enums, CBEvent
    runner/scenes/
      BootScene.ts           # Loads minimal assets, jumps to LoadingScene
      LoadingScene.ts        # Progress bar, loads audio, transitions to RunnerScene
      RunnerScene.ts         # Core gameplay: input, physics, spawning, scoring, UI
    public/assets/           # Images, audio, fonts (served statically)
index.html                   # Mounts the game into #game-container
```

## Host-page integration

The game communicates with an embedding page through `EventBus` and `window` events.

**Host → game** — the host pushes messages in via the global bridge:

```js
window.phaserBridge.send({
  type: "event-authenticate",      // see EventTypes in eventTypes.ts
  payload: { isAuthenticated: true },
});
```

Recognized inbound types: `event-authenticate`, `event-unlock-game`, `event-receive-reward`.

**Game → host** — the game dispatches `window` events the host can listen for:
`event-check-balance`, `event-game-over`, `event-connect-wallet`.

When run standalone (no host listening), the game falls back to a self-hosted flow so it stays fully playable.

## License

ISC
</content>
</invoke>
