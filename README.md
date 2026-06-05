# Crypto Beast — Single Player (cb-sp-01)

A browser-based endless runner game with an on-chain event, scoring, and reward
layer built on Solana. The repository is a monorepo with two independent parts:

| Directory                            | What it is                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [`SinglePlayer/`](./SinglePlayer/)   | The game — a Phaser 3 + TypeScript side-scrolling runner, bundled with Vite.                         |
| [`anchor/`](./anchor/)               | The `sp-events` Solana program (Anchor) — manages game events, player registration, scores, rewards. |

## How the pieces fit together

- **`SinglePlayer`** runs standalone in the browser or embedded in a host page
  (e.g. a web3 wallet app). It talks to the host through a small event bridge for
  wallet auth, play-unlock, and reward flows. See
  [`SinglePlayer/README.md`](./SinglePlayer/README.md) for gameplay, controls,
  project structure, and the host-integration API.
- **`anchor`** holds the `sp_events` program (id
  `37e2LZB4upG4gE9hmfc6YUxqtokBG7wbdYaBhqd3X4F1`). It exposes instructions to
  create reward events, verify/register players, deposit to a vault, and submit
  scores, emitting events (`PlayerJoined`, `ScoreSubmitted`, …) that the host app
  can react to.

## Getting started

Each part is self-contained with its own dependencies and tooling.

### Game

```bash
cd SinglePlayer
npm install
npm run dev          # http://localhost:5173/
```

### Solana program

```bash
cd anchor
yarn install
anchor build
anchor test          # runs against a local validator
```

## License

ISC
