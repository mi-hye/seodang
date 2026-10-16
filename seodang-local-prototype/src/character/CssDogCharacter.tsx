import { useId } from "react";
import type { CharacterState } from "../game/types";
import sprite from "./assets/seodang-dog.json";
export function CssDogCharacter({ state }: { state: CharacterState }) {
  const title = useId();
  const layer = (
    name: "body" | "head" | "leftEye" | "rightEye" | "mouth" | "tail",
  ) =>
    sprite[name].map((path) => (
      <path key={path.color} d={path.d} fill={path.color} />
    ));
  return (
    <svg
      className={`dog pixel-dog ${state}`}
      viewBox="0 0 24 26"
      aria-labelledby={title}
      role="img"
      shapeRendering="crispEdges"
    >
      <title id={title}>서당 앱의 픽셀 서당개</title>
      <path d="M5 24h14v1H5z" fill="#675641" opacity=".13" />
      <g className="dog-whole">
        <g className="tail">{layer("tail")}</g>
        <g className="body">{layer("body")}</g>
        <g className="head">
          {layer("head")}
          <g className="eyes left-eye">{layer("leftEye")}</g>
          <g className="eyes right-eye">{layer("rightEye")}</g>
          <g className="mouth">{layer("mouth")}</g>
        </g>
      </g>
      {state === "surprised" && (
        <path d="M21 3h1v3h-1zm0 4h1v1h-1z" fill="#7b623f" />
      )}
      {state === "happy" && (
        <g fill="#b19450">
          <path d="M1 6h1V5h1v1h1v1H3v1H2V7H1zM21 10h1V9h1v1h1v1h-1v1h-1v-1h-1z" />
        </g>
      )}
    </svg>
  );
}
