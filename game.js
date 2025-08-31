/*************************************************************
 *  Garbage Goblin Game
 *  ===================
 *  Vanilla JS game: intro+rules → falling items → bins
 *  Scoring, lives, educational tips, win/lose screens, pause
 *************************************************************/

/* ===========================================================
   ============ 1) DOM ELEMENTS (grab once) ==================
   =========================================================== */
const menu         = document.getElementById("menu");
const gameScreen   = document.getElementById("gameScreen");
const startBtn     = document.getElementById("startBtn");

const playfield    = document.getElementById("playfield");
const fallingItem  = document.getElementById("fallingItem");
const itemLabel    = document.getElementById("itemLabel");

const hud          = document.getElementById("hud");
const scoreEl      = document.getElementById("score");
const livesEl      = document.getElementById("lives");
const leftEl       = document.getElementById("leftCount");

const pauseBtn     = document.getElementById("pauseBtn");
const pauseOverlay = document.getElementById("pauseOverlay");
const resumeBtn2   = document.getElementById("resumeBtn2");

/* Modals */
const modalBackdrop    = document.getElementById("modalBackdrop");
const modalText        = document.getElementById("modalText");
const modalClose       = document.getElementById("modalClose");
const modalNext        = document.getElementById("modalNext");

const endModal         = document.getElementById("endModal");
const endText          = document.getElementById("endText");
const endNext          = document.getElementById("endNext");
const playAgainBtn     = document.getElementById("playAgainBtn");

const loseModal        = document.getElementById("loseModal");
const loseText         = document.getElementById("loseText");
const loseNext         = document.getElementById("loseNext");
const playAgainBtnLose = document.getElementById("playAgainBtnLose");

/* Education bar */
const eduBar  = document.getElementById("eduBar");
const eduIcon = document.getElementById("eduIcon");
const eduText = document.getElementById("eduText");


/* ===========================================================
   ============ 2) GAME DATA (items, tips) ===================
   =========================================================== */
const ITEMS = [
  // Organic
  { name: "Banana peel",    cat: "organic", src: "./assets/banana.png" },
  { name: "Apple core",     cat: "organic", src: "./assets/apple-core.png" },
  { name: "Lettuce leaf",   cat: "organic", src: "./assets/lettuce-leaf.png" },
  { name: "Orange peel",    cat: "organic", src: "./assets/orange-peel.png" },
  { name: "Fish skeleton",  cat: "organic", src: "./assets/fish-skeleton.png" },
  { name: "Rose flower",    cat: "organic", src: "./assets/rose-flower.png" },
  { name: "Pizza crust",    cat: "organic", src: "./assets/pizza-crust.png" },

  // Paper
  { name: "Newspaper",      cat: "paper",   src: "./assets/newspaper.png" },
  { name: "Cardboard box",  cat: "paper",   src: "./assets/cardboard.png" },
  { name: "Magazine",       cat: "paper",   src: "./assets/magazine.png" },
  { name: "Envelope",       cat: "paper",   src: "./assets/envelope.png" },
  { name: "Egg carton",     cat: "paper",   src: "./assets/egg-carton.png" },
  { name: "Crumpled paper", cat: "paper",   src: "./assets/crumpled-paper.png" },
  { name: "Paper bag",      cat: "paper",   src: "./assets/paper-bag.png" },

  // Plastic
  { name: "Plastic bottle",   cat: "plastic", src: "./assets/plastic-bottle.png" },
  { name: "Soda can",         cat: "plastic", src: "./assets/soda-can.png" },
  { name: "Detergent bottle", cat: "plastic", src: "./assets/detergent-bottle.png" },
  { name: "Plastic cutlery",  cat: "plastic", src: "./assets/plastic-cutlery.png" },
  { name: "Disposable cup",   cat: "plastic", src: "./assets/disposable-cup.png" },
  { name: "Yogurt cup",       cat: "plastic", src: "./assets/yogurt-cup.png" },
  { name: "Washing liquid",   cat: "plastic", src: "./assets/washing-liquid.png" },

  // Glass
  { name: "Glass jar",        cat: "glass",   src: "./assets/glass-jar.png" },
  { name: "Jam jar",          cat: "glass",   src: "./assets/jam-jar.png" },
  { name: "Wine bottle",      cat: "glass",   src: "./assets/wine-bottle.png" },
  { name: "Olive oil bottle", cat: "glass",   src: "./assets/olive-oil-bottle.png" },
  { name: "Drinking glass",   cat: "glass",   src: "./assets/drinking-glass.png" },
  { name: "Light bulb",       cat: "glass",   src: "./assets/light-bulb.png" }
];

const TIPS_BY_CAT = {
  organic: "Food scraps & garden waste belong in ORGANIC/compost.",
  paper:   "Clean, dry paper & card go in PAPER. Greasy/soiled card does not.",
  plastic: "Bottles, tubs & cups go in PLASTIC. Rinse when you can.",
  glass:   "Bottles & jars go in GLASS. Remove lids where required."
};

const TIPS_BY_ITEM = {
  "Egg carton": "Most egg cartons are paper/card — flatten before recycling.",
  "Light bulb": "Many areas accept (non-LED) bulbs with GLASS; check local rules."
};

const BIN_ORDER = ["paper","plastic","glass","organic"]; // left → right


/* ===========================================================
   ============ 3) STATE VARIABLES ===========================
   =========================================================== */
let remainingItems = [];        // queue for this run (shuffled)
let currentItem = null;         // {name,cat,src}
let currentCategory = "organic";

let y = 0, x = 50;

// Falling speed controls
let baseSpeed      = 0.4;   // very slow start
let speedIncrement = 0.05;   // tiny ramp per correct drop
let maxSpeed       = 0.50;   // cap so it never gets too fast
let speed          = baseSpeed;  // current speed (starts at base)

let score = 0, lives = 3;
let paused = false, playing = false, introDone = false;
let moveStep = 5;
let eduTimer = null;

let endLineIndex = 0;
let loseLineIndex = 0;


/* ===========================================================
   ============ 4) HELPERS ===================================
   =========================================================== */
// Fisher–Yates shuffle (returns a new array)
function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Which bin index is under X% (0..3)
function binIndexFromXPercent(xPercent){
  if (xPercent < 25) return 0;
  if (xPercent < 50) return 1;
  if (xPercent < 75) return 2;
  return 3;
}

// Temporary outline on a bin (correct/wrong)
function flashBin(idx, cls){
  const bins = document.querySelectorAll(".bin");
  const b = bins[idx];
  b.classList.add(cls);
  setTimeout(() => b.classList.remove(cls), 300);
}

// Show the educational bar (bottom) and auto-hide
function showEdu({ ok=false, icon=null, text="" }){
  if (!eduBar) return;
  if (eduTimer) { clearTimeout(eduTimer); eduTimer = null; }
  eduBar.classList.remove("ok","error");
  eduBar.classList.add(ok ? "ok" : "error");

  if (icon) { eduIcon.src = icon; eduIcon.style.display="block"; }
  else      { eduIcon.style.display="none"; }

  eduText.textContent = text;
  eduBar.classList.add("show");
  eduTimer = setTimeout(() => eduBar.classList.remove("show"), ok ? 1200 : 3800);
}

// Hide the educational bar immediately
function hideEdu(){
  if (eduTimer) { clearTimeout(eduTimer); eduTimer = null; }
  if (eduBar)   { eduBar.classList.remove("show","ok","error"); }
}

// Close ALL modals/overlays safely
function closeAllModals(){
  [modalBackdrop, endModal, loseModal, pauseOverlay].forEach(m => {
    if (!m) return;
    if (m.contains(document.activeElement)) document.activeElement.blur();
    m.classList.remove("open");
    m.setAttribute("aria-hidden","true");
  });
  hideEdu();
}


/* ===========================================================
   ============ 5) INTRO DIALOG (story + rules) ==============
   =========================================================== */
const dialogLines = [
  "Hi! I’m the Garbage Goblin. I love playing in garbage and making a big mess!",
  "But I also care about nature… and I need your help to sort all this rubbish properly!",
  "Here are the rules: Items will fall from the sky. Use the ← and → arrows to move them left and right.",
  "Match each item with the correct bin: 🟦 Paper, 🟧 Plastic, 🟩 Glass, 🟫 Organic. Ready?"
];
let currentLine = 0;

function openModal() {
  currentLine = 0;
  modalBackdrop.classList.add("open");
  modalBackdrop.setAttribute("aria-hidden", "false");
  showLine();
}

function showLine() {
  modalText.textContent = dialogLines[currentLine];
  modalNext.textContent = (currentLine === dialogLines.length - 1) ? "Start Game" : "Next";
}

function nextLine() {
  if (currentLine < dialogLines.length - 1) {
    currentLine++;
    showLine();
  } else {
    introDone = true;
    closeModal();
    startGameplay();
  }
}

function closeModal() {
  modalBackdrop.classList.remove("open");
  modalBackdrop.setAttribute("aria-hidden", "true");
  if (document.activeElement) document.activeElement.blur();
  gameScreen.focus();
}


/* ===========================================================
   ============ 6) GAMEPLAY CORE =============================
   =========================================================== */
function startGameplay() {
    speed = baseSpeed;
  hideEdu();
  closeAllModals();

  const hint = document.getElementById("hint");
  if (hint) hint.style.display = "none";

  gameScreen.style.backgroundImage = "url('./assets/sungrass.png')";
  playfield.style.display = "block";
  hud.style.display = "flex";

  score = 0; lives = 3; speed = 1;
  scoreEl.textContent = score;
  livesEl.textContent = lives;

  remainingItems = shuffle(ITEMS);
  playing = true;

  pickNextItem();

  setPaused(false);
  ensureUnpausedUI();
  pauseBtn.style.display = "block";
}

function gameLoop() {
  if (gameScreen.classList.contains("active") && playing && !paused) {
    y += speed;
    fallingItem.style.top = y + "px";
    const maxY = playfield.clientHeight - 100; // keep above bins
    if (y > maxY) handleLanding();
  }
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

function pickNextItem() {
    speed = baseSpeed;
  if (remainingItems.length === 0) {
    endGameWin();
    return;
  }
  currentItem = remainingItems.shift();
  currentCategory = currentItem.cat;

  fallingItem.src = currentItem.src;
  fallingItem.alt = currentItem.name;
  if (itemLabel) itemLabel.textContent = currentItem.name;

  x = [10, 30, 50, 70, 90][Math.floor(Math.random()*5)];
  y = 0;
  fallingItem.style.left = x + "%";
  fallingItem.style.top = y + "px";

  if (leftEl) leftEl.textContent = remainingItems.length;
}

function handleLanding() {
  const idx = binIndexFromXPercent(x);
  const landedCat = BIN_ORDER[idx];
  const baseTip = TIPS_BY_ITEM[currentItem?.name] || TIPS_BY_CAT[currentItem?.cat] || "";

  if (landedCat === currentCategory) {
    // correct
    score += 100;
    scoreEl.textContent = score;
    flashBin(idx, "correct");
    speed = Math.min(speed + speedIncrement, maxSpeed);
    showEdu({
      ok: true,
      icon: currentItem?.src,
      text: `Nice! ${currentItem?.name} → ${currentCategory.toUpperCase()}.`
    });
  } else {
    // wrong
    lives -= 1;
    livesEl.textContent = lives;
    flashBin(idx, "wrong");

    if (lives <= 0) {
      hideEdu();
      endGameLose();
      return;
    }
    showEdu({
      ok: false,
      icon: currentItem?.src,
      text: `Oops! ${currentItem?.name} is ${currentCategory.toUpperCase()}, not ${landedCat.toUpperCase()}. ${baseTip}`
    });
  }

  pickNextItem();
}


/* ===========================================================
   ============ 7) WIN SCREEN ================================
   =========================================================== */
const endLines = [
  "🎉 Congratulations! You helped the Garbage Goblin sort all the rubbish!",
  "Remember to sort rubbish at home too — every small step helps our environment 🌱",
  "♻️ Fun fact: Recycling one aluminum can saves enough energy to run a TV for 3 hours!"
];

function openEndModal() {
  hideEdu();
  pauseBtn.style.display = "none";

  gameScreen.style.backgroundImage = "url('./assets/goblin-win.png')";
  playfield.style.display = "none";
  hud.style.display = "none";

  endLineIndex = 0;
  endModal.classList.add("open");
  endModal.setAttribute("aria-hidden", "false");
  playAgainBtn.hidden = true;
  endNext.hidden = false;
  showEndLine();
}

function showEndLine() {
  endText.textContent = endLines[endLineIndex];
  endNext.textContent = (endLineIndex === endLines.length - 1) ? "Finish" : "Next";
}

function nextEndLine() {
  if (endLineIndex < endLines.length - 1) {
    endLineIndex++;
    showEndLine();
  } else {
    endNext.hidden = true;
    playAgainBtn.hidden = false;
    playAgainBtn.focus();
  }
}

function closeEndModal() {
  endModal.classList.remove("open");
  endModal.setAttribute("aria-hidden", "true");
  pauseBtn.style.display = "none";
}

function endGameWin() {
  playing = false;
  openEndModal();
}


/* ===========================================================
   ============ 8) LOSE SCREEN ===============================
   =========================================================== */
const loseLines = [
  "The Garbage Goblin got overwhelmed by the mess this time!",
  "No worries — even eco-heroes need a second try.",
  "Tip: aim for color matches: blue=paper, orange=plastic, green=glass, brown=organic."
];

function openLoseModal() {
  hideEdu();
  pauseBtn.style.display = "none";

  gameScreen.style.backgroundImage = "url('./assets/goblin-lose.png')";
  playfield.style.display = "none";
  hud.style.display = "none";

  loseLineIndex = 0;
  loseModal.classList.add("open");
  loseModal.setAttribute("aria-hidden", "false");
  playAgainBtnLose.hidden = true;
  loseNext.hidden = false;
  showLoseLine();
}

function showLoseLine() {
  loseText.textContent = loseLines[loseLineIndex];
  loseNext.textContent = (loseLineIndex === loseLines.length - 1) ? "Finish" : "Next";
}

function nextLoseLine() {
  if (loseLineIndex < loseLines.length - 1) {
    loseLineIndex++;
    showLoseLine();
  } else {
    loseNext.hidden = true;
    playAgainBtnLose.hidden = false;
    playAgainBtnLose.focus();
  }
}

function closeLoseModal() {
  loseModal.classList.remove("open");
  loseModal.setAttribute("aria-hidden", "true");
  pauseBtn.style.display = "none";
}

function endGameLose() {
  playing = false;
  openLoseModal();
}


/* ===========================================================
   ============ 9) RESTART / RESET ===========================
   =========================================================== */
function restartGame() {
    speed = baseSpeed;
  hideEdu();
  closeAllModals();
  pauseBtn.style.display = "block";

  score = 0; lives = 3; speed = 1;
  scoreEl.textContent = score;
  livesEl.textContent = lives;

  gameScreen.style.backgroundImage = "url('./assets/sungrass.png')";
  hud.style.display = "flex";
  playfield.style.display = "block";

  remainingItems = shuffle(ITEMS);
  playing = true;
  pickNextItem();

  setPaused(false);
  ensureUnpausedUI();
}


/* ===========================================================
   ============ 10) PAUSE SYSTEM =============================
   =========================================================== */
function setPaused(value){
  paused = value;
  pauseBtn.textContent = paused ? "Resume" : "Pause";

  if (paused) {
    pauseOverlay.classList.add("open");
    pauseOverlay.setAttribute("aria-hidden", "false");
    setTimeout(() => resumeBtn2.focus(), 0);
  } else {
    if (document.activeElement === resumeBtn2) document.activeElement.blur();
    pauseOverlay.classList.remove("open");
    pauseOverlay.setAttribute("aria-hidden", "true");
  }
}

function togglePause(){
  const anyModalOpen = modalBackdrop.classList.contains("open") ||
                       endModal.classList.contains("open") ||
                       loseModal.classList.contains("open");
  if (anyModalOpen || !playing) return;
  setPaused(!paused);
}

function ensureUnpausedUI(){
  paused = false;
  pauseBtn.textContent = "Pause";
  if (document.activeElement === resumeBtn2) document.activeElement.blur();
  pauseOverlay.classList.remove("open");
  pauseOverlay.setAttribute("aria-hidden","true");
}


/* ===========================================================
   ============ 11) EVENT LISTENERS ==========================
   =========================================================== */
// Start → go from menu → house screen
startBtn.addEventListener("click", () => {
  console.log("▶️ Start button clicked");
  menu.classList.remove("active");
  gameScreen.classList.add("active");
  pauseBtn.style.display = "none";
  gameScreen.style.backgroundImage = "url('./assets/goblinhouse.png')";
});

// Keyboard
document.addEventListener("keydown", (e) => {
  // (1) Intro/rules dialog
  if (modalBackdrop.classList.contains("open")) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      nextLine();
    }
    if (e.key === "Escape") closeModal();
    return;
  }

  // (2) Win dialog
  if (endModal.classList.contains("open")) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (!endNext.hidden) nextEndLine();
    }
    return;
  }

  // (3) Lose dialog
  if (loseModal.classList.contains("open")) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (!loseNext.hidden) nextLoseLine();
    }
    return;
  }

  // (4) House screen, before opening dialog
  if (gameScreen.classList.contains("active") && !introDone) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      openModal();
    }
    return;
  }

  // (5) Gameplay
  if (!playing) return;

  if (e.code === "ArrowLeft") {
    x = Math.max(5, x - moveStep);
    fallingItem.style.left = x + "%";
  }
  if (e.code === "ArrowRight") {
    x = Math.min(95, x + moveStep);
    fallingItem.style.left = x + "%";
  }

  // Pause toggle
  const anyModalOpen = modalBackdrop.classList.contains("open") ||
                       endModal.classList.contains("open") ||
                       loseModal.classList.contains("open");
  if (!anyModalOpen && (e.key === "p" || e.key === "P")) {
    e.preventDefault();
    togglePause();
  }
});

// Click handlers
modalNext.addEventListener("click", nextLine);
modalClose.addEventListener("click", closeModal);

pauseBtn.addEventListener("click", togglePause);
resumeBtn2.addEventListener("click", () => setPaused(false));

endNext.addEventListener("click", nextEndLine);
playAgainBtn.addEventListener("click", restartGame);

loseNext.addEventListener("click", nextLoseLine);
playAgainBtnLose.addEventListener("click", restartGame);

// Kick off the animation loop
requestAnimationFrame(gameLoop);
