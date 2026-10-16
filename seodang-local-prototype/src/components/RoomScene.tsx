import type { CharacterState, Place } from "../game/types";
import { CharacterView } from "../character/CharacterView";
interface Props {
  active: Place | null;
  boxOpen: boolean;
  drawerOpen: boolean;
  hasKey: boolean;
  enabled: boolean;
  state: CharacterState;
  reactionId: number;
  reducedMotion: boolean;
  onInspect: (p: Place) => void;
  onDog: () => void;
}
export function RoomScene(p: Props) {
  return (
    <div className="room" aria-label="작은 서재">
      <svg className="room-art" viewBox="0 0 390 350" aria-hidden="true">
        <defs>
          <linearGradient id="wall" x2="0" y2="1">
            <stop stopColor="#f4eddb" />
            <stop offset="1" stopColor="#e9dfc5" />
          </linearGradient>
          <linearGradient id="floor" x2="0" y2="1">
            <stop stopColor="#c5a77f" />
            <stop offset="1" stopColor="#ddc5a1" />
          </linearGradient>
          <linearGradient id="glass" x2="0" y2="1">
            <stop stopColor="#adc8ba" />
            <stop offset="1" stopColor="#e1e7c9" />
          </linearGradient>
          <pattern
            id="grain"
            width="40"
            height="45"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 44H40 M20 0V44"
              stroke="#bda07c"
              strokeWidth="1"
              opacity=".5"
            />
          </pattern>
        </defs>
        <path fill="url(#wall)" d="M0 0H390V262H0Z" />
        <path fill="url(#floor)" d="M0 256H390V350H0Z" />
        <path fill="url(#grain)" d="M0 262H390V350H0Z" />
        <path d="M0 252H390" stroke="#967b57" strokeWidth="9" />
        <path d="M0 247H390" stroke="#ddc6a0" strokeWidth="5" />
        <path
          d="M236 28H355V162H236Z"
          fill="#ad8a60"
          stroke="#7a6045"
          strokeWidth="3"
        />
        <path d="M244 36H347V152H244Z" fill="url(#glass)" />
        <path
          d="M246 127Q281 97 306 126Q329 101 347 118V152H244Z"
          fill="#9ab393"
        />
        <path
          d="M245 145Q281 114 316 144Q335 130 347 139V152H244Z"
          fill="#7c9b79"
        />
        <circle cx="322" cy="61" r="16" fill="#faf2c9" />
        <path d="M295 35V153M242 95H349" stroke="#af8a61" strokeWidth="7" />
        <path
          d="M230 159H361"
          stroke="#805f43"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d="M245 160L190 252H323L344 162" fill="#fff7ce" opacity=".22" />
        <ellipse
          cx="108"
          cy="295"
          rx="92"
          ry="13"
          fill="#5f503d"
          opacity=".13"
        />
        <ellipse
          cx="295"
          cy="310"
          rx="78"
          ry="15"
          fill="#e1d4ac"
          stroke="#b39d77"
          strokeWidth="2"
        />
        <g stroke="#70543d" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M30 57H177V71H30Z" fill="#bb9165" />
          <path d="M40 71V88M166 71V88" strokeWidth="5" />
          <path d="M40 15H56V56H40Z" fill="#80917b" />
          <path d="M58 9H73V56H58Z" fill="#b76f52" />
          <path d="M76 18H93V56H76Z" fill="#c6b98b" />
          <path d="M99 18L114 14L125 54L110 57Z" fill="#577e78" />
          <path d="M43 24H53M61 19H70M79 29H90" stroke="#e8d7ad" />
          <path d="M139 49V26Q139 17 150 17Q161 17 161 26V49Z" fill="#d8c299" />
          <path
            d="M147 18V9M149 14Q134 10 137 3Q150 3 149 14M150 10Q154 0 163 3Q163 12 150 10"
            fill="#69875a"
            stroke="#69875a"
          />
          <path
            d="M71 63L112 66L110 88L72 85Z"
            fill="#fff8e5"
            stroke="#bbab85"
          />
          <path
            d="M81 73L102 75M81 78L95 80"
            stroke="#93815f"
            strokeWidth="1.5"
          />
          <path d="M29 203L180 195L199 217L38 229Z" fill="#c49b6b" />
          <path d="M38 229H191V246H38Z" fill="#9f744d" />
          <path d="M44 244V292H54V244M177 242V288H187V242" fill="#936b49" />
          <g className={`drawer ${p.drawerOpen ? "open" : ""}`}>
            <path d="M72 238H157V265H72Z" fill="#b48757" />
            <path d="M108 250H121" stroke="#574732" strokeWidth="4" />
            {p.drawerOpen && (
              <>
                <path d="M72 237L84 218H164L157 238Z" fill="#6e543d" />
                <path
                  d="M108 225V213Q108 208 114 208Q121 208 121 213V225L127 227V233H102V227Z"
                  fill="#ba6a48"
                  stroke="#603f31"
                />
              </>
            )}
          </g>
          <path
            d="M72 199L120 196L132 213L83 218Z"
            fill="#fff9e9"
            stroke="#bdac86"
          />
          <path
            d="M86 203L113 202M89 208L118 206"
            stroke="#998c6e"
            strokeWidth="1.3"
          />
          <path d="M151 187V203H164V187" fill="#e6d5af" />
          <path d="M153 187L150 169M159 187L163 165" stroke="#6a6750" />
          <path d="M274 194L329 187L350 203L293 212Z" fill="#749daf" />
          <path d="M293 212L350 203V242L293 252Z" fill="#4c819d" />
          <path d="M274 194L293 212V252L274 234Z" fill="#6393a9" />
          <g className={`box-lid ${p.boxOpen ? "open" : ""}`}>
            <path d="M270 191L330 182L355 201L292 213Z" fill="#86b0bf" />
            <path
              d="M292 213L355 201V209L292 221L270 201V191Z"
              fill="#5f90a7"
            />
          </g>
          {p.boxOpen && !p.hasKey && (
            <g stroke="#a17f35" strokeWidth="4" fill="none">
              <circle cx="312" cy="196" r="6" />
              <path d="M316 201L327 213M322 208L327 204M325 211L330 207" />
            </g>
          )}
        </g>
        <path d="M14 331H374" stroke="#f4e6c9" opacity=".5" />
      </svg>
      {(
        [
          { id: "shelf", label: "선반 조사하기", text: "선반" },
          { id: "desk", label: "책상 조사하기", text: "책상" },
          { id: "blue-box", label: "파란 상자 조사하기", text: "파란 상자" },
        ] as const
      ).map((h) => (
        <button
          key={h.id}
          disabled={!p.enabled}
          className={`hotspot ${h.id} ${p.active === h.id ? "active" : ""}`}
          aria-label={h.label}
          onClick={() => p.onInspect(h.id)}
        >
          <span className="hotspot-label">
            <i /> {h.text}
          </span>
        </button>
      ))}
      <div className="dog-position">
        <CharacterView
          state={p.state}
          reactionId={p.reactionId}
          reducedMotion={p.reducedMotion}
          onInteract={p.onDog}
        />
      </div>
      <span className="room-caption">서당의 작은 서재</span>
    </div>
  );
}
