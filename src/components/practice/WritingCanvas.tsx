import { Dispatch, memo, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  StyleSheet,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Line, Path } from "react-native-svg";

import { CanvasPoint, InputStroke, KanjiVgCharacter } from "../../types/practice";

const MIN_POINT_DISTANCE = 3;
const MAX_POINT_JUMP_DISTANCE = 104;
const MAX_POINT_STEP_DISTANCE = 60;
const ANDROID_MIN_POINT_DISTANCE = 2;
const ANDROID_MAX_POINT_JUMP_DISTANCE = 180;
const ANDROID_PENDING_POINT_DISTANCE = 72;
const ANDROID_PENDING_CONFIRM_DISTANCE = 46;
const ANDROID_INTERPOLATION_DISTANCE = 18;
const GUIDE_PROGRESS_STEP = 0.08;

type WritingCanvasProps = {
  fillMode?: boolean;
  showGuide: boolean;
  guideData?: KanjiVgCharacter;
  guideProgressStepMultiplier?: number;
  strokes: InputStroke[];
  onChange: Dispatch<SetStateAction<InputStroke[]>>;
  onCanvasLayout?: (size: { width: number; height: number }) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const WritingCanvas = memo(function WritingCanvas({
  fillMode = false,
  showGuide,
  guideData,
  guideProgressStepMultiplier = 1,
  strokes,
  onChange,
  onCanvasLayout,
  onInteractionStart,
  onInteractionEnd,
  style,
}: WritingCanvasProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [animatedStrokeIndex, setAnimatedStrokeIndex] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const currentStrokeIdRef = useRef<string | null>(null);
  const pendingAndroidPointRef = useRef<CanvasPoint | null>(null);

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
      progress += GUIDE_PROGRESS_STEP * guideProgressStepMultiplier;

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
  }, [showGuide, guideData, guideProgressStepMultiplier]);

  const startStroke = (event: GestureResponderEvent) => {
    onInteractionStart?.();
    const point = getRelativePoint(event, size.width, size.height);
    const strokeId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    currentStrokeIdRef.current = strokeId;
    pendingAndroidPointRef.current = null;
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
        const minPointDistance =
          Platform.OS === "android" ? ANDROID_MIN_POINT_DISTANCE : MIN_POINT_DISTANCE;
        const maxPointJumpDistance =
          Platform.OS === "android" ? ANDROID_MAX_POINT_JUMP_DISTANCE : MAX_POINT_JUMP_DISTANCE;
        if (distance < minPointDistance || distance > maxPointJumpDistance) {
          if (Platform.OS === "android") {
            pendingAndroidPointRef.current = null;
          }
          return stroke;
        }

        if (Platform.OS === "android") {
          if (distance > ANDROID_PENDING_POINT_DISTANCE) {
            const pendingPoint = pendingAndroidPointRef.current;
            pendingAndroidPointRef.current = point;

            if (!pendingPoint) {
              return stroke;
            }

            const confirmDistance = getDistance(pendingPoint, point);
            if (confirmDistance > ANDROID_PENDING_CONFIRM_DISTANCE) {
              return stroke;
            }
          } else {
            pendingAndroidPointRef.current = null;
          }
        }

        const nextPoints =
          Platform.OS === "android"
            ? getInterpolatedPoints(lastPoint, point, ANDROID_INTERPOLATION_DISTANCE)
            : [
                distance > MAX_POINT_STEP_DISTANCE
                  ? getLimitedStepPoint(lastPoint, point, MAX_POINT_STEP_DISTANCE)
                  : point,
              ];

        return {
          ...stroke,
          points: [...stroke.points, ...nextPoints],
        };
      })
    );
  };

  const endStroke = () => {
    currentStrokeIdRef.current = null;
    pendingAndroidPointRef.current = null;
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
      style={[styles.canvas, fillMode && styles.fillCanvas, style]}
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

function getLimitedStepPoint(
  from: CanvasPoint,
  to: CanvasPoint,
  maxDistance: number,
) {
  const distance = getDistance(from, to);
  if (distance <= maxDistance || distance === 0) {
    return to;
  }

  const ratio = maxDistance / distance;
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

function getInterpolatedPoints(
  from: CanvasPoint,
  to: CanvasPoint,
  maxDistance: number,
) {
  const distance = getDistance(from, to);
  if (distance <= maxDistance || distance === 0) {
    return [to];
  }

  const stepCount = Math.ceil(distance / maxDistance);
  const points: CanvasPoint[] = [];

  for (let index = 1; index <= stepCount; index += 1) {
    const ratio = index / stepCount;
    points.push({
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
    });
  }

  return points;
}

function buildPath(points: CanvasPoint[]) {
  if (points.length < 2) {
    const point = points[0];
    return point ? `M${point.x} ${point.y}` : "";
  }

  let path = `M${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    path += ` L${point.x} ${point.y}`;
  }

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
