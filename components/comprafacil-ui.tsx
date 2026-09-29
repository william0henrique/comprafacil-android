import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const C = {
  leaf: "#1F6B45",
  leafDark: "#183027",
  cream: "#FFF8EC",
  paper: "#FFFFFF",
  lime: "#D7EA6A",
  amber: "#D69A36",
  coral: "#CA6A53",
  muted: "#68766E",
  border: "#E8E4D9",
  paleGreen: "#EDF4E6",
  paleAmber: "#FBF1D9",
  paleCoral: "#F9E8E3",
};

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function AppScreen({ children, scroll = true, contentStyle, edges = ["top", "left", "right"] }: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  edges?: ("top" | "bottom" | "left" | "right")[];
}) {
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={edges} style={styles.safeArea}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

export function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.pageHeading}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({ label, onPress, icon, disabled, style, accessibilityLabel }: {
  label: string;
  onPress: PressableProps["onPress"];
  icon?: IconName;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, style, (disabled || pressed) && { opacity: disabled ? 0.48 : 0.78 }]}
    >
      {icon ? <Ionicons name={icon} size={19} color={C.paper} /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, icon, style, danger }: {
  label: string;
  onPress: PressableProps["onPress"];
  icon?: IconName;
  style?: ViewStyle;
  danger?: boolean;
}) {
  const tint = danger ? C.coral : C.leaf;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, style, { borderColor: danger ? C.paleCoral : C.border }, pressed && { opacity: 0.7 }]}
    >
      {icon ? <Ionicons name={icon} size={18} color={tint} /> : null}
      <Text style={[styles.secondaryButtonText, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tint = C.leaf, size = 20 }: {
  icon: IconName;
  onPress: PressableProps["onPress"];
  label: string;
  tint?: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.65 }]}
    >
      <Ionicons name={icon} size={size} color={tint} />
    </Pressable>
  );
}

export function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "coral" | "neutral" }) {
  const palette = tone === "amber"
    ? [C.paleAmber, "#845A12"]
    : tone === "coral"
      ? [C.paleCoral, C.coral]
      : tone === "neutral"
        ? ["#F0F0EC", C.muted]
        : [C.paleGreen, C.leaf];
  return <View style={[styles.badge, { backgroundColor: palette[0] }]}><Text style={[styles.badgeText, { color: palette[1] }]}>{children}</Text></View>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, helper, autoCapitalize = "sentences", maxLength, secureTextEntry, returnKeyType }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps["keyboardType"];
  multiline?: boolean;
  helper?: string;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  maxLength?: number;
  secureTextEntry?: boolean;
  returnKeyType?: TextInputProps["returnKeyType"];
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#89948D"
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        returnKeyType={returnKeyType}
        style={[styles.input, multiline && { minHeight: 90, textAlignVertical: "top" }]}
      />
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon = "basket-outline", title, body, action }: { icon?: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={26} color={C.leaf} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionText}>{title}</Text>{action}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border, width: "100%" }} />;
}

export const textStyles = StyleSheet.create({
  body: { color: C.leafDark, fontSize: 15, lineHeight: 22 },
  secondary: { color: C.muted, fontSize: 13, lineHeight: 19 },
  value: { color: C.leafDark, fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 18 },
  pageHeading: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  pageTitle: { color: C.leafDark, fontSize: 28, fontWeight: "800", letterSpacing: -0.4 },
  pageSubtitle: { color: C.muted, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: C.paper, borderColor: C.border, borderWidth: 1, borderRadius: 22, padding: 16, gap: 12 },
  primaryButton: { minHeight: 52, borderRadius: 16, paddingHorizontal: 18, backgroundColor: C.leaf, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  primaryButtonText: { color: C.paper, fontSize: 15, fontWeight: "700" },
  secondaryButton: { minHeight: 48, borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, backgroundColor: C.paper, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryButtonText: { fontSize: 14, fontWeight: "700" },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.paper, borderColor: C.border, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  fieldLabel: { color: C.leafDark, fontSize: 13, fontWeight: "700" },
  input: { minHeight: 50, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.paper, color: C.leafDark, fontSize: 15 },
  fieldHelper: { color: C.muted, fontSize: 12, lineHeight: 17 },
  emptyState: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 30, gap: 9 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { color: C.leafDark, fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyBody: { color: C.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
  sectionTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  sectionText: { color: C.leafDark, fontSize: 17, fontWeight: "800" },
});
