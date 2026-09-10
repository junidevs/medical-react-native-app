import { HStack, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { containerBackground, font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export interface LoyaltyWidgetProps {
  points: number;
  tier: string;
  completedVisits: number;
  upcomingVisits: number;
}

function LoyaltyWidgetView(props: LoyaltyWidgetProps, _environment: WidgetEnvironment) {
  "widget";
  // Must live inside the function body: the 'widget' directive serializes only
  // this function into a separate runtime, so module-scoped constants are unavailable.
  const BRAND = "#F0503C";
  return (
    <VStack
      spacing={4}
      modifiers={[padding({ all: 16 }), containerBackground(BRAND, "widget")]}
    >
      <Text modifiers={[font({ size: 13, weight: "semibold" }), foregroundStyle("#FFE7E1")]}>
        MedConnect · {props.tier}
      </Text>
      <Spacer />
      <Text modifiers={[font({ size: 44, weight: "heavy" }), foregroundStyle("#ffffff")]}>
        {String(props.points)}
      </Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle("#a7f3d0")]}>
        punktów lojalnościowych
      </Text>
      <Spacer />
      <HStack spacing={12}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle("#FFE7E1")]}>
          Odbyte: {String(props.completedVisits)}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle("#FFE7E1")]}>
          Nadchodzące: {String(props.upcomingVisits)}
        </Text>
      </HStack>
    </VStack>
  );
}

export const LoyaltyWidget = createWidget("LoyaltyWidget", LoyaltyWidgetView);
