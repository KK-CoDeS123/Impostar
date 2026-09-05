/* global io */
const socket = io();

let state = null; // last public state from server
let me = { playerId: null, token: null, code: null, name: null };
let role = null; // {isImposter, word, category}
let wordHidden = false;
let myVote = null;
let guessInterval = null;

const $ = (id) => document.getElementById(id);
const screens = ["home", "lobby", "game", "vote", "guess", "over"];

function show(name) {
  screens.forEach((s) => $("screen-" + s).classList.toggle("hidden", s !== name));
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

// sessionStorage = per-tab: refresh keeps your seat, a second tab is a fresh player
function saveSession() {
  try { sessionStorage.setItem("imposter-session", JSON.stringify(me)); } catch {}
  try { localStorage.setItem("imposter-name", me.name || ""); } catch {}
}
function loadSession() {
  try { return JSON.parse(sessionStorage.getItem("imposter-session")); } catch { return null; }
}
function clearSession() {
  try { sessionStorage.removeItem("imposter-session"); } catch {}
  me = { playerId: null, token: null, code: null, name: null };
  role = null;
  myVote = null;
  state = null;
}

// ---------- MUSIC ----------
const bgm = $("bgm");
bgm.volume = 0.35;
let musicOn = localStorage.getItem("imposter-music") !== "off";

function renderMusicBtn() {
  const b = $("btn-music");
  b.textContent = musicOn ? "🎵" : "🔇";
  b.classList.toggle("off", !musicOn);
}
function tryPlayMusic() {
  if (musicOn && bgm.paused) bgm.play().catch(() => {});
}
$("btn-music").onclick = (e) => {
  e.stopPropagation();
  musicOn = !musicOn;
  localStorage.setItem("imposter-music", musicOn ? "on" : "off");
  if (musicOn) bgm.play().catch(() => {});
  else bgm.pause();
  renderMusicBtn();
};
// Browsers block autoplay until the user interacts — start on first tap/keypress
["pointerdown", "keydown"].forEach((evt) =>
  document.addEventListener(evt, tryPlayMusic, { passive: true })
);
renderMusicBtn();

// ---------- HOME ----------
const params = new URLSearchParams(location.search);
if (params.get("room")) $("inp-code").value = params.get("room").toUpperCase();
const saved = loadSession();
const savedName = saved && saved.name ? saved.name : (localStorage.getItem("imposter-name") || "");
if (savedName) $("inp-name").value = savedName;

$("btn-create").onclick = () => {
  const name = $("inp-name").value.trim();
  if (!name) return toast("Enter your name first");
  socket.emit("createRoom", { name }, (res) => {
    if (res.error) return toast(res.error);
    onJoined(res, name);
  });
};

$("btn-join").onclick = () => {
  const name = $("inp-name").value.trim();
  const code = $("inp-code").value.trim().toUpperCase();
  if (!name) return toast("Enter your name first");
  if (!code) return toast("Enter the room code");
  socket.emit("joinRoom", { code, name }, (res) => {
    if (res.error) return toast(res.error);
    onJoined(res, name);
  });
};

function onJoined(res, name) {
  me = { playerId: res.playerId, token: res.token, code: res.code, name };
  saveSession();
  state = res.state;
  render();
}

// Auto-rejoin after refresh
socket.on("connect", () => {
  const s = loadSession();
  if (s && s.code && s.token && !state) {
    socket.emit("joinRoom", { code: s.code, token: s.token }, (res) => {
      if (res.error) { clearSession(); show("home"); return; }
      me = { playerId: res.playerId, token: res.token, code: res.code, name: s.name };
      saveSession();
      state = res.state;
      render();
    });
  } else if (state) {
    // reconnect mid-session
    socket.emit("joinRoom", { code: me.code, token: me.token }, (res) => {
      if (!res.error) { state = res.state; render(); }
    });
  }
});

socket.on("state", (s) => {
  if (!me.playerId) return;
  if (s.phase === "vote" && (!state || state.phase !== "vote" || state.cycle !== s.cycle)) myVote = null;
  state = s;
  render();
});

socket.on("role", (r) => {
  role = r;
  wordHidden = false;
  renderWordCard();
});

socket.on("kicked", () => {
  clearSession();
  show("home");
  toast("You were removed from the room");
});

// ---------- RENDER ----------
function isHost() { return state && state.hostId === me.playerId; }
function myPlayer() { return state.players.find((p) => p.id === me.playerId); }
function pname(id) {
  const p = state.players.find((x) => x.id === id);
  return p ? p.name : "?";
}

function render() {
  if (!state) return show("home");
  switch (state.phase) {
    case "lobby": renderLobby(); show("lobby"); break;
    case "clue": renderGame(); show("game"); break;
    case "vote": renderVote(); show("vote"); break;
    case "guess": renderGuess(); show("guess"); break;
    case "over": renderOver(); show("over"); break;
  }
}

function playerRow(p, extras = "") {
  const cls = ["player"];
  if (!p.connected) cls.push("off");
  if (!p.alive) cls.push("dead");
  const host = p.id === state.hostId ? '<span class="badge">HOST</span>' : "";
  const you = p.id === me.playerId ? '<span class="badge you">YOU</span>' : "";
  return `<div class="${cls.join(" ")}"><div class="dot"></div><div class="name">${esc(p.name)}</div>${you}${host}${extras}</div>`;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ---------- LOBBY ----------
function renderLobby() {
  $("lobby-code").textContent = state.code;
  const connected = state.players.filter((p) => p.connected);
  $("lobby-count").textContent = connected.length;
  $("lobby-players").innerHTML = state.players.map((p) => {
    const kick = isHost() && p.id !== me.playerId
      ? `<button class="small danger" onclick="kick('${p.id}')">✕</button>` : "";
    return playerRow(p, kick);
  }).join("");

  $("host-settings").classList.toggle("hidden", !isHost());
  $("guest-settings").classList.toggle("hidden", isHost());
  $("btn-start").classList.toggle("hidden", !isHost());

  const s = state.settings;
  if (isHost()) {
    $("imp-val").textContent = s.imposters;
    document.querySelectorAll("#hint-seg button").forEach((b) => b.classList.toggle("on", b.dataset.v === s.hint));
    document.querySelectorAll("#rounds-seg button").forEach((b) => b.classList.toggle("on", +b.dataset.v === s.cluesPerVote));
    $("topic-chips").innerHTML = state.topicsCatalog.map((t) =>
      `<div class="chip ${s.topics.includes(t.key) ? "on" : ""}" onclick="toggleTopic('${t.key}')">${t.name}</div>`
    ).join("");
  } else {
    const topicNames = state.topicsCatalog.filter((t) => s.topics.includes(t.key)).map((t) => t.name).join(", ");
    $("guest-settings-text").innerHTML =
      `${s.imposters} imposter(s) · imposter sees ${s.hint === "category" ? "category hint" : "nothing"} · ` +
      `${s.cluesPerVote} clue round(s) per vote<br>Topics: ${topicNames}<br><br>Waiting for the host to start…`;
  }
}

window.kick = (id) => socket.emit("kickPlayer", { targetId: id });
window.toggleTopic = (key) => {
  const topics = [...state.settings.topics];
  const i = topics.indexOf(key);
  if (i >= 0) { if (topics.length > 1) topics.splice(i, 1); }
  else topics.push(key);
  socket.emit("updateSettings", { topics });
};

$("imp-minus").onclick = () => socket.emit("updateSettings", { imposters: state.settings.imposters - 1 });
$("imp-plus").onclick = () => socket.emit("updateSettings", { imposters: state.settings.imposters + 1 });
document.querySelectorAll("#hint-seg button").forEach((b) => b.onclick = () => socket.emit("updateSettings", { hint: b.dataset.v }));
document.querySelectorAll("#rounds-seg button").forEach((b) => b.onclick = () => socket.emit("updateSettings", { cluesPerVote: +b.dataset.v }));

$("btn-start").onclick = () => socket.emit("startGame", (res) => {
  if (res && res.error) toast(res.error);
});

$("btn-share").onclick = async () => {
  const url = `${location.origin}/?room=${state.code}`;
  try {
    if (navigator.share) await navigator.share({ title: "Imposter game", text: `Join my Imposter game! Code: ${state.code}`, url });
    else { await navigator.clipboard.writeText(url); toast("Link copied!"); }
  } catch { /* user cancelled */ }
};

function leave() {
  socket.emit("leaveRoom");
  clearSession();
  show("home");
}
$("btn-leave").onclick = leave;
$("btn-leave2").onclick = leave;

// ---------- GAME (clues) ----------
function renderWordCard() {
  if (!role) return;
  const card = $("word-card");
  card.classList.toggle("imposter", role.isImposter);
  if (wordHidden) {
    $("word-label").textContent = "hidden";
    $("word-text").textContent = "🙈";
    $("word-hint").textContent = "tap to reveal";
    return;
  }
  if (role.isImposter) {
    $("word-label").textContent = "You are the";
    $("word-text").textContent = "IMPOSTER";
    $("word-hint").textContent = role.category
      ? `Category: ${role.category} — blend in! (tap to hide)`
      : "No hints. Bluff your way through! (tap to hide)";
  } else {
    $("word-label").textContent = "Your word";
    $("word-text").textContent = role.word;
    $("word-hint").textContent = "give subtle clues, don't say it! (tap to hide)";
  }
}
$("word-card").onclick = () => { wordHidden = !wordHidden; renderWordCard(); };

function renderClues(el) {
  if (!state.clues.length) {
    el.innerHTML = '<p class="muted">No clues yet.</p>';
    return;
  }
  el.innerHTML = state.clues.map((c) =>
    `<div class="clue"><span class="who">${esc(c.name)}</span>${esc(c.text)}<span class="cyc">R${c.cycle}.${c.round}</span></div>`
  ).join("");
  el.scrollTop = el.scrollHeight;
}

function renderGame() {
  renderWordCard();
  const ev = $("game-event");
  if (state.lastEvent) {
    ev.innerHTML = eventText(state.lastEvent);
    ev.classList.remove("hidden");
  } else ev.classList.add("hidden");

  $("clue-round").textContent = `${state.cycle}.${state.clueRound}`;
  const current = state.currentTurn;
  const myTurn = current === me.playerId && myPlayer() && myPlayer().alive;
  const banner = $("turn-banner");
  banner.classList.toggle("me", myTurn);
  if (myPlayer() && !myPlayer().alive) {
    banner.textContent = "You were eliminated — spectating 👻";
  } else {
    banner.textContent = myTurn ? "✍️ Your turn — drop a clue!" : `Waiting for ${pname(current)}…`;
  }
  $("clue-input-card").classList.toggle("hidden", !myTurn);
  renderClues($("clue-feed"));
  $("game-players").innerHTML = state.players.map((p) => {
    const turn = p.id === current ? '<span class="badge" style="background:var(--warn); color:#3a2800;">TURN</span>' : "";
    return playerRow(p, turn);
  }).join("");
}

$("btn-clue").onclick = sendClue;
$("inp-clue").addEventListener("keydown", (e) => { if (e.key === "Enter") sendClue(); });
function sendClue() {
  const text = $("inp-clue").value.trim();
  if (!text) return;
  if (role && role.word && text.toLowerCase().includes(role.word.toLowerCase()))
    return toast("You can't say the word itself! 😅");
  socket.emit("submitClue", { text });
  $("inp-clue").value = "";
}

// ---------- VOTE ----------
function renderVote() {
  const alive = state.players.filter((p) => p.alive);
  const voters = alive.filter((p) => p.connected);
  $("vote-progress").textContent = `${state.votedIds.length}/${voters.length} voted`;
  const iCanVote = myPlayer() && myPlayer().alive;
  const iVoted = state.votedIds.includes(me.playerId);

  $("vote-options").innerHTML = alive.map((p) => {
    if (p.id === me.playerId) return playerRow(p);
    const sel = myVote === p.id ? "sel" : "";
    const dis = !iCanVote || iVoted ? "disabled" : "";
    return `<button class="vote-btn ${sel}" ${dis} onclick="vote('${p.id}')">
      <span>${esc(p.name)}</span><span>${myVote === p.id ? "✔ voted" : "vote"}</span></button>`;
  }).join("");
  renderClues($("vote-clues"));
}

window.vote = (id) => {
  myVote = id;
  socket.emit("castVote", { targetId: id });
  render();
};

// ---------- GUESS ----------
function renderGuess() {
  const g = pname(state.guessingPlayerId);
  const isMe = state.guessingPlayerId === me.playerId;
  $("guess-title").textContent = isMe
    ? "You were caught! One last chance — guess the word to steal the win!"
    : `${g} was the imposter… but they get one guess at the word!`;
  $("guess-input-card").classList.toggle("hidden", !isMe);
  $("btn-skip-guess").classList.toggle("hidden", !isHost());

  clearInterval(guessInterval);
  guessInterval = setInterval(() => {
    if (!state || state.phase !== "guess" || !state.guessDeadline) return clearInterval(guessInterval);
    const left = Math.max(0, Math.ceil((state.guessDeadline - Date.now()) / 1000));
    $("guess-timer").textContent = `⏱ ${left}s`;
  }, 250);
}

$("btn-guess").onclick = () => {
  const word = $("inp-guess").value.trim();
  if (!word) return;
  socket.emit("imposterGuess", { word });
  $("inp-guess").value = "";
};
$("inp-guess").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btn-guess").click(); });
$("btn-skip-guess").onclick = () => socket.emit("skipGuess");

// ---------- OVER ----------
function eventText(ev) {
  if (ev.type === "tie") return `🤝 Vote tied — nobody eliminated. More clues!`;
  if (ev.type === "elimination")
    return `${esc(ev.name)} was voted out — they were ${ev.wasImposter ? "🔴 an IMPOSTER!" : "🟢 innocent…"}`;
  if (ev.type === "guess")
    return ev.correct
      ? `😈 ${esc(ev.name)} guessed the word${ev.guess ? ` ("${esc(ev.guess)}")` : ""} — imposters steal the win!`
      : `${esc(ev.name)} ${ev.guess ? `guessed "${esc(ev.guess)}" — wrong!` : "didn't guess in time."}`;
  return "";
}

function renderOver() {
  clearInterval(guessInterval);
  const win = state.winner;
  const iAmImposter = role && role.isImposter;
  const iWon = (win === "imposters") === !!iAmImposter;
  $("over-emoji").textContent = iWon ? "🎉" : "💀";
  $("over-title").textContent = win === "imposters" ? "Imposters win!" : "Civilians win!";
  $("over-sub").textContent = iWon ? "You were on the winning side!" : "Better luck next round…";
  const ev = $("over-event");
  if (state.lastEvent) { ev.innerHTML = eventText(state.lastEvent); ev.classList.remove("hidden"); }
  else ev.classList.add("hidden");
  $("over-word").textContent = state.reveal ? state.reveal.word : "?";
  $("over-category").textContent = state.reveal ? `(${state.reveal.category})` : "";
  $("over-imposters").textContent = state.reveal ? state.reveal.imposters.join(", ") : "?";
  $("btn-again").classList.toggle("hidden", !isHost());
  $("over-wait").textContent = isHost() ? "" : "Waiting for the host to start a new round…";
}

$("btn-again").onclick = () => socket.emit("playAgain");
