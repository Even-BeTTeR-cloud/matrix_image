/**
 * 행렬 계산 도구. 이 파일은 화면이나 상태를 전혀 모른다.
 */

/** 0 으로 볼 만큼 작은 수의 기준 */
export const EPS = 1e-9;

export const zeros = n => Array.from({ length: n }, () => Array(n).fill(0));
export const clone = M => M.map(r => r.slice());

/** 단위행렬 I */
export const eye = n => {
  const M = zeros(n);
  for (let i = 0; i < n; i++) M[i][i] = 1;
  return M;
};

/** 반대각행렬 J — 곱하면 행(또는 열) 순서가 뒤집힌다 */
export const exch = n => {
  const M = zeros(n);
  for (let i = 0; i < n; i++) M[i][n - 1 - i] = 1;
  return M;
};

/** 전치행렬 */
export const tpose = M => M[0].map((_, j) => M.map(r => r[j]));

/** 실수배 */
export const scaleM = (M, k) => M.map(r => r.map(v => v * k));

/** 단위행렬인지 확인 */
export const isEye = M =>
  M.every((r, i) => r.every((v, j) => Math.abs(v - (i === j ? 1 : 0)) < EPS));

/** 행렬의 곱 P·Q */
export function matmul(P, Q) {
  const n = P.length, m = Q[0].length, K = Q.length;
  const out = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < K; k++) {
      const v = P[i][k];
      if (Math.abs(v) < EPS) continue;
      for (let j = 0; j < m; j++) out[i][j] += v * Q[k][j];
    }
  }
  return out;
}

/**
 * 가우스-조던 소거법으로 역행렬과 행렬식을 함께 구한다.
 * 역행렬이 없으면 { inv: null, det: 0 }.
 */
export function invN(M) {
  const n = M.length;
  const I = eye(n);
  const a = M.map((r, i) => r.concat(I[i]));   // [M | I]
  let det = 1;

  for (let col = 0; col < n; col++) {
    // 부분 피벗팅 — 절댓값이 가장 큰 행을 고른다
    let p = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[p][col])) p = r;
    }
    if (Math.abs(a[p][col]) < 1e-9) return { inv: null, det: 0 };
    if (p !== col) { const t = a[p]; a[p] = a[col]; a[col] = t; det = -det; }

    const pivot = a[col][col];
    det *= pivot;
    for (let j = 0; j < 2 * n; j++) a[col][j] /= pivot;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (Math.abs(f) < EPS) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j];
    }
  }
  return {
    inv: a.map(r => r.slice(n).map(v => (Math.abs(v) < 1e-10 ? 0 : v))),
    det,
  };
}

/* ── 2×2 전용 ── */
export const det2 = m => m[0][0] * m[1][1] - m[0][1] * m[1][0];
export const inv2 = m => {
  const d = det2(m);
  return [[m[1][1] / d, -m[0][1] / d], [-m[1][0] / d, m[0][0] / d]];
};

/** 화면에 보여 줄 숫자 문자열 (소수 둘째 자리까지) */
export function fmt(v) {
  if (Math.abs(v) < 1e-9) return "0";
  return String(Math.round(v * 100) / 100);
}
