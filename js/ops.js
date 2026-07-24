/**
 * 학생이 고를 수 있는 연산의 목록과 기본값.
 * lin: 1 은 좌표를 바꾸는 선형변환이라는 뜻 ('역변환 사용' 선택칸이 생긴다).
 */

export const OPS = {
  add:    { name: "행렬의 덧셈" },
  sub:    { name: "행렬의 뺄셈" },
  scalar: { name: "행렬의 실수배" },
  mulR:   { name: "행렬의 곱셈 (오른쪽)" },
  mulL:   { name: "행렬의 곱셈 (왼쪽)" },

  rswap:  { name: "두 행의 교환" },
  rscale: { name: "한 행에 상수배" },
  radd:   { name: "한 행에 다른 행의 상수배 더하기" },

  refX:   { name: "x축 대칭 (상하 반전)", lin: 1 },
  refY:   { name: "y축 대칭 (좌우 반전)", lin: 1 },
  refO:   { name: "원점 대칭", lin: 1 },
  refYX:  { name: "y=x 대칭 (대각선 반전)", lin: 1 },
  scale:  { name: "닮음변환 (확대·축소)", lin: 1 },
  rotate: { name: "회전변환", lin: 1 },
  custom: { name: "직접 입력한 2×2 변환", lin: 1 },

  undo:   { name: "역행렬로 되돌리기" },
};

/** 새 연산 단계를 만든다 */
export function newStep(type) {
  const st = { type };
  if (type === "scalar") st.k = 0.5;
  if (type === "rswap")  { st.i = 1; st.j = 2; }
  if (type === "rscale") { st.i = 1; st.k = 0.5; }
  if (type === "radd")   { st.i = 1; st.j = 2; st.k = 1; }
  if (type === "scale")  st.k = 2;
  if (type === "rotate") st.deg = 90;
  if (type === "custom") st.m = [[1, 0], [0, 1]];
  if (OPS[type].lin) st.inv = false;
  return st;
}
