export const onboardingSteps = [
  {
    eyebrow: "처음 만나는 서당",
    title: "안녕, 나는 서당개야.",
    description:
      "한국어와 일본어 사이를 함께 걸어 줄게.\n작은 이야기를 풀면서 한 문장씩 만나 보자.",
  },
  {
    eyebrow: "01 · 사물 살펴보기",
    title: "이야기는 손끝에서 시작돼.",
    description:
      "궁금한 사물을 누르면 단서를 발견할 수 있어.\n아래 책을 한 번 눌러 볼래?",
  },
  {
    eyebrow: "02 · 뜻을 읽고 다음으로",
    title: "한 문장이 다음 길을 알려 줘.",
    description:
      "일본어를 처음 만나도 괜찮아.\n읽기와 도움말을 보면서 함께 골라 보자.",
  },
] as const;
export const onboardingExample = {
  original: "こんにちは。",
  reading: "こんにちは。",
  prompt: "어떤 인사일까?",
  choices: [
    { id: "bye", text: "안녕히 가세요" },
    { id: "hello", text: "안녕하세요" },
  ],
  answer: "hello",
};
export type OnboardingState = {
  step: number;
  discovered: boolean;
  feedback: "correct" | "wrong" | null;
};
export type OnboardingAction =
  | { type: "next" | "back" | "discover" | "retry" }
  | { type: "answer"; choice: string };
export const initialOnboarding: OnboardingState = {
  step: 0,
  discovered: false,
  feedback: null,
};
export function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState {
  if (
    action.type === "next" &&
    state.step < 2 &&
    (state.step === 0 || state.discovered)
  )
    return { ...state, step: state.step + 1 };
  if (action.type === "back" && state.step > 0)
    return { ...state, step: state.step - 1 };
  if (action.type === "discover" && state.step === 1)
    return { ...state, discovered: true };
  if (
    action.type === "answer" &&
    state.step === 2 &&
    !state.feedback &&
    onboardingExample.choices.some((c) => c.id === action.choice)
  )
    return {
      ...state,
      feedback:
        action.choice === onboardingExample.answer ? "correct" : "wrong",
    };
  if (action.type === "retry" && state.feedback === "wrong")
    return { ...state, feedback: null };
  return state;
}
