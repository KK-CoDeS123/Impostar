# Imposter 🕵️

An online multiplayer party game for you and your friends (3–16 players).

Everyone secretly receives the same word — except the imposter(s). Each round, every player gives a subtle clue about the word. After the clue rounds, everyone votes on who they think the imposter is. A caught imposter gets one last chance to guess the word and steal the win!

## Features

- **Room codes** — host creates a room, friends join with a 4-letter code or invite link
- **Configurable imposters** — 1 to 4 imposters per game
- **Imposter hint modes** — imposter sees the word's category, or nothing at all
- **Topic packs** — pick which categories words come from (food, movies, sports, tech…)
- **Clue rounds** — 1–3 clue rounds before each vote
- **Multiple vote cycles** — ties and wrong votes lead to more clues, like real deduction games
- **Reconnect support** — refresh or drop your connection and rejoin seamlessly
- Mobile-friendly — designed to be played from phones

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 — open multiple tabs to test with fake friends.

## Deploy for free (so friends can play online)

### Render (recommended)

1. Push this folder to a GitHub repo.
2. Go to [render.com](https://render.com) → New → **Web Service** → connect the repo.
3. Settings: Build command `npm install`, Start command `npm start`, Instance type **Free**.
4. Deploy — you'll get a URL like `https://imposter-xyz.onrender.com`. Share it with friends!

> Note: free Render services sleep after inactivity; the first visit may take ~30s to wake up.

### Railway / Fly.io

Any Node.js host with WebSocket support works — just run `npm start` with the `PORT` env variable (already handled).

## How to play

1. Host creates a room, picks settings, shares the code.
2. Everyone joins and the host starts the game.
3. Check your secret word (tap the card to hide it from shoulder-surfers).
4. On your turn, type a clue — subtle enough that the imposter can't figure out the word, clear enough that other civilians know you know it.
5. Vote! Wrong vote = the innocent player is eliminated and the game continues. Catch an imposter and they get one guess at the word to steal the win.
6. Civilians win when all imposters are out. Imposters win by surviving to parity or guessing the word.
