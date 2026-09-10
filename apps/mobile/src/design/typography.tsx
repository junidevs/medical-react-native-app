import { PixelRatio, StyleProp, Text, TextProps, TextStyle } from "react-native";

const maxFontScale = 1.22;

function scaled(size: number) {
  const fontScale = Math.min(PixelRatio.getFontScale(), maxFontScale);
  return Math.round(size * fontScale);
}

export const typeScale = {
  hero: scaled(34),
  title: scaled(28),
  heading: scaled(22),
  body: scaled(16),
  caption: scaled(13),
  tiny: scaled(11)
};

interface AppTextProps extends TextProps {
  variant?: keyof typeof typeScale;
  weight?: TextStyle["fontWeight"];
  color?: string;
  align?: TextStyle["textAlign"];
}

export function AppText({
  variant = "body",
  weight = "400",
  color,
  align,
  style,
  ...props
}: AppTextProps) {
  const textStyle: StyleProp<TextStyle> = [
    { fontSize: typeScale[variant], fontWeight: weight, color, textAlign: align },
    style
  ];
  return <Text allowFontScaling maxFontSizeMultiplier={1.25} style={textStyle} {...props} />;
}
