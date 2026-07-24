/**
 * 숫자를 화면에 보이는 것으로 바꾸는 곳.
 * 값이 0~255 를 벗어나면 가장 큰 값에 맞춰 밝기를 정규화해서 보여 준다.
 */

import { S, MAXV } from "./state.js";
import { fmt, EPS } from "./matrix.js";

const PAPER = "#f4f2ea";
const INK   = "#0d1016";
const PINK  = "#ff4e8a";

/** 두 색을 t(0~1) 만큼 섞는다 */
export function mix(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
  return "#" + pa
    .map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0"))
    .join("");
}

/** 이 행렬을 그릴 때 기준이 되는 최댓값 */
export function scaleOf(M) {
  let mx = 0;
  for (const r of M) for (const v of r) mx = Math.max(mx, Math.abs(v));
  return S.clip ? MAXV : Math.max(MAXV, mx);
}

/** 자르기 설정을 반영한 표시용 값 */
export const shown = v => (S.clip ? Math.min(MAXV, Math.max(0, v)) : v);

/** 잉크 농도 0~1 (0을 검정으로 보기 설정을 반영) */
export function inkOf(v, sc) {
  const t = Math.min(1, Math.abs(v) / sc);
  return S.invertRamp && v >= 0 ? 1 - t : t;
}

export function cellColor(v, sc) {
  v = shown(v);
  if (v < 0) return mix(PAPER, PINK, 0.2 + 0.8 * Math.min(1, Math.abs(v) / sc));
  return mix(PAPER, INK, inkOf(v, sc));
}

/**
 * 픽셀 격자를 그린다.
 * @param {HTMLElement} el     격자가 들어갈 요소
 * @param {number[][]}  M      그릴 행렬
 * @param {boolean}     editable  칠할 수 있는지
 * @param {string|null} key    "A" 또는 "B" — 어느 행렬을 고칠지 표시
 * @param {HTMLElement} capEl  값 범위를 적을 요소
 */
export function renderGrid(el, M, editable, key, capEl) {
  const n = M.length;
  const sc = scaleOf(M);

  el.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  el.style.setProperty("--cellfs", Math.max(7, Math.round(88 / n)));
  el.innerHTML = "";

  const showNum = S.showNumbers && n <= 12;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const d = document.createElement("div");
      const v = M[r][c];
      d.className = "cell" + (inkOf(shown(v), sc) > 0.55 ? " dark" : "");
      d.style.background = cellColor(v, sc);
      if (showNum) d.textContent = fmt(Math.round(shown(v) * 100) / 100);
      if (editable) { d.dataset.r = r; d.dataset.c = c; d.dataset.key = key; }
      el.appendChild(d);
    }
  }

  if (capEl) {
    let mx = 0, mn = 0;
    for (const row of M) for (const v of row) { mx = Math.max(mx, v); mn = Math.min(mn, v); }
    capEl.textContent =
      (mx > MAXV || mn < 0)
        ? (S.clip
            ? `실제 범위 ${fmt(mn)} ~ ${fmt(mx)} · 0~255로 잘라서 표시`
            : `값 범위 ${fmt(mn)} ~ ${fmt(mx)} · 최대 ${fmt(Math.max(MAXV, mx))} 기준으로 밝기를 맞춰 표시`)
        : "";
  }
}

/** 연산 카드에 붙는 작은 미리보기 */
export function drawThumb(cv, M) {
  const n = M.length, px = 8;
  const sc = scaleOf(M);
  cv.width = n * px;
  cv.height = n * px;
  const g = cv.getContext("2d");
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      g.fillStyle = cellColor(M[r][c], sc);
      g.fillRect(c * px, r * px, px, px);
    }
  }
}

/** 행렬을 숫자표로 만든다 */
export function matHTML(M, label) {
  const n = M[0].length;
  const cells = M.map(r => r.map(v => {
    const cls = Math.abs(v) < EPS ? "z" : (v < 0 ? "neg" : "");
    return `<span class="${cls}">${fmt(Math.round(v * 1000) / 1000)}</span>`;
  }).join("")).join("");

  return (label ? `<div class="matlabel">${label}</div>` : "")
    + `<div class="matscroll"><div class="mat" style="grid-template-columns:repeat(${n},auto)">${cells}</div></div>`;
}
