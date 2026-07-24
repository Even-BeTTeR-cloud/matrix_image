/**
 * 프로그램의 시작점.
 * 상태를 고치는 일은 여기서 하고, 계산과 그리기는 다른 모듈에 맡긴다.
 */

import { S, MAXV } from "./state.js";
import { zeros, clone, eye, exch, invN, fmt, EPS } from "./matrix.js";
import { newStep } from "./ops.js";
import { runPipeline } from "./pipeline.js";
import { renderGrid, matHTML, cellColor, inkOf } from "./render.js";
import { renderStrip, updateStrip } from "./strip.js";
import { EXAMPLES } from "./examples.js";
import { sentenceText, submission, downloadJSON } from "./submit.js";

const $ = id => document.getElementById(id);

/** 가장 최근 계산 결과 — 제출문과 JSON 저장에 쓴다 */
let lastRun = null;

/* ══════════════ 화면 갱신 ══════════════ */

/**
 * @param {boolean} lite  true 면 연산 카드를 다시 만들지 않고 내용만 고친다
 *                        (입력 중에 포커스가 끊기는 것을 막는다)
 */
function refresh(lite) {
  const run = runPipeline();
  const n = S.n;

  renderGrid($("gridA"), S.A, true, "A", $("capA"));
  renderGrid($("gridB"), S.B, true, "B", $("capB"));
  renderGrid($("gridR"), run.result, false, null, $("capR"));

  if (lite && document.querySelectorAll("#strip .frame").length === run.frames.length) {
    updateStrip(run);
  } else {
    renderStrip(run);
  }

  $("exprBox").textContent = run.expr;
  $("symbolNote").innerHTML = run.legend.length
    ? run.legend.map(s => `· ${s}`).join("<br>")
    : "A는 내가 그린 그림, B는 두 번째 그림입니다.";

  /* 합성행렬 */
  const { L, R, t, base } = run.alg;
  const baseSym = t ? `${base}ᵀ` : base;
  $("compSize").textContent = `${n}×${n}`;
  $("compFormula").textContent = `결과 = L · ${baseSym} · R`;
  $("compMats").innerHTML =
    matHTML(L, "L — 왼쪽에 곱하는 행렬 (행을 섞습니다)") +
    matHTML(R, "R — 오른쪽에 곱하는 행렬 (열을 섞습니다)");

  const dL = invN(L), dR = invN(R);
  const notes = [
    `det L = ${fmt(Math.round(dL.det * 1e6) / 1e6)} · det R = ${fmt(Math.round(dR.det * 1e6) / 1e6)}`,
    (dL.inv && dR.inv)
      ? "두 행렬 모두 역행렬이 있으므로 되돌리기가 가능합니다."
      : "역행렬이 없는 행렬이 있어, 사라진 정보는 되돌릴 수 없습니다.",
  ];
  if (base !== "A") notes.push(`기준이 되는 ${baseSym} 은 앞 단계까지 계산한 ${base} 입니다.`);
  $("compNote").textContent = notes.join(" ");

  $("resultMat").innerHTML = matHTML(run.result);

  renderSentence(run);
  lastRun = run;
}

function renderSentence(run) {
  const g = S.goal.trim(), o = S.outcome.trim();
  $("sentence").innerHTML =
    `<span class="blank ${g ? "" : "ph"}">${g || "만들고 싶었던 그림"}</span>를 만들고 싶었다. 그래서 ` +
    `<span class="blank expr">${run.expr}</span>를 계산했더니 ` +
    `<span class="blank ${o ? "" : "ph"}">${o || "나온 결과"}</span>가 나왔다.`;
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1600);
}

/* ══════════════ 그림 칠하기 ══════════════ */

let painting = false, paintVal = 0;

function bindPaint(el) {
  el.addEventListener("pointerdown", e => {
    const cell = e.target.closest(".cell");
    if (!cell) return;
    el.setPointerCapture(e.pointerId);
    const M = cell.dataset.key === "A" ? S.A : S.B;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    // 같은 값을 다시 누르면 지운다
    paintVal = Math.abs(M[r][c] - S.brush) < EPS ? 0 : S.brush;
    M[r][c] = paintVal;
    painting = true;
    refresh();
  });

  el.addEventListener("pointermove", e => {
    if (!painting) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const cell = target && target.closest && target.closest(".cell");
    if (!cell || !cell.dataset.key) return;
    const M = cell.dataset.key === "A" ? S.A : S.B;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    if (M[r][c] !== paintVal) { M[r][c] = paintVal; refresh(); }
  });
}
window.addEventListener("pointerup", () => { painting = false; });

/* ══════════════ 붓 ══════════════ */

const SWATCHES = [0, 1, 64, 128, 192, 255];

function renderSwatches() {
  $("swatches").innerHTML = SWATCHES.map(v => {
    const fg = inkOf(v, MAXV) > 0.55 ? "#e7e9ef" : "#333";
    return `<div class="swatch ${v === S.brush ? "on" : ""}" data-v="${v}"
              style="background:${cellColor(v, MAXV)};color:${fg}">${v}</div>`;
  }).join("");
  $("brushChip").style.background = cellColor(S.brush, MAXV);
}

function setBrush(v) {
  S.brush = Math.max(0, Math.min(MAXV, Math.round(v)));
  $("brushRange").value = S.brush;
  $("brushNum").value = S.brush;
  renderSwatches();
}

/* ══════════════ 격자 크기 · 예시 ══════════════ */

function resize(n) {
  const old = S.n, A = S.A, B = S.B;
  S.n = n;
  S.A = zeros(n);
  S.B = zeros(n);
  const m = Math.min(old, n);
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < m; c++) { S.A[r][c] = A[r][c]; S.B[r][c] = B[r][c]; }
  }
  refresh();
}

let exIdx = 0;
function loadExample() {
  S.A = EXAMPLES[exIdx++ % EXAMPLES.length](S.n);
  refresh();
}

/* ══════════════ 이벤트 연결 ══════════════ */

function bindEvents() {
  /* 붓 */
  $("swatches").addEventListener("click", e => {
    const s = e.target.closest(".swatch");
    if (s) setBrush(+s.dataset.v);
  });
  $("brushRange").addEventListener("input", e => setBrush(+e.target.value));
  $("brushNum").addEventListener("input", e => setBrush(+e.target.value || 0));

  /* 머리말 */
  $("sizeSel").addEventListener("change", e => resize(+e.target.value));
  $("btnNumbers").addEventListener("click", e => {
    S.showNumbers = !S.showNumbers;
    e.target.classList.toggle("on", S.showNumbers);
    refresh();
  });
  $("btnRamp").addEventListener("click", e => {
    S.invertRamp = !S.invertRamp;
    e.target.classList.toggle("on", S.invertRamp);
    e.target.textContent = S.invertRamp ? "255를 검정으로" : "0을 검정으로";
    renderSwatches();
    refresh();
  });
  $("btnResetAll").addEventListener("click", () => {
    S.A = zeros(S.n); S.B = zeros(S.n); S.steps = [];
    S.goal = ""; S.outcome = "";
    $("goalInput").value = ""; $("goalMirror").value = ""; $("outcomeInput").value = "";
    refresh();
  });

  /* 그림 도구 */
  $("btnClearA").addEventListener("click", () => { S.A = zeros(S.n); refresh(); });
  $("btnClearB").addEventListener("click", () => { S.B = zeros(S.n); refresh(); });
  $("btnCopyAB").addEventListener("click", () => { S.B = clone(S.A); refresh(); });
  $("btnIdentityB").addEventListener("click", () => { S.B = eye(S.n); refresh(); });
  $("btnExchangeB").addEventListener("click", () => { S.B = exch(S.n); refresh(); });
  $("btnExample").addEventListener("click", loadExample);
  $("btnToggleB").addEventListener("click", e => {
    S.showB = !S.showB;
    $("bwrap").hidden = !S.showB;
    e.target.textContent = S.showB ? "행렬 B 닫기" : "행렬 B 열기";
    refresh();
  });

  /* 결과 */
  $("btnClip").addEventListener("click", e => {
    S.clip = !S.clip;
    e.target.classList.toggle("on", S.clip);
    refresh();
  });
  $("btnResultToA").addEventListener("click", () => {
    S.A = clone(lastRun.result);
    S.steps = [];
    refresh();
    toast("결과를 A로 가져왔습니다");
  });

  /* 연산 추가 */
  document.querySelectorAll("[data-add]").forEach(b => {
    b.addEventListener("click", () => {
      const t = b.dataset.add;
      S.steps.push(newStep(t));
      if (["add", "sub", "mulR", "mulL"].includes(t) && !S.showB) $("btnToggleB").click();
      refresh();
    });
  });

  /* 연산 카드 — 삭제·순서 바꾸기 */
  const strip = $("strip");
  strip.addEventListener("click", e => {
    const card = e.target.closest(".frame");
    if (!card) return;
    const idx = +card.dataset.idx;

    if (e.target.dataset.del) {
      S.steps.splice(idx, 1);
      refresh();
    } else if (e.target.dataset.move) {
      const j = idx + Number(e.target.dataset.move);
      if (j < 0 || j >= S.steps.length) return;
      [S.steps[idx], S.steps[j]] = [S.steps[j], S.steps[idx]];
      refresh();
    } else if (e.target.dataset.openb && !S.showB) {
      $("btnToggleB").click();
    }
  });

  /* 연산 카드 — 값 입력 */
  strip.addEventListener("input", e => {
    const card = e.target.closest(".frame");
    if (!card) return;
    const st = S.steps[+card.dataset.idx];
    const f = e.target.dataset.f;
    if (!f) return;

    if (f === "inv") {
      st.inv = e.target.checked;
    } else if ("abcd".includes(f) && st.type === "custom") {
      const i = "abcd".indexOf(f);
      st.m[i >> 1][i & 1] = parseFloat(e.target.value) || 0;
    } else {
      st[f] = parseFloat(e.target.value) || 0;
      // 회전각처럼 슬라이더와 숫자칸이 같은 값을 가리키는 경우 서로 맞춘다
      card.querySelectorAll(`[data-f="${f}"]`).forEach(el => {
        if (el !== e.target) el.value = e.target.value;
      });
    }
    refresh(true);
  });

  /* 목표 · 결과 글상자 */
  const goalInput = $("goalInput"), goalMirror = $("goalMirror"), outcomeInput = $("outcomeInput");
  goalInput.addEventListener("input", e => {
    S.goal = e.target.value; goalMirror.value = e.target.value; refresh(true);
  });
  goalMirror.addEventListener("input", e => {
    S.goal = e.target.value; goalInput.value = e.target.value; refresh(true);
  });
  outcomeInput.addEventListener("input", e => {
    S.outcome = e.target.value; refresh(true);
  });

  /* 제출 */
  $("btnCopy").addEventListener("click", async () => {
    const text = sentenceText(lastRun);
    try {
      await navigator.clipboard.writeText(text);
      toast("제출문을 복사했습니다");
    } catch {
      window.prompt("아래 문장을 복사하세요", text);
    }
  });
  $("btnSaveJson").addEventListener("click", () => {
    downloadJSON(lastRun);
    toast("JSON 파일로 저장했습니다");
  });
}

/* ══════════════ 시작 ══════════════ */

S.A = zeros(S.n);
S.B = zeros(S.n);
bindPaint($("gridA"));
bindPaint($("gridB"));
bindEvents();
setBrush(MAXV);
loadExample();

/** 콘솔이나 다른 스크립트에서 현재 제출 데이터를 꺼내 쓰는 자리 */
window.PixelMatrixLab = {
  getSubmission: () => submission(lastRun),
  getState: () => S,
};
