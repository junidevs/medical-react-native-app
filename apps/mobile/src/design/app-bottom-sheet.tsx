import { PropsWithChildren, ReactNode, forwardRef, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

import { AppText } from "./typography";
import { useTheme } from "./theme";

interface AppBottomSheetProps extends PropsWithChildren {
  title: string;
  description?: string;
  footer?: ReactNode;
}

export const AppBottomSheet = forwardRef<BottomSheetModal, AppBottomSheetProps>(
  ({ title, description, children, footer }, ref) => {
    const theme = useTheme();
    const snapPoints = useMemo(() => ["42%", "72%"], []);
    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.38} />
        )}
        backgroundStyle={{ backgroundColor: theme.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.border }}
      >
        <BottomSheetView style={styles.content}>
          <AppText variant="heading" weight="900" color={theme.text}>
            {title}
          </AppText>
          {description ? (
            <AppText color={theme.muted} style={styles.description}>
              {description}
            </AppText>
          ) : null}
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

AppBottomSheet.displayName = "AppBottomSheet";

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  description: { marginTop: 8, lineHeight: 22 },
  body: { marginTop: 18 },
  footer: { marginTop: 18, gap: 10 }
});
