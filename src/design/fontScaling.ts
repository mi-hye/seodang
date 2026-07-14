import { Platform, Text, TextInput } from "react-native";

export { getAppTextScale, scaledFont } from "./fontScalingConfig";

type FontScalingComponent = {
  defaultProps?: {
    allowFontScaling?: boolean;
  };
};

export function applyAppFontScalingDefaults() {
  if (Platform.OS !== "android") {
    return;
  }

  disableFontScaling(Text as FontScalingComponent);
  disableFontScaling(TextInput as FontScalingComponent);
}

function disableFontScaling(component: FontScalingComponent) {
  component.defaultProps = {
    ...component.defaultProps,
    allowFontScaling: false,
  };
}
