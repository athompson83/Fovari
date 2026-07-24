import type { PropsWithChildren } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewProps,
} from "react-native";

import { colors, spacing } from "@fovari/design-system";

export interface ScreenProps extends ScrollViewProps {
  padded?: boolean;
}

export function Screen({
  children,
  contentContainerStyle,
  padded = true,
  ...props
}: PropsWithChildren<ScreenProps>) {
  const { width } = useWindowDimensions();
  const tablet = width >= 768;

  return (
    <ScrollView
      {...props}
      contentContainerStyle={[
        styles.content,
        padded && styles.padded,
        tablet && styles.tablet,
        contentContainerStyle,
      ]}
      style={[styles.screen, props.style]}
    >
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  inner: {
    alignSelf: "center",
    maxWidth: 1180,
    width: "100%",
  },
  padded: {
    padding: spacing.lg,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  tablet: {
    padding: spacing.xxl,
  },
});
