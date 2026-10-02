import Svg, { G, Path, Rect } from "react-native-svg";
import { Animated, Platform, View } from "react-native";
import { useEffect, useRef } from "react";
import { getDogSprite } from "../../domain/pet/pixelDog";

const decorativeProps = Platform.OS === "web" ? { "aria-hidden": true as const } : { accessible: false };

export function SeodangDog({ stage = 1, happy = false, size = 112, animate = false }: { stage?: number; happy?: boolean; size?: number; animate?: boolean }) {
  const sprite = getDogSprite(stage, happy);
  const wag = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) {
      wag.setValue(0);
      return;
    }
    const duration = happy ? 100 : 220;
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(wag, { toValue: 1, duration, useNativeDriver: true, isInteraction: false }),
      Animated.timing(wag, { toValue: -1, duration: duration * 2, useNativeDriver: true, isInteraction: false }),
      Animated.timing(wag, { toValue: 0, duration, useNativeDriver: true, isInteraction: false }),
      Animated.delay(happy ? 80 : 650),
    ]));
    motion.start();
    return () => { motion.stop(); wag.setValue(0); };
  }, [animate, happy, wag]);

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Animated.View testID="seodang-dog-tail" style={{ position: "absolute", width: size, height: size, transformOrigin: [size * 15 / 24, size * 20 / 24, 0], transform: [{ rotate: wag.interpolate({ inputRange: [-1, 1], outputRange: ["-18deg", "18deg"] }) }] }}>
        <Svg width={size} height={size} viewBox={`0 0 ${sprite.resolution} ${sprite.resolution}`} {...decorativeProps}>
          {sprite.tail.map((path) => <Path key={path.color} d={path.d} fill={path.color} />)}
        </Svg>
      </Animated.View>
    <Svg width={size} height={size} viewBox={`0 0 ${sprite.resolution} ${sprite.resolution}`} {...decorativeProps}>
      {sprite.body.map((path) => <Path key={path.color} d={path.d} fill={path.color} />)}
    </Svg>
    </View>
  );
}

export function FoodBowl({ filled }: { filled: boolean }) {
  return (
    <Svg width={44} height={36} viewBox="0 0 22 18" pointerEvents="none" {...decorativeProps}>
      <Rect x={2} y={15} width={18} height={2} fill="#A68B6C" opacity={0.35} />
      <Rect x={3} y={8} width={16} height={7} fill="#B86B51" />
      <Rect x={5} y={15} width={12} height={1} fill="#8B5342" />
      <Rect x={1} y={6} width={20} height={3} fill="#D8987E" />
      <Rect x={3} y={6} width={16} height={1} fill="#865341" />
      {filled ? <G fill="#8B6540">
        <Rect x={4} y={4} width={4} height={2} />
        <Rect x={9} y={3} width={3} height={3} />
        <Rect x={13} y={4} width={4} height={2} />
        <Rect x={7} y={5} width={2} height={1} fill="#C59357" />
        <Rect x={12} y={5} width={2} height={1} fill="#C59357" />
      </G> : null}
      <G fill="#FFF3D9">
        <Rect x={9} y={12} width={4} height={2} />
        <Rect x={8} y={10} width={2} height={1} />
        <Rect x={11} y={9} width={2} height={2} />
        <Rect x={14} y={10} width={1} height={2} />
      </G>
    </Svg>
  );
}

export function PixelRoom({ dark = false }: { dark?: boolean }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 320 300" preserveAspectRatio="none" {...decorativeProps}>
      <Rect width={320} height={300} fill={dark ? "#28372F" : "#EAF1DE"} />
      {[24, 64, 104, 144, 184, 224, 264, 304].map((x) => <Rect key={x} x={x} width={1} height={224} fill={dark ? "#34473B" : "#DDE7CE"} />)}
      <Rect y={224} width={320} height={4} fill="#BCA98B" />
      <Rect y={228} width={320} height={72} fill={dark ? "#554B3E" : "#E9D8B9"} />
      {[246, 266, 286].map((y) => <Rect key={y} y={y} width={320} height={1} fill={dark ? "#635746" : "#DDCBA9"} />)}
      <G transform="translate(0 40)">
      <Rect x={27} y={22} width={64} height={63} fill="#B09A7A" />
      <Rect x={31} y={26} width={56} height={55} fill={dark ? "#567083" : "#C9E3E5"} />
      <Rect x={68} y={32} width={11} height={11} fill="#FFF1BF" />
      <Rect x={37} y={50} width={17} height={5} fill="#FFF9EC" />
      <Rect x={42} y={46} width={8} height={4} fill="#FFF9EC" />
      <Rect x={58} y={26} width={3} height={55} fill="#B09A7A" />
      <Rect x={31} y={57} width={56} height={3} fill="#B09A7A" />
      <Rect x={23} y={82} width={73} height={5} fill="#A68B6C" />
      </G>
      <G transform="translate(0 100)">
      <Rect x={233} y={82} width={4} height={29} fill="#759B70" />
      <Rect x={221} y={79} width={12} height={8} fill="#8CB183" />
      <Rect x={237} y={69} width={11} height={11} fill="#759B70" />
      <Rect x={223} y={109} width={25} height={20} fill="#C98B72" />
      <Rect x={219} y={105} width={33} height={6} fill="#DBA58D" />
      <Rect x={272} y={115} width={29} height={6} fill="#769C94" />
      <Rect x={268} y={121} width={36} height={7} fill="#CF9B78" />
      </G>
      <Rect x={76} y={268} width={154} height={16} fill={dark ? "#82715B" : "#D1BC97"} />
      <Rect x={84} y={271} width={138} height={10} fill={dark ? "#958268" : "#E4CDA6"} />
    </Svg>
  );
}
