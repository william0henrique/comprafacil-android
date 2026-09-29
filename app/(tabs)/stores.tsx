import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen, Badge, C, Card, Field, IconButton, PageHeading, PrimaryButton, SecondaryButton, textStyles } from "@/components/comprafacil-ui";
import { getApiBaseUrl } from "@/constants/api";
import { haversineKm } from "@/lib/domain";
import { getForegroundLocation, openDirections, type Coordinates } from "@/lib/location";
import { createStore, getStores, isSuperLunaStore, toggleStoreFavorite, type Store } from "@/lib/local-db";
import { trpc } from "@/lib/trpc";
import type { NearbyMarket, NearbySearchResult } from "@/server/maps";

export default function StoresScreen() {
  const db = useSQLiteContext();
  const [stores, setStores] = useState<Store[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [chainName, setChainName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [nearby, setNearby] = useState<NearbySearchResult | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState<string | null>(null);
  const trpcUtils = trpc.useUtils();

  const refresh = useCallback(async () => setStores(await getStores(db)), [db]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function findNearby() {
    setLocationBusy(true);
    setNearby(null);
    try {
      const current = await getForegroundLocation();
      setCoordinates(current);
      if (!getApiBaseUrl()) {
        setNearby({ available: false, status: "UNAVAILABLE", message: "Busca por proximidade indisponível neste ambiente. Sua localização não foi salva.", places: [] });
        return;
      }
      const result = await trpcUtils.locations.nearby.fetch({ ...current, radius: 5000 });
      setNearby(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível obter a localização.";
      setNearby({ available: false, status: "UNAVAILABLE", message, places: [] });
    } finally { setLocationBusy(false); }
  }

  async function saveNearbyPlace(place: NearbyMarket) {
    if (stores.some((store) => store.externalStoreId === place.placeId)) {
      Alert.alert("Já salvo", "Este local já está na sua lista de supermercados.");
      return;
    }
    setSaveBusy(place.placeId);
    try {
      await createStore(db, {
        chainName: place.name,
        address: place.address ?? undefined,
        latitude: place.latitude,
        longitude: place.longitude,
        source: "google-maps",
        externalStoreId: place.placeId,
      });
      await refresh();
      Alert.alert("Supermercado salvo", "O local foi salvo apenas neste aparelho. Ainda não há preço registrado.");
    } catch { Alert.alert("Não foi possível salvar", "Tente novamente em instantes."); }
    finally { setSaveBusy(null); }
  }

  async function saveManualStore() {
    if (!chainName.trim()) return;
    try {
      await createStore(db, { chainName, branchName, address, city, source: "user-manual" });
      setModalVisible(false); setChainName(""); setBranchName(""); setAddress(""); setCity("");
      await refresh();
    } catch { Alert.alert("Não foi possível salvar", "Tente novamente em instantes."); }
  }

  const superluna = stores.filter(isSuperLunaStore);
  const otherStores = stores.filter((store) => !isSuperLunaStore(store));

  return (
    <AppScreen>
      <PageHeading title="Supermercados" subtitle="Lojas e unidades salvas neste aparelho." action={<IconButton icon="add" label="Adicionar supermercado" onPress={() => setModalVisible(true)} />} />
      <Card style={styles.sourceCard}>
        <View style={styles.sourceHeader}><View style={styles.storeIcon}><Ionicons name="storefront-outline" size={21} color={C.leaf} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>SuperLuna Supermercados</Text><Text style={textStyles.secondary}>Rede cadastrada · sem integração de preços</Text></View><Badge tone="amber">Indisponível</Badge></View>
        <Text style={textStyles.secondary}>A loja online retornou HTTP 403 da CloudFront e não foi confirmada uma API/feed com autorização para coleta. Nenhum produto ou preço foi importado.</Text>
      </Card>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Unidades SuperLuna identificadas</Text><Badge tone="neutral">Endereços não confirmados</Badge></View>
      {superluna.map((store) => (
        <Card key={store.id} style={styles.storeCard}>
          <View style={styles.storeRow}>
            <View style={[styles.storeIcon, { backgroundColor: C.paleGreen }]}><Ionicons name="storefront-outline" size={20} color={C.leaf} /></View>
            <View style={{ flex: 1, gap: 4 }}><Text style={styles.cardTitle}>{store.branchName ?? store.chainName}</Text><Text style={textStyles.secondary}>{store.city ? `${store.city}, MG` : "Minas Gerais"} · nome citado no diretório público</Text></View>
            <IconButton icon={store.isFavorite ? "heart" : "heart-outline"} label={store.isFavorite ? "Remover favorito" : "Favoritar unidade"} tint={store.isFavorite ? C.coral : C.leaf} onPress={() => { void toggleStoreFavorite(db, store.id).then(refresh); }} />
          </View>
          <View style={styles.notice}><Ionicons name="information-circle-outline" size={17} color={C.amber} /><Text style={styles.noticeText}>Endereço, identificador de filial do e-commerce e preços não confirmados.</Text></View>
        </Card>
      ))}

      <View style={styles.locationSection}>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Perto de você</Text><Badge tone="neutral">Opcional</Badge></View>
        <Text style={textStyles.secondary}>A localização é pedida só quando você toca abaixo. Ela é usada apenas para esta busca e não fica salva no app.</Text>
        <PrimaryButton label={locationBusy ? "Buscando locais…" : "Buscar supermercados próximos"} icon="navigate-outline" onPress={() => { void findNearby(); }} disabled={locationBusy} />
        {nearby ? (
          nearby.available ? (
            nearby.places.length ? nearby.places.map((place) => {
              const saved = stores.some((store) => store.externalStoreId === place.placeId);
              const distance = coordinates ? haversineKm(coordinates, { latitude: place.latitude, longitude: place.longitude }) : null;
              return <Card key={place.placeId} style={styles.storeCard}>
                <View style={styles.storeRow}><View style={[styles.storeIcon, { backgroundColor: C.paleAmber }]}><Ionicons name="location-outline" size={20} color={C.leaf} /></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.cardTitle}>{place.name}</Text><Text style={textStyles.secondary}>{place.address ?? "Endereço não informado pelo serviço"}</Text><Text style={styles.distance}>{distance == null ? "" : `${distance.toFixed(1)} km · `}{place.rating == null ? "Local do Google Maps" : `Nota ${place.rating.toFixed(1)}${place.userRatingsTotal ? ` (${place.userRatingsTotal})` : ""}`}</Text></View></View>
                <View style={styles.actions}><SecondaryButton label="Abrir rota" icon="navigate" onPress={() => { void openDirections({ latitude: place.latitude, longitude: place.longitude }); }} style={{ flex: 1 }} /><SecondaryButton label={saved ? "Salvo" : saveBusy === place.placeId ? "Salvando…" : "Salvar loja"} icon="bookmark-outline" onPress={() => { void saveNearbyPlace(place); }} style={{ flex: 1 }} /></View>
              </Card>;
            }) : <Card><Text style={textStyles.secondary}>Nenhum supermercado foi encontrado dentro do raio consultado.</Text></Card>
          ) : <Card><Text style={styles.cardTitle}>Busca de locais indisponível</Text><Text style={textStyles.secondary}>{nearby.message}</Text></Card>
        ) : null}
      </View>

      {otherStores.length ? <View style={{ gap: 10 }}><Text style={styles.sectionTitle}>Outros supermercados</Text>{otherStores.map((store) => {
        const distance = coordinates && store.latitude != null && store.longitude != null ? haversineKm(coordinates, { latitude: store.latitude, longitude: store.longitude }) : null;
        const hasRoute = Boolean(store.address || (store.latitude != null && store.longitude != null));
        return <Card key={store.id} style={styles.storeCard}>
          <View style={styles.storeRow}><View style={[styles.storeIcon, { backgroundColor: C.paleAmber }]}><Ionicons name="storefront-outline" size={20} color={C.leaf} /></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.cardTitle}>{store.chainName}{store.branchName ? ` — ${store.branchName}` : ""}</Text><Text style={textStyles.secondary}>{store.address ?? "Endereço não informado"}{store.city ? ` · ${store.city}` : ""}</Text>{distance != null ? <Text style={styles.distance}>{distance.toFixed(1)} km</Text> : null}</View><IconButton icon={store.isFavorite ? "heart" : "heart-outline"} label={store.isFavorite ? "Remover favorito" : "Favoritar supermercado"} tint={store.isFavorite ? C.coral : C.leaf} onPress={() => { void toggleStoreFavorite(db, store.id).then(refresh); }} /></View>
          {hasRoute ? <SecondaryButton label="Abrir rota" icon="navigate" onPress={() => { void openDirections({ address: store.address, latitude: store.latitude, longitude: store.longitude }); }} /> : <Badge tone="neutral">Distância indisponível</Badge>}
        </Card>;
      })}</View> : null}

      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} /><View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Adicionar supermercado</Text><Text style={textStyles.secondary}>O endereço informado manualmente não será tratado como verificado; distância só aparece com coordenadas válidas.</Text><Field label="Nome da rede" value={chainName} onChangeText={setChainName} placeholder="Ex.: Mercado do Bairro" /><Field label="Unidade (opcional)" value={branchName} onChangeText={setBranchName} placeholder="Ex.: Centro" /><Field label="Endereço (opcional)" value={address} onChangeText={setAddress} placeholder="Rua, número e bairro" /><Field label="Cidade (opcional)" value={city} onChangeText={setCity} placeholder="Cidade" /><PrimaryButton label="Salvar neste aparelho" icon="checkmark" onPress={() => { void saveManualStore(); }} disabled={!chainName.trim()} /><SecondaryButton label="Cancelar" onPress={() => setModalVisible(false)} /></View></View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sourceCard: { backgroundColor: "#FFFCF5", borderColor: "#F0E6D2" },
  sourceHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  storeIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.paleAmber, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: C.leafDark, fontSize: 15, fontWeight: "800" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitle: { color: C.leafDark, fontSize: 16, fontWeight: "800" },
  storeCard: { gap: 12 },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  notice: { flexDirection: "row", gap: 7, alignItems: "flex-start", backgroundColor: C.paleAmber, padding: 10, borderRadius: 12 },
  noticeText: { flex: 1, color: "#76530F", fontSize: 12, lineHeight: 17 },
  locationSection: { gap: 12 },
  distance: { color: C.leaf, fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(24,48,39,0.28)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.cream, padding: 22, paddingBottom: 30, borderTopLeftRadius: 26, borderTopRightRadius: 26, gap: 14, maxHeight: "92%" },
  sheetHandle: { width: 42, height: 5, borderRadius: 5, backgroundColor: "#C7C9BD", alignSelf: "center", marginBottom: 2 },
  sheetTitle: { color: C.leafDark, fontSize: 21, fontWeight: "800" },
});
