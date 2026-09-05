const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { TOPICS } = require("./words");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 16;
const GUESS_SECONDS = 45;

/** @type {Map<string, Room>} */
const rooms = new Map();

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function genToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function makeRoom(code) {
  return {
    code,
    hostId: null,
    players: [], // {id, token, name, connected, socketId}
    settings: {
      imposters: 1,
      hint: "category", // "category" | "none"
      rounds: 2, // clue rounds before the final vote
      guessMode: false, // caught imposter can steal by guessing the word
      topics: Object.keys(TOPICS)
    },
    phase: "lobby", // lobby | clue | vote | guess | over
    word: null,
    category: null,
    imposterIds: [],
    turnOrder: [],
    turnIdx: 0,
    round: 1,
    clues: [], // {playerId, name, text, round}
    votes: {}, // voterId -> targetId
    lastEvent: null, // announcement shown between phases
    guessingPlayerId: null,
    guessTimer: null,
    guessDeadline: null,
    winner: null,
    reveal: null // {word, category, imposters:[names]} at game over
  };
}

function getPlayer(room, playerId) {
  return room.players.find((p) => p.id === playerId);
}

function publicState(room) {
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    settings: room.settings,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected
    })),
    turnOrder: room.turnOrder,
    currentTurn: room.phase === "clue" ? room.turnOrder[room.turnIdx] : null,
    round: room.round,
    rounds: room.settings.rounds,
    clues: room.clues,
    votedIds: Object.keys(room.votes),
    lastEvent: room.lastEvent,
    guessingPlayerId: room.guessingPlayerId,
    guessDeadline: room.guessDeadline,
    winner: room.winner,
    reveal: room.reveal,
    topicsCatalog: Object.entries(TOPICS).map(([key, t]) => ({ key, name: t.name }))
  };
}

function broadcast(room) {
  io.to(room.code).emit("state", publicState(room));
}

function sendRole(room, player) {
  if (room.phase === "lobby") return;
  const isImposter = room.imposterIds.includes(player.id);
  const role = {
    isImposter,
    word: isImposter ? null : room.word,
    category: isImposter && room.settings.hint === "category" ? room.category : null
  };
  io.to(player.socketId).emit("role", role);
}

function startGame(room) {
  room.players = room.players.filter((p) => p.connected);

  // Pick word from selected topics
  const topicKeys = room.settings.topics.filter((k) => TOPICS[k]);
  const pool = [];
  topicKeys.forEach((k) => TOPICS[k].words.forEach((w) => pool.push({ word: w, category: TOPICS[k].name })));
  const pick = pool[Math.floor(Math.random() * pool.length)];
  room.word = pick.word;
  room.category = pick.category;

  // Pick imposters
  const shuffled = [...room.players].sort(() => Math.random() - 0.5);
  room.imposterIds = shuffled.slice(0, room.settings.imposters).map((p) => p.id);

  // Turn order
  room.turnOrder = [...room.players].sort(() => Math.random() - 0.5).map((p) => p.id);
  room.turnIdx = 0;
  room.round = 1;
  room.clues = [];
  room.votes = {};
  room.winner = null;
  room.reveal = null;
  room.lastEvent = null;
  room.phase = "clue";

  room.players.forEach((p) => sendRole(room, p));
  broadcast(room);
}

function advanceTurn(room) {
  room.turnIdx++;
  // Skip disconnected players (they lose their clue turn)
  while (room.turnIdx < room.turnOrder.length) {
    const p = getPlayer(room, room.turnOrder[room.turnIdx]);
    if (p && p.connected) break;
    room.turnIdx++;
  }
  if (room.turnIdx >= room.turnOrder.length) {
    // Round complete
    if (room.round < room.settings.rounds) {
      room.round++;
      room.turnIdx = 0;
      while (room.turnIdx < room.turnOrder.length) {
        const p = getPlayer(room, room.turnOrder[room.turnIdx]);
        if (p && p.connected) break;
        room.turnIdx++;
      }
    } else {
      // All rounds done — final vote
      room.phase = "vote";
      room.votes = {};
    }
  }
}

function requiredVoters(room) {
  return room.players.filter((p) => p.connected);
}

function tallyVotes(room) {
  const counts = {};
  Object.values(room.votes).forEach((t) => (counts[t] = (counts[t] || 0) + 1));
  let max = 0;
  Object.values(counts).forEach((c) => (c > max ? (max = c) : null));
  const top = Object.keys(counts).filter((id) => counts[id] === max);
  return { counts, top, max };
}

function endGame(room, winner) {
  room.winner = winner;
  room.phase = "over";
  room.guessingPlayerId = null;
  room.guessDeadline = null;
  if (room.guessTimer) {
    clearTimeout(room.guessTimer);
    room.guessTimer = null;
  }
  room.reveal = {
    word: room.word,
    category: room.category,
    imposters: room.imposterIds.map((id) => (getPlayer(room, id) || {}).name || "?")
  };
}

function voteCounts(room) {
  const { counts } = tallyVotes(room);
  const named = {};
  Object.entries(counts).forEach(([id, c]) => {
    const p = getPlayer(room, id);
    named[p ? p.name : "?"] = c;
  });
  return named;
}

function resolveVote(room) {
  const { top, max } = tallyVotes(room);
  const countsByName = voteCounts(room);

  if (top.length !== 1 || max === 0) {
    // No clear accusation — the imposters slip away
    room.lastEvent = { type: "tie", counts: countsByName };
    endGame(room, "imposters");
    broadcast(room);
    return;
  }

  const target = getPlayer(room, top[0]);
  const wasImposter = room.imposterIds.includes(target.id);
  room.lastEvent = {
    type: "accusation",
    name: target.name,
    wasImposter,
    counts: countsByName
  };

  if (!wasImposter) {
    endGame(room, "imposters");
    broadcast(room);
    return;
  }

  if (room.settings.guessMode) {
    // Caught imposter gets one chance to guess the word and steal the win
    room.phase = "guess";
    room.guessingPlayerId = target.id;
    room.guessDeadline = Date.now() + GUESS_SECONDS * 1000;
    room.guessTimer = setTimeout(() => finishGuess(room, null), GUESS_SECONDS * 1000);
    broadcast(room);
  } else {
    endGame(room, "civilians");
    broadcast(room);
  }
}

function finishGuess(room, guess) {
  if (room.phase !== "guess") return;
  if (room.guessTimer) {
    clearTimeout(room.guessTimer);
    room.guessTimer = null;
  }
  const guesser = getPlayer(room, room.guessingPlayerId);
  const correct =
    guess && guess.trim().toLowerCase() === room.word.trim().toLowerCase();
  room.lastEvent = {
    type: "guess",
    name: guesser ? guesser.name : "?",
    guess: guess || null,
    correct
  };
  room.guessingPlayerId = null;
  room.guessDeadline = null;
  endGame(room, correct ? "imposters" : "civilians");
  broadcast(room);
}

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name }, cb) => {
    name = String(name || "").trim().slice(0, 20);
    if (!name) return cb({ error: "Enter a name" });
    const code = genCode();
    const room = makeRoom(code);
    const player = {
      id: genToken().slice(0, 10),
      token: genToken(),
      name,
      connected: true,
      socketId: socket.id
    };
    room.players.push(player);
    room.hostId = player.id;
    rooms.set(code, room);
    socket.join(code);
    socket.data.code = code;
    socket.data.playerId = player.id;
    cb({ ok: true, code, playerId: player.id, token: player.token, state: publicState(room) });
  });

  socket.on("joinRoom", ({ code, name, token }, cb) => {
    code = String(code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb({ error: "Room not found" });

    // Reconnect with token
    if (token) {
      const existing = room.players.find((p) => p.token === token);
      if (existing) {
        existing.connected = true;
        existing.socketId = socket.id;
        socket.join(code);
        socket.data.code = code;
        socket.data.playerId = existing.id;
        cb({ ok: true, code, playerId: existing.id, token: existing.token, state: publicState(room) });
        sendRole(room, existing);
        broadcast(room);
        return;
      }
    }

    name = String(name || "").trim().slice(0, 20);
    if (!name) return cb({ error: "Enter a name" });

    // Reclaim a disconnected player's seat by name (e.g. phone killed the tab)
    const ghost = room.players.find(
      (p) => !p.connected && p.name.toLowerCase() === name.toLowerCase()
    );
    if (ghost) {
      ghost.connected = true;
      ghost.socketId = socket.id;
      socket.join(code);
      socket.data.code = code;
      socket.data.playerId = ghost.id;
      cb({ ok: true, code, playerId: ghost.id, token: ghost.token, state: publicState(room) });
      sendRole(room, ghost);
      broadcast(room);
      return;
    }

    if (room.phase !== "lobby") return cb({ error: "Game already in progress — ask the host to finish the round" });
    if (room.players.filter((p) => p.connected).length >= MAX_PLAYERS)
      return cb({ error: "Room is full" });
    if (room.players.some((p) => p.connected && p.name.toLowerCase() === name.toLowerCase()))
      return cb({ error: "That name is taken in this room" });

    const player = {
      id: genToken().slice(0, 10),
      token: genToken(),
      name,
      connected: true,
      socketId: socket.id
    };
    room.players.push(player);
    socket.join(code);
    socket.data.code = code;
    socket.data.playerId = player.id;
    cb({ ok: true, code, playerId: player.id, token: player.token, state: publicState(room) });
    broadcast(room);
  });

  function ctx() {
    const room = rooms.get(socket.data.code);
    if (!room) return {};
    const player = getPlayer(room, socket.data.playerId);
    return { room, player };
  }

  socket.on("updateSettings", (settings) => {
    const { room, player } = ctx();
    if (!room || !player || player.id !== room.hostId || room.phase !== "lobby") return;
    const s = room.settings;
    if (Number.isInteger(settings.imposters)) s.imposters = Math.min(4, Math.max(1, settings.imposters));
    if (settings.hint === "category" || settings.hint === "none") s.hint = settings.hint;
    if (Number.isInteger(settings.rounds)) s.rounds = Math.min(5, Math.max(1, settings.rounds));
    if (typeof settings.guessMode === "boolean") s.guessMode = settings.guessMode;
    if (Array.isArray(settings.topics)) {
      const valid = settings.topics.filter((k) => TOPICS[k]);
      if (valid.length > 0) s.topics = valid;
    }
    broadcast(room);
  });

  socket.on("startGame", (cb) => {
    const { room, player } = ctx();
    if (!room || !player || player.id !== room.hostId) return;
    if (room.phase !== "lobby" && room.phase !== "over") return;
    const connected = room.players.filter((p) => p.connected);
    const minPlayers = Math.max(3, room.settings.imposters * 2 + 1);
    if (connected.length < minPlayers)
      return cb && cb({ error: `Need at least ${minPlayers} players for ${room.settings.imposters} imposter(s)` });
    startGame(room);
    cb && cb({ ok: true });
  });

  socket.on("submitClue", ({ text }) => {
    const { room, player } = ctx();
    if (!room || !player || room.phase !== "clue") return;
    if (room.turnOrder[room.turnIdx] !== player.id) return;
    text = String(text || "").trim().slice(0, 60);
    if (!text) return;
    room.clues.push({
      playerId: player.id,
      name: player.name,
      text,
      round: room.round
    });
    room.lastEvent = null;
    advanceTurn(room);
    broadcast(room);
  });

  socket.on("castVote", ({ targetId }) => {
    const { room, player } = ctx();
    if (!room || !player || room.phase !== "vote") return;
    const target = getPlayer(room, targetId);
    if (!target) return;
    if (targetId === player.id) return; // can't vote yourself
    room.votes[player.id] = targetId;
    const needed = requiredVoters(room);
    const done = needed.every((p) => room.votes[p.id]);
    if (done) {
      resolveVote(room);
    } else {
      broadcast(room);
    }
  });

  socket.on("imposterGuess", ({ word }) => {
    const { room, player } = ctx();
    if (!room || !player || room.phase !== "guess") return;
    if (player.id !== room.guessingPlayerId) return;
    finishGuess(room, String(word || ""));
  });

  socket.on("skipGuess", () => {
    // Host can skip if the eliminated imposter is AFK
    const { room, player } = ctx();
    if (!room || !player || room.phase !== "guess") return;
    if (player.id !== room.hostId && player.id !== room.guessingPlayerId) return;
    finishGuess(room, null);
  });

  socket.on("playAgain", () => {
    const { room, player } = ctx();
    if (!room || !player || player.id !== room.hostId || room.phase !== "over") return;
    room.phase = "lobby";
    room.clues = [];
    room.votes = {};
    room.winner = null;
    room.reveal = null;
    room.lastEvent = null;
    room.players = room.players.filter((p) => p.connected);
    broadcast(room);
  });

  socket.on("kickPlayer", ({ targetId }) => {
    const { room, player } = ctx();
    if (!room || !player || player.id !== room.hostId || room.phase !== "lobby") return;
    const idx = room.players.findIndex((p) => p.id === targetId);
    if (idx === -1 || targetId === room.hostId) return;
    const [kicked] = room.players.splice(idx, 1);
    io.to(kicked.socketId).emit("kicked");
    broadcast(room);
  });

  socket.on("leaveRoom", () => {
    handleLeave(true);
  });

  socket.on("disconnect", () => {
    handleLeave(false);
  });

  function handleLeave(explicit) {
    const room = rooms.get(socket.data.code);
    if (!room) return;
    const player = getPlayer(room, socket.data.playerId);
    if (!player || player.socketId !== socket.id) return;

    if (explicit || room.phase === "lobby") {
      room.players = room.players.filter((p) => p.id !== player.id);
    } else {
      player.connected = false;
    }
    socket.leave(room.code);
    socket.data.code = null;

    if (room.players.filter((p) => p.connected).length === 0) {
      // Everyone gone — keep the room 10 min for reconnects, then delete
      setTimeout(() => {
        const r = rooms.get(room.code);
        if (r && r.players.filter((p) => p.connected).length === 0) {
          if (r.guessTimer) clearTimeout(r.guessTimer);
          rooms.delete(room.code);
        }
      }, 10 * 60 * 1000);
      return;
    }

    // Host handover
    if (player.id === room.hostId) {
      const next = room.players.find((p) => p.connected);
      if (next) room.hostId = next.id;
    }

    // If it was their clue turn, skip them
    if (room.phase === "clue" && room.turnOrder[room.turnIdx] === player.id && !player.connected) {
      advanceTurn(room);
    }

    // If everyone remaining has voted, resolve
    if (room.phase === "vote") {
      const needed = requiredVoters(room);
      if (needed.length > 0 && needed.every((p) => room.votes[p.id])) {
        resolveVote(room);
        return;
      }
    }

    broadcast(room);
  }
});

server.listen(PORT, () => {
  console.log(`Imposter game running on http://localhost:${PORT}`);
});

