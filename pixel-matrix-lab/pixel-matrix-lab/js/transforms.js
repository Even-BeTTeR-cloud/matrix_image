/**
 * 선형변환을 그림 행렬에 곱할 수 있는 n×n 행렬로 바꾸는 곳.
 *
 * 좌표 약속: 격자의 한가운데를 원점으로 두고
 *   x = 열 − 중심,  y = 중심 − 행
 * 이라 두면 행 번호는 아래로, y 는 위로 커진다.
 */

import { zeros, eye, tpose, isEye, det2, inv2 } from "./matrix.js";

/**
 * 축척 선택행렬 S : (S·A)[r] = A[round(c + (r−c)/s)]
 * 배율 s 로 늘이거나 줄일 때 쓰는 0·1 행렬이다.
 */
export function selM(n, s) {
  const c = (n - 1) / 2;
  const S = zeros(n);
  for (let r = 0; r < n; r++) {
    const k = Math.round(c + (r - c) / s);
    if (k >= 0 && k < n) S[r][k] = 1;
  }
  return S;
}

/**
 * 행과 열이 섞이는 변환(예: 45° 회전) 전용 계산.
 * 결과 칸마다 원본의 어느 칸에서 왔는지 거꾸로 찾아 값을 가져온다.
 * 이렇게 해야 그림에 구멍이 생기지 않는다.
 */
export function applyLinear(M, T) {
  const n = M.length, c = (n - 1) / 2;
  const out = zeros(n);
  const d = det2(T);

  if (Math.abs(d) > 1e-9) {
    const Ti = inv2(T);
    for (let r = 0; r < n; r++) {
      for (let q = 0; q < n; q++) {
        const x = q - c, y = c - r;
        const xs = Ti[0][0] * x + Ti[0][1] * y;
        const ys = Ti[1][0] * x + Ti[1][1] * y;
        const rs = Math.round(c - ys), qs = Math.round(xs + c);
        if (rs >= 0 && rs < n && qs >= 0 && qs < n) out[r][q] = M[rs][qs];
      }
    }
  } else {
    // 행렬식이 0 — 그림이 눌려 사라지므로 원본에서 앞으로 보낸다
    for (let r = 0; r < n; r++) {
      for (let q = 0; q < n; q++) {
        const v = M[r][q];
        if (Math.abs(v) < 1e-9) continue;
        const x = q - c, y = c - r;
        const xd = T[0][0] * x + T[0][1] * y;
        const yd = T[1][0] * x + T[1][1] * y;
        const rd = Math.round(c - yd), qd = Math.round(xd + c);
        if (rd >= 0 && rd < n && qd >= 0 && qd < n &&
            Math.abs(v) > Math.abs(out[rd][qd])) out[rd][qd] = v;
      }
    }
  }
  return out;
}

/** 연산 종류에 대응하는 2×2 좌표변환 행렬 */
export function base2x2(st) {
  switch (st.type) {
    case "refX":  return [[1, 0], [0, -1]];
    case "refY":  return [[-1, 0], [0, 1]];
    case "refO":  return [[-1, 0], [0, -1]];
    case "refYX": return [[0, 1], [1, 0]];
    case "scale": return [[st.k, 0], [0, st.k]];
    case "rotate": {
      const t = st.deg * Math.PI / 180;
      // 90°의 배수에서 생기는 미세한 오차를 없앤다
      const c = Math.round(Math.cos(t) * 1e12) / 1e12;
      const s = Math.round(Math.sin(t) * 1e12) / 1e12;
      return [[c, -s], [s, c]];
    }
    case "custom": return st.m.map(r => r.slice());
    default: return null;
  }
}

/** '역변환 사용'을 반영한 2×2 행렬. 역행렬이 없으면 null */
export function eff2x2(st) {
  const M = base2x2(st);
  if (!M) return null;
  if (st.inv) {
    if (Math.abs(det2(M)) < 1e-9) return null;
    return inv2(M);
  }
  return M;
}

/**
 * 2×2 좌표변환을 n×n 좌·우 곱으로 분해한다.
 *
 *   { k:"left",  M }  →  결과 = M · 그림      (행을 섞는다)
 *   { k:"right", M }  →  결과 = 그림 · M      (열을 섞는다)
 *   { k:"flip"     }  →  결과 = J · 그림ᵀ · J (y=x 대칭)
 *   { k:"map",   T }  →  n×n 곱으로는 표현할 수 없음. 좌표 계산으로 처리
 *
 * 대각 성분만 있으면 행·열 방향 축척으로,
 * 반대각 성분만 있으면 y=x 대칭 뒤 축척으로 나눌 수 있다.
 * 그 밖의 경우(예: 45° 회전)는 행과 열이 섞여 분해가 불가능하다.
 */
export function decompose(T, n) {
  const a = T[0][0], b = T[0][1], c = T[1][0], d = T[1][1];
  const z = v => Math.abs(v) < 1e-9;

  if (z(b) && z(c)) {
    if (z(a) || z(d)) return [{ k: "map", T }];
    const ops = [];
    const Srow = selM(n, d), Scol = selM(n, a);
    if (!isEye(Srow)) ops.push({ k: "left",  M: Srow,         why: "세로(행) 방향 변환" });
    if (!isEye(Scol)) ops.push({ k: "right", M: tpose(Scol),  why: "가로(열) 방향 변환" });
    return ops.length ? ops : [{ k: "id" }];
  }

  if (z(a) && z(d)) {
    if (z(b) || z(c)) return [{ k: "map", T }];
    const ops = [{ k: "flip" }];
    const Srow = selM(n, c), Scol = selM(n, b);
    if (!isEye(Srow)) ops.push({ k: "left",  M: Srow,        why: "세로(행) 방향 변환" });
    if (!isEye(Scol)) ops.push({ k: "right", M: tpose(Scol), why: "가로(열) 방향 변환" });
    return ops;
  }

  return [{ k: "map", T }];
}

/** 기본행연산에 대응하는 n×n 기본행렬 */
export function elemM(st, n) {
  const E = eye(n);
  const i = st.i - 1, j = st.j - 1;
  if (st.type === "rswap")  { E[i][i] = 0; E[j][j] = 0; E[i][j] = 1; E[j][i] = 1; }
  if (st.type === "rscale") { E[i][i] = st.k; }
  if (st.type === "radd")   { E[i][j] = st.k; }
  return E;
}
