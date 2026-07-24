/**
 * 제출문과 저장용 데이터를 만든다.
 * 나중에 서버와 DB 가 준비되면 saveToServer 안의 fetch 주석을 살리면 된다.
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

/**
 * 서버 저장 자리.
 * 백엔드가 생기면 아래 주석을 풀고 주소만 바꾸면 된다.
 */
export async function saveToServer(run, endpoint = "/api/submissions") {
  const payload = submission(run);
  // const res = await fetch(endpoint, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload),
  // });
  // if (!res.ok) throw new Error(`저장 실패 (${res.status})`);
  // return res.json();
  console.info("저장할 데이터:", payload);
  return payload;
}
