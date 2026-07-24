/**
 * 시작할 때 쓸 예시 그림들.
 * 앞의 셋은 0 또는 255, 뒤의 둘은 중간 명암이 있어
 * 회전이나 축소의 효과를 살펴보기 좋다.
 */

import { zeros } from "./matrix.js";
import { MAXV } from "./state.js";

const PATTERNS = [
  // 하트
  ["00000000", "00110110", "01111111", "01111111",
   "00111110", "00011100", "00001000", "00000000"],
  // 위쪽 화살표
  ["00011000", "00111100", "01111110", "11011011",
   "00011000", "00011000", "00011000", "00000000"],
  // 얼굴
  ["00111100", "01000010", "10100101", "10000001",
   "10100101", "10011001", "01000010", "00111100"],
];

/** 8×8 무늬를 n×n 격자 가운데에 놓는다 */
function fromPattern(p, n) {
  const M = zeros(n);
  const off = Math.max(0, Math.floor((n - 8) / 2));
  const m = Math.min(8, n);
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < m; c++) M[r + off][c + off] = p[r][c] === "1" ? MAXV : 0;
  }
  return M;
}

export const EXAMPLES = [
  n => fromPattern(PATTERNS[0], n),
  n => fromPattern(PATTERNS[1], n),
  n => fromPattern(PATTERNS[2], n),

  // 가로 그라데이션
  n => {
    const M = zeros(n);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) M[r][c] = Math.round(MAXV * c / (n - 1));
    }
    return M;
  },

  // 가운데가 밝은 원
  n => {
    const M = zeros(n);
    const ct = (n - 1) / 2;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const d = Math.hypot(r - ct, c - ct) / (n / 2);
        M[r][c] = Math.max(0, Math.round(MAXV * (1 - d)));
      }
    }
    return M;
  },
];
