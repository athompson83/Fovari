import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

interface FormFieldProps extends TextInputProps {
  error?: string;
  label: string;
}

export function FormField({ error, label, multiline, style, ...props }: FormFieldProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor="#9298AA"
        style={[
          styles.input,
          multiline && styles.multiline,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: "#A42C4E",
    fontSize: 12,
    marginTop: 5,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputError: {
    borderColor: colors.coral,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  multiline: {
    minHeight: 108,
    textAlignVertical: "top",
  },
  root: {
    marginBottom: spacing.lg,
  },
});
