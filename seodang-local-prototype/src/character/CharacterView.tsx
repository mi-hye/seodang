import type { CharacterState } from "../game/types";
import { CssDogCharacter } from "./CssDogCharacter";
import "./character.css";
export interface CharacterViewProps {
  state: CharacterState;
  reactionId: number;
  reducedMotion: boolean;
  onInteract?: () => void;
}
export function CharacterView(props: CharacterViewProps) {
  const Wrapper = props.onInteract ? "button" : "div";
  return (
    <Wrapper
      data-reaction-id={props.reactionId}
      data-state={props.state}
      className={`dog-button ${props.reducedMotion ? "reduce" : ""}`}
      aria-label={props.onInteract ? "서당개와 인사하기" : undefined}
      onClick={props.onInteract}
    >
      <CssDogCharacter key={props.reactionId} state={props.state} />
    </Wrapper>
  );
}
