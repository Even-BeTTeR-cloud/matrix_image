/**
 * 쌓아 올린 연산을 카드로 보여 준다.
 *
 * 카드를 다시 만드는 renderStrip 과
 * 이미 있는 카드의 그림·설명만 고치는 updateStrip 을 나눠 두었다.
 * 슬라이더를 끌거나 숫자를 입력하는 중에 카드를 새로 만들면
 * 입력칸이 사라져 버리기 때문이다.
 */

import { S } from "./state.js";
import { OPS } from "./ops.js";
import { fmt } from "./matrix.js";
import { drawThumb } from "./render.js";

function num(f, val, step, min, max, w) {
  return `<input type="number" data-f="${f}" value="${val}" step="${step}"`
    + (min !== undefined ? ` min="${min}"` : "")
    + (max !== undefined ? ` max="${max}"` : "")
    + (w ? ` style="width:${w}px"` : "") + ">";
}

const invBox = st =>
  `<label class="field"><input type="checkbox" data-f="inv" ${st.inv ? "checked" : ""}> 역변환 사용</label>`;

function paramsHTML(st) {
  const n = S.n;
  switch (st.type) {
    case "scalar":
      return `<label class="field">k ${num("k", st.k, 0.1)}</label>`;

    case "rswap":
      return `<label class="field">R ${num("i", st.i, 1, 1, n, 52)}</label>`
           + `<span class="hint inline">↔</span>`
           + `<label class="field">R ${num("j", st.j, 1, 1, n, 52)}</label>`;

    case "rscale":
      return `<label class="field">R ${num("i", st.i, 1, 1, n, 52)}</label>`
           + `<label class="field">× k ${num("k", st.k, 0.1)}</label>`;

    case "radd":
      return `<label class="field">R ${num("i", st.i, 1, 1, n, 52)} 에</label>`
           + `<label class="field">R ${num("j", st.j, 1, 1, n, 52)} 의</label>`
           + `<label class="field">${num("k", st.k, 0.1)} 배를 더하기</label>`;

    case "scale":
      return `<label class="field">k ${num("k", st.k, 0.5)}</label>` + invBox(st);

    case "rotate":
      return `<label class="field">θ <input type="range" data-f="deg" min="-180" max="180" step="15" value="${st.deg}"></label>`
           + `<label class="field">${num("deg", st.deg, 15, -360, 360, 68)}°</label>` + invBox(st);

    case "custom":
      return `<span class="hint inline">[a b ; c d]</span>`
           + ["a", "b", "c", "d"].map((f, i) =>
               `<label class="field">${f} ${num(f, st.m[i >> 1][i & 1], 0.5, undefined, undefined, 56)}</label>`
             ).join("")
           + invBox(st);

    case "undo":
      return `<span class="hint inline">쌓아 둔 왼쪽 행렬 L과 오른쪽 행렬 R의 역행렬을 곱합니다.</span>`;

    default:   // 덧셈·뺄셈·곱셈
      return `<span class="hint inline">행렬 B를 사용합니다. <button class="chip" data-openb="1">B 편집</button></span>`;
  }
}

/** 카드를 처음부터 다시 만든다 */
export function renderStrip(run) {
  const strip = document.getElementById("strip");

  if (!S.steps.length) {
    strip.innerHTML =
      `<div class="empty">아직 연산이 없습니다. 위에서 하나 골라 보세요.<br>결과 칸에는 원래 그림 A가 그대로 보입니다.</div>`;
    return;
  }

  strip.innerHTML = "";
  run.frames.forEach((f, idx) => {
    if (idx) {
      const line = document.createElement("div");
      line.className = "connector";
      strip.appendChild(line);
    }

    const card = document.createElement("div");
    card.className = "frame";
    card.dataset.idx = idx;

    const left = document.createElement("div");
    const cv = document.createElement("canvas");
    cv.className = "thumb";
    const cap = document.createElement("div");
    cap.className = "thumb-cap";
    cap.textContent = `${idx + 1}단계 결과`;
    left.append(cv, cap);

    const body = document.createElement("div");
    body.className = "frame-body";
    body.innerHTML =
      `<div class="frame-title">
         <span class="idx">${idx + 1}</span>
         <span class="opname">${OPS[f.step.type].name}</span>
         <span class="tag" data-role="t" hidden></span>
       </div>
       <div class="params">${paramsHTML(f.step)}</div>
       <div class="frame-note" data-role="note" hidden></div>
       <div class="warn" data-role="err" hidden></div>`;

    const acts = document.createElement("div");
    acts.className = "frame-actions";
    acts.innerHTML =
      `<button class="icobtn" data-move="-1" title="위로">↑</button>
       <button class="icobtn" data-move="1" title="아래로">↓</button>
       <button class="icobtn" data-del="1" title="삭제">×</button>`;

    card.append(left, body, acts);
    strip.appendChild(card);
  });

  updateStrip(run);
}

/** 입력칸은 건드리지 않고 그림·설명만 갱신한다 */
export function updateStrip(run) {
  document.querySelectorAll("#strip .frame").forEach((card, idx) => {
    const f = run.frames[idx];
    if (!f) return;

    drawThumb(card.querySelector("canvas"), f.matrix);

    const tEl = card.querySelector('[data-role="t"]');
    if (f.T) {
      tEl.textContent = `좌표변환 2×2 = [ ${fmt(f.T[0][0])} ${fmt(f.T[0][1])} ; ${fmt(f.T[1][0])} ${fmt(f.T[1][1])} ]`;
      tEl.hidden = false;
    } else tEl.hidden = true;

    const nEl = card.querySelector('[data-role="note"]');
    if (f.note) { nEl.textContent = f.note; nEl.hidden = false; } else nEl.hidden = true;

    const eEl = card.querySelector('[data-role="err"]');
    if (f.err) { eEl.textContent = f.err; eEl.hidden = false; } else eEl.hidden = true;

    card.classList.toggle("bad", !!f.err);
  });
}
