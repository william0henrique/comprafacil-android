import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppScreen, Badge, C, Card, EmptyState, Field, IconButton, PageHeading, PrimaryButton, SecondaryButton, textStyles } from "@/components/comprafacil-ui";
import { formatBRL, isPriceStale, parseBRLToCents, type MeasurementUnit } from "@/lib/domain";
import { addExistingProductToList, addProductToList, changeItemQuantity, getAlertPreferences, getList, getListItems, getProducts, getStores, saveManualPrice, selectListStore, toggleProductFavorite, type ListItem, type Product, type ShoppingList, type Store } from "@/lib/local-db";
import { notifyManualPriceThreshold, notifyRecordedPriceChange } from "@/lib/notifications";

const UNITS: MeasurementUnit[] = ["kg", "g", "l", "ml", "un"];

function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function dateLabel(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = Array.isArray(id) ? id[0] : id ?? "";
  const db = useSQLiteContext();
  const router = useRouter();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeModal, setStoreModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [productPickerModal, setProductPickerModal] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [priceModal, setPriceModal] = useState(false);
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [sizeUnit, setSizeUnit] = useState<MeasurementUnit>("un");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [priceProduct, setPriceProduct] = useState<ListItem | null>(null);
  const [priceStoreId, setPriceStoreId] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [confirmRemoveItem, setConfirmRemoveItem] = useState<ListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!listId) return;
    const [nextList, nextItems, nextStores] = await Promise.all([getList(db, listId), getListItems(db, listId), getStores(db)]);
    setList(nextList); setItems(nextItems); setStores(nextStores);
  }, [db, listId]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const selectedStore = useMemo(() => stores.find((store) => store.id === list?.selectedStoreId) ?? null, [stores, list?.selectedStoreId]);
  const missingCount = items.filter((item) => item.priceCents == null).length;
  const pricedCount = items.length - missingCount;
  const totalCents = items.reduce((sum, item) => sum + (item.priceCents == null ? 0 : Math.round(item.priceCents * item.quantity)), 0);

  const filteredCatalogProducts = useMemo(() => {
    const needle = productSearch.trim().toLocaleLowerCase("pt-BR");
    if (!needle) return catalogProducts;
    return catalogProducts.filter((product) => `${product.name} ${product.brand ?? ""} ${product.category ?? ""} ${product.sizeValue ?? ""} ${product.sizeUnit ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle));
  }, [catalogProducts, productSearch]);

  async function addProduct() {
    const qty = parsePositiveNumber(quantity);
    const packageSize = size.trim() ? parsePositiveNumber(size) : null;
    if (!productName.trim() || !qty || (size.trim() && !packageSize) || busy) return;
    setBusy(true);
    try {
      await addProductToList(db, listId, {
        name: productName.trim(), brand: brand.trim(), sizeValue: packageSize,
        sizeUnit: packageSize ? sizeUnit : null, category: category.trim(), quantity: qty,
      });
      setProductModal(false); setProductName(""); setBrand(""); setSize(""); setCategory(""); setQuantity("1"); setSizeUnit("un");
      await refresh();
    } catch {
      Alert.alert("Não foi possível adicionar", "Confira o nome, o tamanho e a quantidade.");
    } finally { setBusy(false); }
  }

  async function openProductPicker() {
    try {
      setCatalogProducts(await getProducts(db));
      setProductSearch("");
      setProductModal(false);
      setProductPickerModal(true);
    } catch {
      Alert.alert("Meus produtos indisponíveis", "Não foi possível ler o catálogo local deste aparelho.");
    }
  }

  async function addExistingProduct(product: Product) {
    const qty = parsePositiveNumber(quantity);
    if (!qty || busy) return;
    setBusy(true);
    try {
      const added = await addExistingProductToList(db, listId, product.id, qty);
      if (!added) {
        Alert.alert("Produto não encontrado", "Atualize Meus produtos e tente novamente.");
        return;
      }
      setProductPickerModal(false);
      setProductModal(false);
      setProductName(""); setBrand(""); setSize(""); setCategory(""); setQuantity("1"); setSizeUnit("un");
      await refresh();
    } catch {
      Alert.alert("Não foi possível adicionar", "Confira a quantidade e tente novamente.");
    } finally { setBusy(false); }
  }

  function openPrice(item: ListItem) {
    setPriceProduct(item); setPriceInput(""); setPriceStoreId(list?.selectedStoreId ?? ""); setPriceModal(true);
  }

  async function savePrice() {
    if (!priceProduct || !priceStoreId || busy) return;
    const cents = parseBRLToCents(priceInput);
    if (cents == null) { Alert.alert("Preço inválido", "Informe um valor maior que zero, por exemplo R$ 12,90."); return; }
    const store = stores.find((candidate) => candidate.id === priceStoreId);
    if (!store) return;
    const storeName = store.branchName ? `${store.chainName} — ${store.branchName}` : store.chainName;
    setBusy(true);
    try {
      const result = await saveManualPrice(db, { productId: priceProduct.productId, storeId: store.id, priceCents: cents, productName: priceProduct.productName, storeName });
      await selectListStore(db, listId, store.id);
      const alertPreferences = await getAlertPreferences(db);
      if (result.changed && result.oldPriceCents != null) {
        const direction = cents < result.oldPriceCents ? "caiu" : "subiu";
        const key = direction === "caiu" ? "price_drop" : "price_rise";
        const preference = alertPreferences.find((item) => item.key === key);
        await notifyRecordedPriceChange({
          productName: priceProduct.productName,
          storeName,
          oldPrice: formatBRL(result.oldPriceCents),
          newPrice: formatBRL(cents),
          direction,
          enabled: Boolean(preference?.enabled),
        }).catch(() => undefined);
      }
      if (result.thresholdCrossed && result.thresholdCents != null) {
        await notifyManualPriceThreshold({
          productName: priceProduct.productName,
          storeName,
          price: formatBRL(cents),
          threshold: formatBRL(result.thresholdCents),
          enabled: Boolean(alertPreferences.find((item) => item.key === "threshold")?.enabled),
        }).catch(() => undefined);
      }
      setPriceModal(false);
      await refresh();
      Alert.alert(result.changed ? "Preço e histórico atualizados" : "Preço manual registrado", "Este valor foi informado por você e não foi verificado pelo supermercado.");
    } catch {
      Alert.alert("Não foi possível salvar o preço", "O dado continua local; tente novamente.");
    } finally { setBusy(false); }
  }

  async function confirmRemove() {
    const target = confirmRemoveItem;
    setConfirmRemoveItem(null);
    if (!target) return;
    await changeItemQuantity(db, listId, target.id, -1);
    await refresh();
  }

  if (!list) return <AppScreen><EmptyState title="Lista não encontrada" body="Ela pode ter sido excluída deste aparelho." action={<SecondaryButton label="Voltar às listas" onPress={() => router.replace("/(tabs)/lists")} />} /></AppScreen>;

  return (
    <AppScreen>
      <PageHeading title={list.name} subtitle="Lista salva apenas neste aparelho." action={<IconButton icon="storefront-outline" label="Selecionar supermercado" onPress={() => setStoreModal(true)} />} />
      <Card style={styles.storeSummary}>
        <View style={styles.storeSummaryRow}><View style={styles.storeMark}><Ionicons name="storefront-outline" size={20} color={C.leaf} /></View><View style={{ flex: 1 }}><Text style={styles.storeName}>{selectedStore ? `${selectedStore.chainName}${selectedStore.branchName ? ` — ${selectedStore.branchName}` : ""}` : "Nenhum supermercado selecionado"}</Text><Text style={textStyles.secondary}>{selectedStore ? "O subtotal usa apenas valores registrados para esta loja." : "Selecione uma loja para ver subtotal e preços por produto."}</Text></View><Pressable onPress={() => setStoreModal(true)}><Text style={styles.link}>{selectedStore ? "Trocar" : "Escolher"}</Text></Pressable></View>
        <View style={styles.totalRow}><View><Text style={styles.totalCaption}>Subtotal registrado</Text><Text style={styles.totalValue}>{formatBRL(pricedCount ? totalCents : null)}</Text></View><View style={{ alignItems: "flex-end", gap: 4 }}><Badge tone={missingCount ? "amber" : "green"}>{missingCount} sem preço</Badge><Text style={styles.pricedCount}>{pricedCount} de {items.length} com preço</Text></View></View>
      </Card>
      <View style={styles.actionsRow}><PrimaryButton label="Adicionar produto" icon="add" onPress={() => setProductModal(true)} style={{ flex: 1 }} /><SecondaryButton label="Comparar" icon="git-compare-outline" onPress={() => router.push({ pathname: "/lists/[id]/compare", params: { id: listId } })} /></View>

      {items.length === 0 ? <Card><EmptyState icon="basket-outline" title="Sua lista está vazia" body="Adicione um produto e indique a quantidade. O preço é opcional e nunca será inventado." action={<PrimaryButton label="Adicionar primeiro produto" icon="add" onPress={() => setProductModal(true)} />} /></Card> : items.map((item) => {
        const stale = item.observedAt ? isPriceStale(item.observedAt) : false;
        return <Card key={item.id} style={styles.itemCard}>
          <View style={styles.itemHead}>
            <Pressable style={{ flex: 1, gap: 4 }} onPress={() => router.push({ pathname: "/products/[id]", params: { id: item.productId } })}>
              <Text style={styles.productName}>{item.productName}</Text>
              <Text style={textStyles.secondary}>{[item.brand, item.sizeValue != null && item.sizeUnit ? `${item.sizeValue} ${item.sizeUnit}` : "Tamanho não informado"].filter(Boolean).join(" · ")}</Text>
            </Pressable>
            <IconButton icon={item.isFavorite ? "heart" : "heart-outline"} label={item.isFavorite ? "Remover dos favoritos" : "Favoritar produto"} tint={item.isFavorite ? C.coral : C.leaf} onPress={() => { void toggleProductFavorite(db, item.productId).then(refresh); }} />
          </View>
          <View style={styles.itemLower}>
            <View style={styles.quantityControl}>
              <Pressable accessibilityRole="button" accessibilityLabel="Diminuir quantidade" style={styles.stepper} onPress={() => {
                if (item.quantity <= 1) setConfirmRemoveItem(item);
                else void changeItemQuantity(db, listId, item.id, -1).then(refresh);
              }}><Ionicons name="remove" size={19} color={C.leaf} /></Pressable>
              <Text style={styles.quantity}>{String(item.quantity).replace(".", ",")}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Aumentar quantidade" style={styles.stepper} onPress={() => { void changeItemQuantity(db, listId, item.id, 1).then(refresh); }}><Ionicons name="add" size={19} color={C.leaf} /></Pressable>
            </View>
            <View style={{ alignItems: "flex-end", flex: 1 }}>
              {item.priceCents != null ? <><Text style={styles.itemPrice}>{formatBRL(item.priceCents)}{item.quantity !== 1 ? ` · ${formatBRL(Math.round(item.priceCents * item.quantity))}` : ""}</Text><Text style={styles.source}>{item.sourceLabel ?? "Fonte não informada"} · {dateLabel(item.observedAt)}</Text></> : <Text style={styles.noPrice}>{selectedStore ? "Preço não registrado nesta loja" : "Selecione uma loja para ver preço"}</Text>}
              {stale ? <Badge tone="amber">Atualização antiga</Badge> : null}
            </View>
          </View>
          <SecondaryButton label={item.priceCents == null ? "Registrar preço manual" : "Atualizar preço manual"} icon="create-outline" onPress={() => openPrice(item)} />
        </Card>;
      })}

      {items.length ? <PrimaryButton label="Comparar lista entre supermercados" icon="git-compare-outline" onPress={() => router.push({ pathname: "/lists/[id]/compare", params: { id: listId } })} /> : null}

      <Modal transparent visible={confirmRemoveItem != null} animationType="fade" onRequestClose={() => setConfirmRemoveItem(null)}>
        <View style={styles.confirmBackdrop}><View style={styles.confirmCard}><Text style={styles.sheetTitle}>Remover produto?</Text><Text style={textStyles.secondary}>Deseja tirar “{confirmRemoveItem?.productName}” desta lista?</Text><SecondaryButton label="Cancelar" onPress={() => setConfirmRemoveItem(null)} /><SecondaryButton label="Remover produto" icon="trash-outline" danger onPress={() => { void confirmRemove(); }} /></View></View>
      </Modal>

      <Modal transparent visible={storeModal} animationType="slide" onRequestClose={() => setStoreModal(false)}>
        <View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => setStoreModal(false)} /><View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Supermercado da lista</Text><Text style={textStyles.secondary}>O total inclui somente preços registrados para a loja escolhida.</Text><SecondaryButton label="Sem supermercado selecionado" icon="close-circle-outline" onPress={() => { void selectListStore(db, listId, null).then(() => { setStoreModal(false); return refresh(); }); }} />{stores.map((store) => <Pressable key={store.id} style={styles.storeOption} onPress={() => { void selectListStore(db, listId, store.id).then(() => { setStoreModal(false); return refresh(); }); }}><View style={styles.storeMark}><Ionicons name="storefront-outline" size={19} color={C.leaf} /></View><View style={{ flex: 1 }}><Text style={styles.storeName}>{store.chainName}{store.branchName ? ` — ${store.branchName}` : ""}</Text><Text style={textStyles.secondary}>{store.address ?? (store.chainId === "superluna-public-index" ? "Endereço não confirmado" : "Sem endereço")}</Text></View>{list.selectedStoreId === store.id ? <Ionicons name="checkmark-circle" size={22} color={C.leaf} /> : null}</Pressable>)}</View></View>
      </Modal>

      <Modal transparent visible={productModal} animationType="slide" onRequestClose={() => setProductModal(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProductModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Adicionar produto</Text>
            <Text style={textStyles.secondary}>Tamanho e unidade evitam confundir, por exemplo, arroz de 1 kg com 5 kg. Produtos sem tamanho não são unidos automaticamente.</Text>
            <SecondaryButton label="Escolher produto já cadastrado" icon="search-outline" onPress={() => { void openProductPicker(); }} />
            <Field label="Produto" value={productName} onChangeText={setProductName} placeholder="Ex.: Arroz branco" autoCapitalize="sentences" />
            <Field label="Marca (opcional)" value={brand} onChangeText={setBrand} placeholder="Ex.: Marca" />
            <View style={styles.sizeRow}>
              <View style={{ flex: 1 }}><Field label="Tamanho (opcional)" value={size} onChangeText={setSize} placeholder="Ex.: 1" keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1, gap: 7 }}><Text style={styles.fieldLabel}>Unidade</Text><View style={styles.unitRow}>{UNITS.map((unit) => <Pressable key={unit} onPress={() => setSizeUnit(unit)} style={[styles.unitChip, sizeUnit === unit && styles.unitChipSelected]}><Text style={[styles.unitText, sizeUnit === unit && { color: C.paper }]}>{unit}</Text></Pressable>)}</View></View>
            </View>
            <Field label="Categoria (opcional)" value={category} onChangeText={setCategory} placeholder="Ex.: Mercearia" />
            <Field label="Quantidade" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="1" helper="Você pode usar quantidades fracionárias, como 0,5." />
            <PrimaryButton label={busy ? "Salvando…" : "Adicionar à lista"} icon="add" disabled={!productName.trim() || !parsePositiveNumber(quantity) || Boolean(size.trim() && !parsePositiveNumber(size)) || busy} onPress={() => { void addProduct(); }} />
            <SecondaryButton label="Cancelar" onPress={() => setProductModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal transparent visible={productPickerModal} animationType="slide" onRequestClose={() => setProductPickerModal(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProductPickerModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Meus produtos</Text>
            <Text style={textStyles.secondary}>Escolha um produto local. Se ele já estiver na lista, a quantidade será somada.</Text>
            <Field label="Buscar produto cadastrado" value={productSearch} onChangeText={setProductSearch} placeholder="Nome, marca, categoria ou tamanho" />
            <Field label="Quantidade" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="1" helper="Você pode usar quantidades fracionárias, como 0,5." />
            <ScrollView style={styles.productPickerList} keyboardShouldPersistTaps="handled">
              {!catalogProducts.length ? <EmptyState icon="cube-outline" title="Ainda sem produtos cadastrados" body="Adicione um produto manualmente; ele ficará disponível aqui para outras listas." /> : !filteredCatalogProducts.length ? <EmptyState icon="search-outline" title="Nenhum resultado" body="Tente outro nome, marca ou tamanho." /> : filteredCatalogProducts.map((product) => {
                const alreadyInList = items.some((item) => item.productId === product.id);
                return <Pressable key={product.id} accessibilityRole="button" style={styles.productOption} onPress={() => { void addExistingProduct(product); }}>
                  <View style={styles.storeMark}><Ionicons name="cube-outline" size={19} color={C.leaf} /></View>
                  <View style={{ flex: 1, gap: 3 }}><Text style={styles.storeName}>{product.name}</Text><Text style={textStyles.secondary}>{[product.brand, product.sizeValue != null && product.sizeUnit ? `${product.sizeValue} ${product.sizeUnit}` : "Tamanho não informado", product.category].filter(Boolean).join(" · ")}</Text><Text style={styles.pricedCount}>{alreadyInList ? "Na lista: a quantidade será somada" : "Toque para adicionar"}</Text></View>
                  <Ionicons name="add-circle-outline" size={22} color={C.leaf} />
                </Pressable>;
              })}
            </ScrollView>
            <SecondaryButton label="Voltar para cadastro manual" icon="create-outline" onPress={() => { setProductPickerModal(false); setProductModal(true); }} />
          </View>
        </View>
      </Modal>

      <Modal transparent visible={priceModal} animationType="slide" onRequestClose={() => setPriceModal(false)}>
        <View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => setPriceModal(false)} /><View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Registrar preço manual</Text><Text style={textStyles.secondary}>{priceProduct?.productName}. O registro é informado por você; não é uma cotação verificada pelo supermercado.</Text><Text style={styles.fieldLabel}>Supermercado/unidade</Text><View style={styles.storePicker}>{stores.map((store) => <Pressable key={store.id} onPress={() => setPriceStoreId(store.id)} style={[styles.storeChip, priceStoreId === store.id && styles.storeChipSelected]}><Text style={[styles.storeChipText, priceStoreId === store.id && { color: C.paper }]}>{store.chainName}{store.branchName ? ` — ${store.branchName}` : ""}</Text></Pressable>)}</View><Field label="Preço por embalagem (R$)" value={priceInput} onChangeText={setPriceInput} placeholder="12,90" keyboardType="decimal-pad" helper="O tamanho do produto fica associado a este registro." /><PrimaryButton label={busy ? "Salvando…" : "Salvar preço e histórico"} icon="checkmark" disabled={!priceStoreId || parseBRLToCents(priceInput) == null || busy} onPress={() => { void savePrice(); }} /><SecondaryButton label="Cancelar" onPress={() => setPriceModal(false)} /></View></View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  storeSummary: { backgroundColor: C.paleGreen, borderColor: "#DDE8D6" },
  storeSummaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  storeMark: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.paper, alignItems: "center", justifyContent: "center" },
  storeName: { color: C.leafDark, fontSize: 14, fontWeight: "800" },
  link: { color: C.leaf, fontSize: 13, fontWeight: "800" },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D2DFCB", paddingTop: 12, marginTop: 3 },
  totalCaption: { color: C.muted, fontSize: 12 },
  totalValue: { color: C.leafDark, fontSize: 23, fontWeight: "900", marginTop: 3 },
  pricedCount: { color: C.muted, fontSize: 11 },
  actionsRow: { flexDirection: "row", gap: 9 },
  itemCard: { gap: 12 },
  itemHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  productName: { color: C.leafDark, fontSize: 16, fontWeight: "800" },
  itemLower: { borderTopColor: C.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  quantityControl: { flexDirection: "row", alignItems: "center", backgroundColor: C.paleGreen, borderRadius: 14, minHeight: 42 },
  stepper: { width: 40, height: 42, alignItems: "center", justifyContent: "center" },
  quantity: { minWidth: 22, textAlign: "center", color: C.leafDark, fontWeight: "800", fontSize: 15 },
  itemPrice: { color: C.leafDark, fontSize: 15, fontWeight: "800" },
  source: { color: C.muted, fontSize: 10, marginTop: 3, textAlign: "right" },
  noPrice: { color: C.muted, fontSize: 12, textAlign: "right" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(24,48,39,0.28)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.cream, paddingHorizontal: 21, paddingTop: 14, paddingBottom: 30, borderTopLeftRadius: 26, borderTopRightRadius: 26, gap: 13, maxHeight: "94%" },
  sheetHandle: { width: 42, height: 5, borderRadius: 5, backgroundColor: "#C7C9BD", alignSelf: "center", marginBottom: 3 },
  sheetTitle: { color: C.leafDark, fontSize: 21, fontWeight: "800" },
  confirmBackdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(24,48,39,0.35)" },
  confirmCard: { backgroundColor: C.cream, padding: 22, borderRadius: 22, gap: 13 },
  storeOption: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingVertical: 7 },
  sizeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  fieldLabel: { color: C.leafDark, fontSize: 13, fontWeight: "700" },
  unitRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  unitChip: { minWidth: 35, height: 31, borderRadius: 11, backgroundColor: C.paper, borderColor: C.border, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unitChipSelected: { backgroundColor: C.leaf, borderColor: C.leaf },
  unitText: { color: C.muted, fontSize: 11, fontWeight: "800" },
  storePicker: { flexDirection: "row", flexWrap: "wrap", gap: 7, maxHeight: 160 },
  productPickerList: { maxHeight: 300 },
  productOption: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingVertical: 8 },
  storeChip: { borderWidth: 1, borderColor: C.border, backgroundColor: C.paper, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12, maxWidth: "100%" },
  storeChipSelected: { backgroundColor: C.leaf, borderColor: C.leaf },
  storeChipText: { color: C.leafDark, fontSize: 12, fontWeight: "700" },
  emptyState: { paddingVertical: 4 },
});
