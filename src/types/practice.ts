export type CanvasPoint = {
  x: number;
  y: number;
};

export type CanvasSize = {
  width: number;
  height: number;
};

export type InputStroke = {
  id: string;
  points: CanvasPoint[];
};

export type Direction =
  | "left_to_right"
  | "right_to_left"
  | "top_to_bottom"
  | "bottom_to_top"
  | "diagonal_down_right"
  | "diagonal_down_left"
  | "diagonal_up_right"
  | "diagonal_up_left";

export type ReferenceStroke = {
  order: number;
  start: CanvasPoint;
  end: CanvasPoint;
  direction: Direction;
  note?: string;
};

export type KanjiVgStroke = ReferenceStroke & {
  id: string;
  type:
    | "dot"
    | "vertical"
    | "horizontal"
    | "hook"
    | "sweep_left"
    | "sweep_right"
    | "turn"
    | "curve";
  rawType?: string;
  path: string;
};

export type KanjiVgCharacter = {
  characterId: string;
  literal: string;
  source: "KanjiVG" | "AnimCJK";
  license: string;
  viewBox: {
    width: number;
    height: number;
  };
  strokes: KanjiVgStroke[];
};

export type PracticeEvaluation = {
  score: number;
  passed: boolean;
  drawnStrokes: number;
  expectedStrokes: number;
  summary: string;
  feedback: string[];
};
