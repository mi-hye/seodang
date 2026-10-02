import { StyleSheet, Text } from "react-native";
import type { TextProps } from "react-native";

const SMALL_KANA = "ぁぃぅぇぉゃゅょっゎゕゖァィゥェォャュョッヮヵヶ";

type KanaTextProps = Omit<TextProps, "children"> & {
  children: string;
  highlight?: string;
  highlightColor?: string;
};

// Make small kana visibly smaller even when the selected Japanese font has
// nearly full-size small-glyph outlines. Nested Text preserves the baseline.
export function KanaText({ children, style, highlight, highlightColor, ...props }: KanaTextProps) {
  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 14;
  const segments = highlight ? children.split(highlight) : [children];
  const renderGlyphs = (text: string) => [...text].map((glyph, index) => (
    <Text key={index} style={SMALL_KANA.includes(glyph) ? { fontSize: fontSize * 0.65 } : undefined}>{glyph}</Text>
  ));

  return (
    <Text {...props} style={style}>
      {segments.map((segment, index) => (
        <Text key={index}>
          {index > 0 && highlight ? <Text style={{ color: highlightColor }}>{renderGlyphs(highlight)}</Text> : null}
          {renderGlyphs(segment)}
        </Text>
      ))}
    </Text>
  );
}
