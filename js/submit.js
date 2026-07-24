/**
 * 제출문과 저장용 데이터를 만든다.
 * 서버가 없으므로 학생은 문장을 복사하거나 JSON 파일로 내려받아 제출한다.
 */

import { S, MAXV } from "./state.js";

/** 제출 형식 문장 */
export function sentenceText(run) {
  const blank = "                    ";
  return `(${S.goal.trim() || blank})를 만들고 싶었다. `
       + `그래서 (${run.expr})를 계산했더니 `
       + `(${S.outcome.trim() || blank})가 나왔다.`;
}

/** 저장·전송에 쓸 데이터 한 덩어리 */
export function submission(run) {
  const clipM = M => M.map(r => r.map(v => Math.min(MAXV, Math.max(0, Math.round(v)))));

  return {
    createdAt: new Date().toISOString(),
    n: S.n,
    valueRange: [0, MAXV],

    matrixA: S.A,
    matrixB: S.B,
    steps: S.steps.map(s => { const c = { ...s }; delete c._T; return c; }),

    expression: run.expr,
    composite: {
      left: run.alg.L,
      right: run.alg.R,
      transposed: run.alg.t,
      base: run.alg.base,
    },

    result: run.result,
    resultClipped: clipM(run.result),

    goal: S.goal,
    outcome: S.outcome,
    sentence: sentenceText(run),
  };
}

/** 파일로 내려받기 */
export function downloadJSON(run) {
  const blob = new Blob([JSON.stringify(submission(run), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pixel-matrix-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
