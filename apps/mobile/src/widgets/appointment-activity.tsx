import { HStack, Image, ProgressView, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  activityBackgroundTint,
  background,
  clipShape,
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
  padding,
  tint
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";

export interface AppointmentActivityProps {
  doctorName: string;
  specialty: string;
  clinicName: string;
  // Props cross a JSON bridge into a separate runtime, so pass epoch ms and
  // rebuild Date objects inside the widget body.
  startEpochMs: number;
  createdEpochMs: number;
}

function AppointmentActivityView(props: AppointmentActivityProps, _environment: LiveActivityEnvironment) {
  "widget";
  // The 'widget' directive serializes only this function body, so every constant
  // and helper the layout needs must live inside here.
  const BRAND = "#F0503C";
  const SURFACE = "#0b2f2b";
  const ACCENT = "#FB6B57";
  const BAR = "#2dd4bf";
  const lower = new Date(props.createdEpochMs);
  const upper = new Date(props.startEpochMs);

  const Countdown = ({ size }: { size: number }) => (
    <Text
      timerInterval={{ lower, upper }}
      countsDown
      modifiers={[
        font({ size, weight: "bold", design: "rounded" }),
        monospacedDigit(),
        foregroundStyle("#ffffff")
      ]}
    />
  );

  // Circular avatar: a white disc with the brand-tinted clinician glyph on top,
  // which reads like a profile photo on the Lock Screen / Dynamic Island.
  const Avatar = ({ size }: { size: number }) => (
    <Image
      systemName="stethoscope"
      size={Math.round(size * 0.52)}
      modifiers={[
        foregroundStyle(BRAND),
        frame({ width: size, height: size }),
        background("#ffffff"),
        clipShape("circle")
      ]}
    />
  );

  // Native SwiftUI timer bar that animates from booking time to appointment time
  // (Uber-style progress line, but rendered/animated by the system).
  const TimerBar = () => (
    <ProgressView timerInterval={{ lower, upper }} countsDown={false} modifiers={[tint(BAR)]} />
  );

  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={12}
        modifiers={[padding({ horizontal: 16, vertical: 14 }), activityBackgroundTint(SURFACE)]}
      >
        <HStack spacing={12}>
          <Avatar size={46} />
          <VStack alignment="leading" spacing={3}>
            <Text modifiers={[font({ size: 16, weight: "bold" }), foregroundStyle("#ffffff")]}>
              {props.doctorName}
            </Text>
            <Text modifiers={[font({ size: 12 }), foregroundStyle(ACCENT)]}>
              {props.specialty} · {props.clinicName}
            </Text>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={1}>
            <Countdown size={24} />
            <Text modifiers={[font({ size: 11 }), foregroundStyle(ACCENT)]}>do wizyty</Text>
          </VStack>
        </HStack>
        <TimerBar />
      </VStack>
    ),
    compactLeading: <Avatar size={20} />,
    compactTrailing: <Countdown size={14} />,
    minimal: <Avatar size={18} />,
    expandedLeading: (
      <HStack spacing={8} alignment="center" modifiers={[padding({ leading: 6, top: 4 })]}>
        <Avatar size={34} />
        <VStack alignment="leading" spacing={1}>
          <Text modifiers={[font({ size: 13, weight: "semibold" }), foregroundStyle("#ffffff")]}>
            {props.doctorName}
          </Text>
          <Text modifiers={[font({ size: 10 }), foregroundStyle(ACCENT)]}>{props.specialty}</Text>
        </VStack>
      </HStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={1} modifiers={[padding({ trailing: 6, top: 4 })]}>
        <Countdown size={20} />
        <Text modifiers={[font({ size: 10 }), foregroundStyle(ACCENT)]}>do wizyty</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ horizontal: 6, top: 6 })]}>
        <TimerBar />
        <Text modifiers={[font({ size: 11 }), foregroundStyle(ACCENT)]}>
          {props.clinicName}
        </Text>
      </VStack>
    )
  };
}

export const AppointmentActivity = createLiveActivity("AppointmentActivity", AppointmentActivityView);
