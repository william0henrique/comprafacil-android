import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen, Badge, C, Card, EmptyState, PageHeading, PrimaryButton, SecondaryButton, textStyles } from "@/components/comprafacil-ui";
import { compareStores, formatBRL, haversineKm, recommendStore, type RecommendationPreference, type StoreComparison } from "@/lib/domain";
import { getForegroundLocation, openDirections, type Coordinates } from "@/lib/location";
import { getListComparisonData, getRecommendationPreference, setRecommendationPreference, type Store } from "@/lib/local-db";

const PREFERENCES: { id: RecommendationPreference; label: string; icon: "cash-outline" | "navigate-outline" | "scale-outline" }[] = [
  { id: "lowestPrice", label: "Menor preço", icon: "cash-outline" },
  { id: "closest", label: "Mais perto", icon: "navigate-outline" },
  { id: "balanced", label: "Equilíbrio", icon: "scale-outline" },
];

function displayStore(store: Store): string {
  return store.branchName ? `${store.chainName} — ${store.branchName}` : store.chainName;
}

export default function CompareListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = Array.isArray(id) ? id[0] : id ?? "";
  const db = useSQLiteContext();
  const router = useRouter();
  const [listName, setListName] = useState("");
  const [itemsCount, setItemsCount] = useState(0);
  const [stores, setStores] = useState<Store[]>([]);
  const [comparisons, setComparisons] = useState<StoreComparison[]>([]);
  const [preference, setPreference] = useState<RecommendationPreference>("balanced");
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [locationNote, setLocationNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [data, nextPreference] = await Promise.all([getListComparisonData(db, listId), getRecommendationPreference(db)]);
    if (!data) return;
    setListName(data.listName); setItemsCount(data.items.length); setStores(data.stores); setPreference(nextPreference);
    const computed = compareStores(data.items, data.stores.map((store) => ({
      id: store.id,
      name: displayStore(store),
      latitude: store.latitude,
      longitude: store.longitude,
    })), data.prices);
    setComparisons(computed);
  }, [db, listId]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const distances = useMemo(() => {
    const result = new Map<string, number>();
    if (!origin) return result;
    for (const store of stores) {
      if (store.latitude == null || store.longitude == null) continue;
      result.set(store.id, haversineKm(origin, { latitude: store.latitude, longitude: store.longitude }));
    }
    return result;
  }, [origin, stores]);
  const recommendation = useMemo(() => recommendStore(comparisons, distances, preference), [comparisons, distances, preference]);
  const sorted = useMemo(() => [...comparisons].sort((a, b) => {
    if (a.pricedCount === 0 && b.pricedCount > 0) return 1;
    if (b.pricedCount === 0 && a.pricedCount > 0) return -1;
    if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount;
    return a.totalCents - b.totalCents;
  }), [comparisons]);

  async function choosePreference(next: RecommendationPreference) {
    setPreference(next);
    await setRecommendationPreference(db, next);
    await refresh();
  }

  async function requestLocation() {
    setBusy(true); setLocationNote("");
    try {
      const current = await getForegroundLocation();
      setOrigin(current);
      setLocationNote("Localização usada nesta comparação e mantida somente enquanto esta tela estiver aberta.");
    } catch (error) {
      setLocationNote(error instanceof Error ? error.message : "Localização indisponível.");
    } finally { setBusy(false); }
  }

  const pricedStores = comparisons.filter((row) => row.pricedCount > 0).length;

  return (
    <AppScreen>
      <PageHeading title="Comparar lista" subtitle={listName ? `“${listName}” · ${itemsCount} ${itemsCount === 1 ? "item" : "itens"}` : "Preços registrados por loja."} />
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}><Ionicons name="information-circle-outline" size={21} color={C.leaf} /><Text style={styles.infoText}>A comparação usa apenas preços anotados. Produtos sem preço aparecem como faltantes e não entram na soma.</Text></View>
        <Text style={styles.infoFoot}>Os valores atuais são registros manuais; não há feed autorizado do SuperLuna conectado.</Text>
      </Card>

      <View style={{ gap: 9 }}><Text style={styles.sectionTitle}>O que é mais importante?</Text><View style={styles.preferenceRow}>{PREFERENCES.map((option) => <Pressable key={option.id} onPress={() => { void choosePreference(option.id); }} style={[styles.preference, preference === option.id && styles.preferenceActive]}><Ionicons name={option.icon} size={16} color={preference === option.id ? C.paper : C.leaf} /><Text style={[styles.preferenceText, preference === option.id && { color: C.paper }]}>{option.label}</Text></Pressable>)}</View></View>

      <Card style={styles.locationCard}>
        <View style={styles.locationTop}><View style={styles.locationIcon}><Ionicons name="navigate-outline" size={20} color={C.leaf} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Considere a distância</Text><Text style={textStyles.secondary}>Só pedimos localização se você escolher.</Text></View></View>
        <SecondaryButton label={busy ? "Obtendo localização…" : origin ? "Atualizar minha localização" : "Usar localização para comparar"} icon="locate-outline" onPress={() => { void requestLocation(); }} />
        {locationNote ? <Text style={textStyles.secondary}>{locationNote}</Text> : null}
        {origin && distances.size === 0 ? <Text style={styles.warning}>As lojas salvas ainda não têm coordenadas confirmadas; distâncias permanecem indisponíveis.</Text> : null}
      </Card>

      {recommendation ? (() => {
        const recommendedStore = stores.find((store) => store.id === recommendation.storeId);
        const row = comparisons.find((item) => item.storeId === recommendation.storeId);
        if (!recommendedStore || !row) return null;
        return <Card style={styles.recommendCard}>
          <View style={styles.recommendHeader}><View style={styles.recommendIcon}><Ionicons name="sparkles-outline" size={20} color={C.leafDark} /></View><View style={{ flex: 1 }}><Text style={styles.recommendKicker}>SUGESTÃO PARA ESTA LISTA</Text><Text style={styles.cardTitle}>{displayStore(recommendedStore)}</Text></View><Badge tone="green">{row.missingCount ? "Parcial" : "Completa"}</Badge></View>
          <Text style={styles.reason}>{recommendation.reason}</Text>
          <Text style={styles.recommendTotal}>{formatBRL(row.totalCents)}{row.missingCount ? ` · ${row.missingCount} sem preço` : ""}</Text>
        </Card>;
      })() : null}

      <View style={styles.listHeading}><Text style={styles.sectionTitle}>Totais disponíveis</Text><Badge tone={pricedStores ? "green" : "neutral"}>{pricedStores} com preços</Badge></View>
      {!itemsCount ? <Card><EmptyState icon="basket-outline" title="Esta lista está vazia" body="Adicione produtos antes de comparar supermercados." action={<SecondaryButton label="Voltar à lista" onPress={() => router.back()} />} /></Card> : null}
      {itemsCount > 0 && !pricedStores ? <Card><EmptyState icon="pricetag-outline" title="Nenhum preço registrado" body="Adicione um preço manual por produto e unidade para habilitar a comparação. Nenhum valor será estimado ou inventado." action={<SecondaryButton label="Voltar e registrar preço" onPress={() => router.back()} />} /></Card> : null}
      {sorted.filter((row) => row.pricedCount > 0).map((row) => {
        const store = stores.find((candidate) => candidate.id === row.storeId);
        const distance = distances.get(row.storeId);
        const isRecommended = recommendation?.storeId === row.storeId;
        const hasRoute = Boolean(store?.address || (store?.latitude != null && store?.longitude != null));
        return <Card key={row.storeId} style={isRecommended ? styles.recommendedStore : undefined}>
          <View style={styles.storeHeading}><View style={[styles.storeIcon, isRecommended && { backgroundColor: C.lime }]}><Ionicons name="storefront-outline" size={21} color={C.leaf} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{row.storeName}</Text><Text style={textStyles.secondary}>{distance == null ? "Distância indisponível" : `${distance.toFixed(1)} km de você`}</Text></View>{isRecommended ? <Badge tone="green">Sugestão</Badge> : null}</View>
          <View style={styles.totalRow}><View><Text style={styles.totalCaption}>{row.missingCount ? "Subtotal parcial" : "Total registrado"}</Text><Text style={styles.total}>{formatBRL(row.totalCents)}</Text></View><View style={{ alignItems: "flex-end", gap: 5 }}><Badge tone={row.missingCount ? "amber" : "green"}>{row.missingCount ? `${row.missingCount} faltando` : "Lista completa"}</Badge><Text style={styles.itemCount}>{row.pricedCount} de {itemsCount} produtos</Text></View></View>
          {hasRoute ? <SecondaryButton label="Abrir rota" icon="navigate-outline" onPress={() => { if (store) void openDirections({ address: store.address, latitude: store.latitude, longitude: store.longitude }); }} /> : null}
        </Card>;
      })}
      {itemsCount > 0 && pricedStores > 0 ? <Card style={{ backgroundColor: "#FFFCF5" }}><Text style={styles.cardTitle}>Sobre esta comparação</Text><Text style={textStyles.secondary}>Cada subtotal usa somente ofertas registradas naquela unidade. Uma unidade mais barata pode estar sem alguns itens; confira a quantidade faltante e a distância antes de decidir.</Text></Card> : null}
      <PrimaryButton label="Voltar para a lista" icon="arrow-back" onPress={() => router.back()} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  infoCard: { backgroundColor: C.paleGreen, borderColor: "#DDE8D6" },
  infoRow: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  infoText: { flex: 1, color: C.leafDark, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  infoFoot: { color: C.muted, fontSize: 11, lineHeight: 16 },
  sectionTitle: { color: C.leafDark, fontSize: 16, fontWeight: "800" },
  preferenceRow: { flexDirection: "row", gap: 7 },
  preference: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.paper, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, paddingHorizontal: 4 },
  preferenceActive: { backgroundColor: C.leaf, borderColor: C.leaf },
  preferenceText: { color: C.leafDark, fontSize: 11, fontWeight: "800" },
  locationCard: { backgroundColor: C.paper },
  locationTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  locationIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: C.leafDark, fontSize: 15, fontWeight: "800" },
  warning: { color: "#845A12", fontSize: 12, lineHeight: 17 },
  recommendCard: { borderColor: "#C8D99A", backgroundColor: "#F4F7E9" },
  recommendHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  recommendIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.lime, alignItems: "center", justifyContent: "center" },
  recommendKicker: { color: C.leaf, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  reason: { color: C.leafDark, fontSize: 13, lineHeight: 19 },
  recommendTotal: { color: C.leafDark, fontSize: 22, fontWeight: "900" },
  listHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recommendedStore: { borderColor: "#A7C17B", borderWidth: 1.5 },
  storeHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  storeIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopColor: C.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 11 },
  totalCaption: { color: C.muted, fontSize: 12 },
  total: { color: C.leafDark, fontSize: 21, fontWeight: "900", marginTop: 3 },
  itemCount: { color: C.muted, fontSize: 11 },
});
