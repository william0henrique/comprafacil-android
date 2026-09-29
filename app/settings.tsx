import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen, Badge, C, Card, IconButton, PageHeading, textStyles } from "@/components/comprafacil-ui";
import { getRecommendationPreference, setRecommendationPreference } from "@/lib/local-db";
import type { RecommendationPreference } from "@/lib/domain";

type RecommendationOption = { id: RecommendationPreference; title: string; detail: string; icon: "cash-outline" | "navigate-outline" | "scale-outline" };

const OPTIONS: RecommendationOption[] = [
  { id: "lowestPrice", title: "Menor preço", detail: "Prioriza o menor total entre os valores registrados.", icon: "cash-outline" },
  { id: "closest", title: "Menor distância", detail: "Prioriza a loja próxima quando houver localização confirmada.", icon: "navigate-outline" },
  { id: "balanced", title: "Equilíbrio", detail: "Considera preço e distância; evita deslocamento longo por economia pequena.", icon: "scale-outline" },
];

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [preference, setPreference] = useState<RecommendationPreference>("balanced");
  const refresh = useCallback(async () => setPreference(await getRecommendationPreference(db)), [db]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  return (
    <AppScreen>
      <PageHeading title="Preferências" subtitle="Escolhas salvas somente neste aparelho." action={<IconButton icon="arrow-back" label="Voltar" onPress={() => router.back()} />} />
      <Text style={styles.sectionTitle}>Como recomendar uma loja?</Text>
      {OPTIONS.map((option) => <Pressable key={option.id} onPress={() => { setPreference(option.id); void setRecommendationPreference(db, option.id); }}>
        <Card style={[styles.optionCard, preference === option.id && styles.selectedOption]}>
          <View style={styles.optionRow}><View style={[styles.icon, preference === option.id && { backgroundColor: C.lime }]}><Ionicons name={option.icon} size={20} color={C.leaf} /></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.optionTitle}>{option.title}</Text><Text style={textStyles.secondary}>{option.detail}</Text></View>{preference === option.id ? <Ionicons name="checkmark-circle" size={23} color={C.leaf} /> : null}</View>
        </Card>
      </Pressable>)}

      <Card style={styles.privacyCard}><View style={styles.privacyHead}><View style={styles.privacyIcon}><Ionicons name="phone-portrait-outline" size={22} color={C.leaf} /></View><View style={{ flex: 1 }}><Text style={styles.optionTitle}>Sem conta, direto no Android</Text><Badge tone="green">Dados locais</Badge></View></View><Text style={textStyles.secondary}>Listas, produtos, favoritos, preferências, preços informados e histórico ficam no banco SQLite deste aparelho. Nenhuma conta, login ou sincronização em nuvem está ativa nesta versão.</Text><Text style={textStyles.secondary}>A localização só é pedida para uma busca que você iniciou; ela não é salva pelo app.</Text></Card>

      <Card style={styles.sourceCard}><Text style={styles.optionTitle}>Preços e fontes</Text><Text style={textStyles.secondary}>Os únicos preços nesta versão são informados manualmente e aparecem com essa identificação. A integração automática do SuperLuna está bloqueada por HTTP 403 e ausência de fonte autorizada confirmada.</Text><Text style={styles.version}>CompraFácil · Android · versão 1.0.0</Text></Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: C.leafDark, fontSize: 16, fontWeight: "800" },
  optionCard: { padding: 14 },
  selectedOption: { borderColor: "#9FBF83", backgroundColor: "#F8FAF1", borderWidth: 1.5 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  optionTitle: { color: C.leafDark, fontSize: 14, fontWeight: "800" },
  privacyCard: { backgroundColor: C.paleGreen, borderColor: "#DDE8D6" },
  privacyHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  privacyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.paper, alignItems: "center", justifyContent: "center" },
  sourceCard: { backgroundColor: "#FFFCF5", borderColor: "#F0E6D2" },
  version: { color: C.muted, fontSize: 11, fontWeight: "700", marginTop: 3 },
});
