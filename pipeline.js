/**
 * 쌓아 둔 연산을 순서대로 적용하면서
 *   결과 = L · (기준 그림) · R
 * 이라는 관계를 함께 유지한다. L 과 R 이 곧 n×n 합성행렬이다.
 *
 * 덧셈처럼 곱셈으로 나타낼 수 없는 연산이나
 * 45° 회전처럼 행과 열이 섞이는 변환을 만나면
 * 그 지점의 중간 결과를 새 기준으로 삼고 L, R 을 단위행렬로 되돌린다.
 * 이렇게 하면 위 관계식은 언제나 참이 된다.
 */

import { S } from "./state.js";
import { clone, eye, exch, tpose, scaleM, matmul, invN, fmt } from "./matrix.js";
import { applyLinear, eff2x2, decompose, elemM } from "./transforms.js";
import { OPS } from "./ops.js";

export function runPipeline() {
  const n = S.n;
  const J = exch(n);

  let cur = clone(S.A);
  let alg = { L: eye(n), R: eye(n), t: false, base: "A" };
  let expr = "A";
  const frames = [];
  const legend = [];

  /* 왼쪽 곱: 행을 섞는다 */
  const doLeft = M => { cur = matmul(M, cur); alg.L = matmul(M, alg.L); };
  /* 오른쪽 곱: 열을 섞는다 */
  const doRight = M => { cur = matmul(cur, M); alg.R = matmul(alg.R, M); };
  /* y=x 대칭: cur ← J·curᵀ·J.  (L·B·R) 에 적용하면 (J·Rᵀ)·Bᵀ·(Lᵀ·J) 가 된다 */
  const doFlip = () => {
    cur = matmul(matmul(J, tpose(cur)), J);
    const nl = matmul(J, tpose(alg.R));
    const nr = matmul(tpose(alg.L), J);
    alg.L = nl; alg.R = nr; alg.t = !alg.t;
  };
  /* 지금까지의 결과를 새 기준으로 삼는다 */
  const reset = () => { alg = { L: eye(n), R: eye(n), t: false, base: expr }; };

  S.steps.forEach((st, idx) => {
    let err = null, note = null;
    const no = idx + 1;

    switch (st.type) {

      case "add":
      case "sub": {
        const sg = st.type === "add" ? 1 : -1;
        cur = cur.map((r, i) => r.map((v, j) => v + sg * S.B[i][j]));
        expr = `(${expr} ${sg > 0 ? "+" : "−"} B)`;
        reset();
        note = "덧셈·뺄셈은 곱셈으로 나타낼 수 없어, 합성행렬을 여기서부터 다시 모읍니다.";
        break;
      }

      case "scalar":
        cur = scaleM(cur, st.k);
        alg.L = scaleM(alg.L, st.k);
        expr = `${fmt(st.k)}${expr}`;
        break;

      case "mulR": doRight(S.B); expr = `${expr}B`; break;
      case "mulL": doLeft(S.B);  expr = `B${expr}`; break;

      case "rswap":
      case "rscale":
      case "radd": {
        if (st.i < 1 || st.i > n || st.j < 1 || st.j > n) {
          err = `행 번호는 1부터 ${n} 사이여야 합니다.`;
          break;
        }
        if (st.type !== "rscale" && st.i === st.j) {
          err = "서로 다른 두 행을 골라야 합니다.";
          break;
        }
        doLeft(elemM(st, n));
        expr = `E${no}·${expr}`;
        const desc =
          st.type === "rswap"  ? `R${st.i} ↔ R${st.j}` :
          st.type === "rscale" ? `R${st.i} → ${fmt(st.k)}R${st.i}` :
                                 `R${st.i} → R${st.i} + ${fmt(st.k)}R${st.j}`;
        legend.push(`E${no} : ${desc} 에 해당하는 ${n}×${n} 기본행렬`);
        break;
      }

      case "undo": {
        const iL = invN(alg.L), iR = invN(alg.R);
        if (!iL.inv || !iR.inv) {
          err = "지금까지의 합성행렬에 역행렬이 없어 되돌릴 수 없습니다.";
          break;
        }
        cur = matmul(matmul(iL.inv, cur), iR.inv);
        if (alg.t) cur = tpose(cur);
        // 나눗셈에서 생긴 자잘한 오차를 정리한다
        cur = cur.map(r => r.map(v => (Math.abs(v) < 1e-9 ? 0 : Math.round(v * 1e6) / 1e6)));
        expr = alg.base;
        alg = { L: eye(n), R: eye(n), t: false, base: alg.base };
        note = `L⁻¹ 을 왼쪽에, R⁻¹ 을 오른쪽에 곱해 ${expr} 상태로 정확히 돌아갑니다.`;
        break;
      }

      default: {   // 선형변환
        const T = eff2x2(st);
        if (!T) { err = "행렬식이 0이라 역변환을 만들 수 없습니다."; break; }
        st._T = T;

        const ops = decompose(T, n);
        if (ops[0].k === "map") {
          cur = applyLinear(cur, T);
          expr = `T${no}[${expr}]`;
          reset();
          legend.push(`T${no} : 좌표를 바꾸는 2×2 변환 [ ${fmt(T[0][0])} ${fmt(T[0][1])} ; ${fmt(T[1][0])} ${fmt(T[1][1])} ]`);
          note = `이 변환은 행과 열이 서로 섞이므로 ${n}×${n} 행렬 곱으로 나타낼 수 없습니다. 합성행렬은 여기서부터 다시 모읍니다.`;
        } else {
          const suffix = st.inv ? "의 역변환" : "";
          ops.forEach(o => {
            if (o.k === "flip") {
              doFlip();
              expr = `J·(${expr})ᵀ·J`;
            } else if (o.k === "left") {
              doLeft(o.M);
              expr = `P${no}·${expr}`;
              legend.push(`P${no} : ${OPS[st.type].name}${suffix}의 ${o.why} (${n}×${n}, 왼쪽 곱)`);
            } else if (o.k === "right") {
              doRight(o.M);
              expr = `${expr}·Q${no}`;
              legend.push(`Q${no} : ${OPS[st.type].name}${suffix}의 ${o.why} (${n}×${n}, 오른쪽 곱)`);
            }
          });
        }
      }
    }

    frames.push({
      step: st,
      matrix: cur.map(r => r.slice()),
      err, no, note,
      T: st._T || null,
    });
  });

  return { result: cur, frames, expr, alg, legend };
}
