// ------- Config -------
const snakes = {
  98: 78, 95: 75, 92: 88, 87: 24, 64: 60, 62: 19, 54: 34, 47: 26, 17: 7
};
const ladders = {
  3: 22, 5: 8, 11: 26, 20: 29, 27: 56, 36: 44, 51: 67, 71: 91, 80: 99
};
const needExactToWin = true;

// ------- Elements -------
const boardEl = document.getElementById("board");
const tokenP1 = document.getElementById("tokenP1");
const tokenP2 = document.getElementById("tokenP2");
const p1posEl = document.getElementById("p1pos");
const p2posEl = document.getElementById("p2pos");
const rollBtn = document.getElementById("rollBtn");
const diceEl = document.getElementById("dice");
const msgEl = document.getElementById("msg");
const pEls = [...document.querySelectorAll(".p")];

// ------- Audio (no files needed) -------
const ctx = new (window.AudioContext || window.webkitAudioContext)();
function beep(freq = 600, dur = 100, type = "sine", vol = 0.04) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol; o.connect(g); g.connect(ctx.destination);
  o.start(); setTimeout(()=>o.stop(), dur);
}
function rollSound(){beep(220,70,"triangle",0.06); setTimeout(()=>beep(330,70),70); setTimeout(()=>beep(440,70),140)}
function climbSound(){beep(660,120,"square",0.06); setTimeout(()=>beep(880,120,"square",0.06),120)}
function snakeSound(){beep(180,200,"sawtooth",0.06); setTimeout(()=>beep(120,220,"sawtooth",0.05),150)}
function winSound(){[700,900,1100,1400].forEach((f,i)=>setTimeout(()=>beep(f,120,"square",0.07),i*140))}

// ------- Build board (1..100 in snake pattern) -------
const cells = [];
for (let r = 9; r >= 0; r--) {
  const row = [];
  for (let c = 0; c < 10; c++) {
    const idx = r % 2 === 0 ? c : 9 - c;
    const n = r * 10 + (idx + 1);
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.innerHTML = `<span class="n">${n}</span>`;
    boardEl.appendChild(cell);
    row.push(cell);
    cells[n] = cell; // direct access by number
  }
  // visual accents per row
}
addAccents();

function addAccents(){
  const ladderBg = "conic-gradient(from 45deg at 50% 50%, #96f 0 25%, transparent 0 100%)";
  const snakeBg  = "radial-gradient(circle at 50% 50%, #0ab 0 30%, transparent 34% 100%)";
  Object.entries(ladders).forEach(([a,b])=>{
    const el = document.createElement("div");
    el.className = "ladder"; el.style.backgroundImage = ladderBg;
    cells[a].appendChild(el);
  });
  Object.entries(snakes).forEach(([a,b])=>{
    const el = document.createElement("div");
    el.className = "snake"; el.style.backgroundImage = snakeBg;
    cells[a].appendChild(el);
  });
}

// ------- State -------
let pos = [0,1,1]; // ignore index 0; players at 1
let turn = 1;      // 1 or 2
placeTokens();

// ------- Helpers -------
function cellCenter(n) {
  // center of the cell, relative to the board-area container
  const rectArea = areaEl.getBoundingClientRect();
  const rectCell = cells[n].getBoundingClientRect();
  const x = (rectCell.left + rectCell.right) / 2 - rectArea.left;
  const y = (rectCell.top + rectCell.bottom) / 2 - rectArea.top;
  return { x, y };
}
function placeTokens() {
  [1, 2].forEach((p) => {
    const { x, y } = cellCenter(pos[p]);
    const t = p === 1 ? tokenP1 : tokenP2;
    const dx = p === 1 ? -8 : 8;
    const dy = p === 1 ? -8 : 8;

    // Convert to percent *of the container* so it scales perfectly
    const leftPct = ((x + dx) / areaEl.clientWidth) * 100;
    const topPct  = ((y + dy) / areaEl.clientHeight) * 100;

    t.style.left = `${leftPct}%`;
    t.style.top  = `${topPct}%`;
  });

  p1posEl.textContent = pos[1];
  p2posEl.textContent = pos[2];
  pEls.forEach((el) => el.classList.remove("active"));
  document.querySelector(`.p${turn}`).classList.add("active");
}

// make sure first layout is measured after paint
window.addEventListener("load", placeTokens);
window.addEventListener("resize", placeTokens);

// ------- Gameplay -------
rollBtn.addEventListener("click", async ()=>{
  rollBtn.disabled = true;
  rollSound();
  const roll = 1 + Math.floor(Math.random()*6);
  diceEl.textContent = ["⚀","⚁","⚂","⚃","⚄","⚅"][roll-1];

  let target = pos[turn] + roll;
  if (target > 100 && needExactToWin) {
    msg(`Need exact roll. Player ${turn === 1 ? "1" : "2"} stays at ${pos[turn]}.`);
    await delay(350);
    swapTurn(); return;
  }
  await animateMove(pos[turn], target, turn);

  if (snakes[target]) {
    msg("Oops, snake! Slide down.");
    snakeSound();
    await delay(420);
    await animateJump(target, snakes[target], turn);
    target = snakes[target];
  }
  if (ladders[target]) {
    msg("Nice! Ladder up.");
    climbSound();
    await delay(420);
    await animateJump(target, ladders[target], turn);
    target = ladders[target];
  }

  pos[turn] = target;
  placeTokens();

  if (target === 100) {
    winSound();
    msg(`Player ${turn} wins!`);
    rollBtn.disabled = true;
    return;
  }
  swapTurn();
});

function swapTurn(){
  turn = turn === 1 ? 2 : 1;
  msg(`Player ${turn}, roll!`);
  rollBtn.disabled = false;
}

function msg(t){ msgEl.textContent = t; }
function delay(ms){ return new Promise(res=>setTimeout(res, ms)); }

async function animateMove(from, to, player){
  const step = from < to ? 1 : -1;
  for (let n = from + step; step>0 ? n<=to : n>=to; n+=step) {
    await delay(220);
    pos[player] = n; placeTokens(); beep(420,60,"triangle",0.03);
  }
}
async function animateJump(from, to, player){
  // quick hop animation
  beep(520,90,"square",0.05);
  pos[player] = to; placeTokens();
}
