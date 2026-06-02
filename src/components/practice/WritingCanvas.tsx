import { Dispatch, memo, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Line, Path } from "react-native-svg";

import { CanvasPoint, InputStroke, KanjiVgCharacter } from "../../types/practice";

const MIN_POINT_DISTANCE = 3;
const MAX_POINT_JUMP_DISTANCE = 96;

type WritingCanvasProps = {
  fillMode?: boolean;
  showGuide: boolean;
  guideData?: KanjiVgCharacter;
  strokes: InputStroke[];
  onChange: Dispatch<SetStateAction<InputStroke[]>>;
  onCanvasLayout?: (size: { width: number; height: number }) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
};

export const WritingCanvas = memo(function WritingCanvas({
  fillMode = false,
  showGuide,
  guideData,
  strokes,
  onChange,
  onCanvasLayout,
  onInteractionStart,
  onInteractionEnd,
}: WritingCanvasProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [animatedStrokeIndex, setAnimatedStrokeIndex] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const currentStrokeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!showGuide || !guideData?.strokes.length) {
      setAnimatedStrokeIndex(0);
      setAnimatedProgress(0);
      return;
    }

    let strokeIndex = 0;
    let progress = 0;
    let timer: ReturnType<typeof setInterval> | undefined;

    setAnimatedStrokeIndex(0);
    setAnimatedProgress(0);

    timer = setInterval(() => {
      progress += 0.08;

      if (progress >= 1) {
        progress = 0;
        strokeIndex += 1;

        if (strokeIndex >= guideData.strokes.length) {
          strokeIndex = 0;
        }
      }

      setAnimatedStrokeIndex(strokeIndex);
      setAnimatedProgress(progress);
    }, 38);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showGuide, guideData]);

  const startStroke = (event: GestureResponderEvent) => {
    onInteractionStart?.();
    const point = getRelativePoint(event, size.width, size.height);
    const strokeId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    currentStrokeIdRef.current = strokeId;
    onChange((currentStrokes) => [
      ...currentStrokes,
      { id: strokeId, points: [point] },
    ]);
  };

  const appendPoint = (event: GestureResponderEvent) => {
    if (!currentStrokeIdRef.current) return;

    onInteractionStart?.();
    const point = getRelativePoint(event, size.width, size.height);

    onChange((currentStrokes) =>
      currentStrokes.map((stroke) => {
        if (stroke.id !== currentStrokeIdRef.current) {
          return stroke;
        }

        const lastPoint = stroke.points[stroke.points.length - 1];
        if (!lastPoint) {
          return stroke;
        }

        const distance = getDistance(lastPoint, point);
        if (distance < MIN_POINT_DISTANCE || distance > MAX_POINT_JUMP_DISTANCE) {
          return stroke;
        }

        return {
          ...stroke,
          points: [...stroke.points, point],
        };
      })
    );
  };

  const endStroke = () => {
    currentStrokeIdRef.current = null;
    onInteractionEnd?.();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => {
          onInteractionStart?.();
          return true;
        },
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => {
          onInteractionStart?.();
          return true;
        },
        onPanResponderGrant: startStroke,
        onPanResponderMove: appendPoint,
        onPanResponderRelease: endStroke,
        onPanResponderTerminate: endStroke,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [onChange, onInteractionStart, onInteractionEnd, size.width, size.height]
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
    onCanvasLayout?.({ width, height });
  };

  return (
    <View
      collapsable={false}
      style={[styles.canvas, fillMode && styles.fillCanvas]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <Grid />
      {showGuide ? (
        <View pointerEvents="none" style={styles.guideOverlay}>
          {guideData?.strokes.length ? (
            <Svg
              pointerEvents="none"
              style={styles.guideSvg}
              viewBox={`0 0 ${guideData.viewBox.width} ${guideData.viewBox.height}`}
            >
              {guideData.strokes.map((stroke) => (
                <Path
                  key={`ghost-${stroke.id}`}
                  d={stroke.path}
                  stroke="rgba(137, 110, 73, 0.14)"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
            </Svg>
          ) : null}
        </View>
      ) : null}
      {showGuide && guideData?.strokes.length ? (
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          viewBox={`0 0 ${guideData.viewBox.width} ${guideData.viewBox.height}`}
        >
          {guideData.strokes.map((stroke, index) => {
            const isPast = index < animatedStrokeIndex;
            const isCurrent = index === animatedStrokeIndex;
            const progress = isPast ? 1 : isCurrent ? animatedProgress : 0;

            if (!progress) return null;

            return (
              <Path
                key={`guide-${stroke.id}`}
                d={stroke.path}
                stroke={isCurrent ? "#c66d3d" : "rgba(198, 109, 61, 0.26)"}
                strokeWidth={isCurrent ? 7 : 5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray="1000 1000"
                strokeDashoffset={1000 * (1 - progress)}
              />
            );
          })}
        </Svg>
      ) : null}
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        {strokes.map((stroke) => {
          if (stroke.points.length === 1) {
            const point = stroke.points[0];
            return (
              <Line
                key={stroke.id}
                x1={point.x}
                y1={point.y}
                x2={point.x + 0.1}
                y2={point.y + 0.1}
                stroke="#173221"
                strokeWidth={10}
                strokeLinecap="round"
              />
            );
          }

          return (
            <Path
              key={stroke.id}
              d={buildPath(stroke.points)}
              stroke="#173221"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          );
        })}
      </Svg>
    </View>
  );
});

function Grid() {
  return (
    <>
      <View style={[styles.guideLine, styles.horizontalCenter]} />
      <View style={[styles.guideLine, styles.verticalCenter]} />
      <View style={[styles.diagonalLine, styles.diagonalPrimary]} />
      <View style={[styles.diagonalLine, styles.diagonalSecondary]} />
    </>
  );
}

function getRelativePoint(
  event: GestureResponderEvent,
  width: number,
  height: number,
): CanvasPoint {
  const { locationX, locationY } = event.nativeEvent;

  return {
    x: clamp(locationX, 8, Math.max(width - 8, 8)),
    y: clamp(locationY, 8, Math.max(height - 8, 8)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDistance(left: CanvasPoint, right: CanvasPoint) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function buildPath(points: CanvasPoint[]) {
  if (points.length < 2) {
    const point = points[0];
    return point ? `M${point.x} ${point.y}` : "";
  }

  let path = `M${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q${current.x} ${current.y} ${midX} ${midY}`;
  }

  const last = points[points.length - 1];
  path += ` L${last.x} ${last.y}`;

  return path;
}

const styles = StyleSheet.create({
  canvas: {
    aspectRatio: 1,
    alignSelf: "stretch",
    flexShrink: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ddcfbc",
    backgroundColor: "#fcf7ef",
    overflow: "hidden",
    position: "relative",
  },
  fillCanvas: {
    aspectRatio: undefined,
    flex: 1,
    minHeight: 0,
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  guideSvg: {
    width: "100%",
    height: "100%",
  },
  guideLine: {
    position: "absolute",
    backgroundColor: "#e3d6c2",
  },
  horizontalCenter: {
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
  },
  verticalCenter: {
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
  },
  diagonalLine: {
    position: "absolute",
    top: "50%",
    left: "-10%",
    width: "120%",
    height: 1,
    backgroundColor: "#ebdfd0",
  },
  diagonalPrimary: {
    transform: [{ rotateZ: "45deg" }],
  },
  diagonalSecondary: {
    transform: [{ rotateZ: "-45deg" }],
  },
});
