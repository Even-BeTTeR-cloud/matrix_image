/**
 * 프로그램 전체가 공유하는 상태.
 * 다른 모듈은 이 객체를 직접 읽고 고친 뒤 app.js 의 refresh() 를 부른다.
 */

/** 픽셀 값의 최댓값 (0 ~ 255 명암) */
export const MAXV = 255;

export const S = {
  n: 8,              // 격자 크기 n×n
  A: null,           // 학생이 그린 그림 (n×n)
  B: null,           // 덧셈·곱셈에 쓰는 두 번째 행렬 (n×n)
  steps: [],         // 쌓아 올린 연산 목록

  goal: "",          // STEP 2 — 만들고 싶은 것
  outcome: "",       // STEP 4 — 계산해 보니 나온 것

  showNumbers: false,  // 칸 안에 숫자 표시
  clip: false,         // 0~255 범위로 자르기
  invertRamp: false,   // true 면 0이 검정 (이미지 처리 관례)
  brush: MAXV,         // 붓 값
  showB: false,        // 행렬 B 편집 패널 열림 여부
};
