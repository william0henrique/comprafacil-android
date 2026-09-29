import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppScreen, Badge, C, Card, EmptyState, Field, IconButton, PageHeading, PrimaryButton, SecondaryButton, textStyles } from "@/components/comprafacil-ui";
import { BarcodeScanner } from "@/components/barcode/BarcodeScanner";
import { formatBRL, isPriceStale, parseBRLToCents, type MeasurementUnit } from "@/lib/domain";
import { addExistingProductToList, addProductToList, changeItemQuantity, getAlertPreferences, getList, getListItems, getProduct, getProducts, getStores, saveManualPrice, selectListStore, toggleProductFavorite, type ListItem, type Product, type ShoppingList, type Store } from "@/lib/local-db";
import { notifyManualPriceThreshold, notifyRecordedPriceChange } from "@/lib/notifications";
import { aggregateProductPrices, type ProductPriceSummary } from "@/lib/barcode/price-aggregator";
import { cachePriceSummary } from "@/lib/barcode/product-cache";
import { lookupProductByBarcode, type ProductLookupResult } from "@/lib/barcode/product-lookup";
import { resolveProductImage } from "@/lib/barcode/product-image-resolver";
import { searchProductPrices } from "@/lib/barcode/price-search-service";

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
  const [scannerVisible, setScannerVisible] = useState(false);
  const [lookupModal, setLookupModal] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanProduct, setScanProduct] = useState<Product | null>(null);
  const [scanAddModal, setScanAddModal] = useState(false);
  const [scanQuantity, setScanQuantity] = useState("1");
  const [scanPriceSummary, setScanPriceSummary] = useState<ProductPriceSummary | null>(null);
  const scannerReturnToProductForm = useRef(false);

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
  const referenceCount = items.filter((item) => item.source === "derived_reference").length;
  const foundProduct = lookupResult?.status === "found" ? lookupResult.product : null;
  const foundProductImage = foundProduct ? resolveProductImage({ imageUrl: foundProduct.imageUrl, imageSource: foundProduct.imageSource, imageRightsVerified: foundProduct.imageRightsVerified }) : null;
  const scanStoreOffers = scanPriceSummary?.offers.filter((offer) => offer.sourceGroup === "primary" && offer.storeId) ?? [];
  const scanMarketplaceOffers = scanPriceSummary?.offers.filter((offer) => offer.sourceGroup === "marketplace") ?? [];

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
        sizeUnit: packageSize ? sizeUnit : null, category: category.trim(), barcode: manualBarcode.trim() || null,
        metadataSource: manualBarcode.trim() ? "manual-local" : null, quantity: qty,
      });
      setProductModal(false); setProductName(""); setBrand(""); setSize(""); setCategory(""); setManualBarcode(""); setQuantity("1"); setSizeUnit("un");
      await refresh();
    } catch (error) {
      Alert.alert("Não foi possível adicionar", error instanceof Error ? error.message : "Confira o nome, o tamanho e a quantidade.");
    } finally { setBusy(false); }
  }

  async function openProductPicker() {
    try {
      setCatalogProducts(await getProducts(db));
      setProductSearch("");
      setProductModal(false);
      setLookupModal(false);
      setProductPickerModal(true);
    } catch {
      Alert.alert("Meus produtos indisponíveis", "Não foi possível ler o catálogo local deste aparelho.");
    }
  }

  function beginBarcodeScan(fromProductForm = false) {
    scannerReturnToProductForm.current = fromProductForm;
    setProductModal(false);
    setScannerVisible(true);
  }

  function cancelBarcodeScan() {
    setScannerVisible(false);
    if (scannerReturnToProductForm.current) setProductModal(true);
    scannerReturnToProductForm.current = false;
  }

  async function handleBarcodeDetected(rawCode: string) {
    setScannerVisible(false);
    scannerReturnToProductForm.current = false;
    setLookupBusy(true);
    try {
      const result = await lookupProductByBarcode(db, rawCode);
      if (result.status === "invalid-code") {
        Alert.alert("Código de barras inválido", "Não foi possível validar o EAN/GTIN lido.", [
          { text: "Tentar novamente", onPress: () => beginBarcodeScan(false) },
          { text: "Adicionar manualmente", onPress: () => { setManualBarcode(""); setProductModal(true); } },
        ]);
        return;
      }
      setLookupResult(result);
      setLookupModal(true);
    } catch {
      Alert.alert("Busca local indisponível", "Não foi possível consultar o catálogo deste aparelho. Você ainda pode pesquisar produtos ou cadastrá-los manualmente.");
    } finally {
      setLookupBusy(false);
    }
  }

  function addNotFoundManually() {
    const barcode = lookupResult?.status === "not-found" ? lookupResult.barcode : "";
    setManualBarcode(barcode);
    setLookupModal(false);
    setProductModal(true);
  }

  async function confirmScannedProduct() {
    if (lookupResult?.status !== "found" || lookupBusy) return;
    setLookupBusy(true);
    setScanQuantity("1");
    try {
      const search = await searchProductPrices(db, lookupResult.product);
      const summary = aggregateProductPrices({
        id: lookupResult.product.id,
        barcode: lookupResult.product.barcode,
        name: lookupResult.product.name,
        brand: lookupResult.product.brand,
        sizeValue: lookupResult.product.sizeValue,
        sizeUnit: lookupResult.product.sizeUnit,
      }, search.offers, search.searchedAt);
      await cachePriceSummary(db, lookupResult.product.id, summary);
      setScanProduct(await getProduct(db, lookupResult.product.id) ?? lookupResult.product);
      setScanPriceSummary(summary);
      setLookupModal(false);
      setScanAddModal(true);
    } catch {
      const summary = aggregateProductPrices({
        id: lookupResult.product.id,
        barcode: lookupResult.product.barcode,
        name: lookupResult.product.name,
        brand: lookupResult.product.brand,
        sizeValue: lookupResult.product.sizeValue,
        sizeUnit: lookupResult.product.sizeUnit,
      }, [], new Date().toISOString());
      setScanProduct(lookupResult.product);
      setScanPriceSummary(summary);
      setLookupModal(false);
      setScanAddModal(true);
    } finally {
      setLookupBusy(false);
    }
  }

  async function addScannedProduct(storeId: string | null = null) {
    if (!scanProduct || busy) return;
    const qty = parsePositiveNumber(scanQuantity);
    if (!qty) { Alert.alert("Quantidade inválida", "Informe uma quantidade maior que zero."); return; }
    setBusy(true);
    try {
      if (storeId) await selectListStore(db, listId, storeId);
      const added = await addExistingProductToList(db, listId, scanProduct.id, qty);
      if (!added) throw new Error("O produto não existe mais no catálogo local.");
      setScanAddModal(false);
      setScanProduct(null);
      await refresh();
    } catch (error) {
      Alert.alert("Não foi possível adicionar", error instanceof Error ? error.message : "Tente novamente.");
    } finally { setBusy(false); }
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
        <View style={styles.storeSummaryRow}><View style={styles.storeMark}><Ionicons name="storefront-outline" size={20} color={C.leaf} /></View><View style={{ flex: 1 }}><Text style={styles.storeName}>{selectedStore ? `${selectedStore.chainName}${selectedStore.branchName ? ` — ${selectedStore.branchName}` : ""}` : "Nenhum supermercado selecionado"}</Text><Text style={textStyles.secondary}>{selectedStore ? "Usa o preço manual desta loja quando existe; outros itens podem usar uma referência identificada." : "Sem loja escolhida, usa a média dos preços manuais disponíveis; isso não é uma cotação de supermercado."}</Text></View><Pressable onPress={() => setStoreModal(true)}><Text style={styles.link}>{selectedStore ? "Trocar" : "Escolher"}</Text></Pressable></View>
        <View style={styles.totalRow}><View><Text style={styles.totalCaption}>{referenceCount ? "Subtotal parcial estimado" : "Subtotal parcial"}</Text><Text style={styles.totalValue}>{formatBRL(pricedCount ? totalCents : null)}</Text></View><View style={{ alignItems: "flex-end", gap: 4 }}><Badge tone={missingCount ? "amber" : "green"}>{missingCount} sem preço</Badge><Text style={styles.pricedCount}>{pricedCount} de {items.length} com preço</Text></View></View>
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
              {item.priceCents != null ? <><Text style={styles.itemPrice}>{formatBRL(item.priceCents)}{item.quantity !== 1 ? ` · ${formatBRL(Math.round(item.priceCents * item.quantity))}` : ""}</Text><Text style={styles.source}>{item.sourceLabel ?? "Fonte não informada"} · {dateLabel(item.observedAt)}</Text></> : <Text style={styles.noPrice}>Preço não disponível: nenhuma fonte compatível</Text>}
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
        <View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => setStoreModal(false)} /><View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Supermercado da lista</Text><Text style={textStyles.secondary}>O preço manual desta loja tem prioridade; quando faltar, um preço de referência aparece identificado e não é atribuído à filial.</Text><SecondaryButton label="Sem supermercado selecionado" icon="close-circle-outline" onPress={() => { void selectListStore(db, listId, null).then(() => { setStoreModal(false); return refresh(); }); }} />{stores.map((store) => <Pressable key={store.id} style={styles.storeOption} onPress={() => { void selectListStore(db, listId, store.id).then(() => { setStoreModal(false); return refresh(); }); }}><View style={styles.storeMark}><Ionicons name="storefront-outline" size={19} color={C.leaf} /></View><View style={{ flex: 1 }}><Text style={styles.storeName}>{store.chainName}{store.branchName ? ` — ${store.branchName}` : ""}</Text><Text style={textStyles.secondary}>{store.address ?? (store.chainId === "superluna-public-index" ? "Endereço não confirmado" : "Sem endereço")}</Text></View>{list.selectedStoreId === store.id ? <Ionicons name="checkmark-circle" size={22} color={C.leaf} /> : null}</Pressable>)}</View></View>
      </Modal>

      <Modal transparent visible={productModal} animationType="slide" onRequestClose={() => setProductModal(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProductModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <ScrollView style={styles.productFormScroll} contentContainerStyle={styles.productFormContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>Adicionar produto</Text>
              <Text style={textStyles.secondary}>Tamanho e unidade evitam confundir, por exemplo, arroz de 1 kg com 5 kg. O catálogo externo não tem fonte autorizada ativa; pesquisa por nome usa seus produtos locais.</Text>
              <PrimaryButton label="Pesquisar produto" icon="search-outline" onPress={() => { void openProductPicker(); }} />
              <SecondaryButton label="Escanear código de barras" icon="barcode-outline" onPress={() => beginBarcodeScan(true)} />
              <Field label="Produto" value={productName} onChangeText={setProductName} placeholder="Ex.: Arroz branco" autoCapitalize="sentences" />
              <Field label="Marca (opcional)" value={brand} onChangeText={setBrand} placeholder="Ex.: Marca" />
              <View style={styles.sizeRow}>
                <View style={{ flex: 1 }}><Field label="Tamanho (opcional)" value={size} onChangeText={setSize} placeholder="Ex.: 1" keyboardType="decimal-pad" /></View>
                <View style={{ flex: 1, gap: 7 }}><Text style={styles.fieldLabel}>Unidade</Text><View style={styles.unitRow}>{UNITS.map((unit) => <Pressable key={unit} onPress={() => setSizeUnit(unit)} style={[styles.unitChip, sizeUnit === unit && styles.unitChipSelected]}><Text style={[styles.unitText, sizeUnit === unit && { color: C.paper }]}>{unit}</Text></Pressable>)}</View></View>
              </View>
              <Field label="Categoria (opcional)" value={category} onChangeText={setCategory} placeholder="Ex.: Mercearia" />
              <Field label="EAN/código de barras (opcional)" value={manualBarcode} onChangeText={setManualBarcode} placeholder="8, 12, 13 ou 14 dígitos" keyboardType="numeric" maxLength={14} autoCapitalize="none" helper="O código é validado; produtos com EAN diferente não são unidos." />
              <Field label="Quantidade" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="1" helper="Você pode usar quantidades fracionárias, como 0,5." />
              <PrimaryButton label={busy ? "Salvando…" : "Adicionar à lista"} icon="add" disabled={!productName.trim() || !parsePositiveNumber(quantity) || Boolean(size.trim() && !parsePositiveNumber(size)) || busy} onPress={() => { void addProduct(); }} />
              <SecondaryButton label="Cancelar" onPress={() => setProductModal(false)} />
            </ScrollView>
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

      <BarcodeScanner visible={scannerVisible} onCancel={cancelBarcodeScan} onDetected={(code) => { void handleBarcodeDetected(code); }} />

      <Modal transparent visible={lookupModal} animationType="fade" onRequestClose={() => setLookupModal(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            {foundProduct ? <ScrollView style={styles.confirmScroll} contentContainerStyle={styles.confirmContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>Encontramos este produto</Text>
              {foundProductImage ? <Image source={{ uri: foundProductImage }} style={styles.productImage} resizeMode="contain" /> : <View style={styles.noProductImage}><Ionicons name="image-outline" size={25} color={C.muted} /><Text style={textStyles.secondary}>Imagem não disponível em fonte com direitos confirmados.</Text></View>}
              <Text style={styles.productName}>{foundProduct.name}</Text>
              <Text style={textStyles.secondary}>{[foundProduct.brand, foundProduct.sizeValue != null && foundProduct.sizeUnit ? `${foundProduct.sizeValue} ${foundProduct.sizeUnit}` : "Tamanho não informado", foundProduct.category].filter(Boolean).join(" · ")}</Text>
              {foundProduct.description ? <Text style={textStyles.secondary}>{foundProduct.description}</Text> : null}
              {foundProductImage ? <Text style={textStyles.secondary}>Origem da imagem: {foundProduct.imageSource ?? "direitos de exibição confirmados; URL de origem indisponível"}</Text> : null}
              <Text style={styles.fieldLabel}>EAN: {foundProduct.barcode ?? "Não informado"}</Text>
              <Badge tone="neutral">{lookupResult?.status === "found" ? lookupResult.sourceLabel : "Catálogo local"}</Badge>
              <Text style={textStyles.secondary}>{foundProduct.metadataSource === "manual-local" ? "Informação cadastrada manualmente neste aparelho." : foundProduct.metadataSource ?? "A origem externa não está disponível."}</Text>
              {lookupResult?.status === "found" && !lookupResult.cacheFresh ? <Badge tone="amber">Cache expirado; sem fonte autorizada ativa para atualizar.</Badge> : null}
              <Text style={textStyles.secondary}>É este produto? Depois da confirmação, serão consultados somente os preços reais salvos neste aparelho.</Text>
              <PrimaryButton label={lookupBusy ? "Consultando preços…" : "Sim, adicionar"} icon="checkmark" disabled={lookupBusy} onPress={() => { void confirmScannedProduct(); }} />
              <SecondaryButton label="Não, pesquisar novamente" icon="scan-outline" onPress={() => { setLookupModal(false); setLookupResult(null); beginBarcodeScan(false); }} />
            </ScrollView> : lookupResult?.status === "not-found" ? <View style={styles.confirmContent}>
              <Text style={styles.sheetTitle}>Não encontramos esse código de barras.</Text>
              <Text style={textStyles.secondary}>EAN: {lookupResult.barcode}. O catálogo local não contém esse produto e nenhuma fonte externa de metadados está autorizada/ativa nesta versão. Nenhum produto, imagem ou preço será inventado.</Text>
              <PrimaryButton label="Pesquisar pelo nome" icon="search-outline" onPress={() => { void openProductPicker(); }} />
              <SecondaryButton label="Adicionar produto manualmente" icon="create-outline" onPress={addNotFoundManually} />
              <SecondaryButton label="Tentar novamente" icon="scan-outline" onPress={() => { setLookupModal(false); setLookupResult(null); beginBarcodeScan(false); }} />
            </View> : <View style={styles.confirmContent}><Text style={styles.sheetTitle}>Busca de produto</Text><Text style={textStyles.secondary}>{lookupBusy ? "Consultando o catálogo local…" : "Nenhum resultado local disponível."}</Text><SecondaryButton label="Pesquisar pelo nome" icon="search-outline" onPress={() => { void openProductPicker(); }} /><SecondaryButton label="Adicionar manualmente" icon="create-outline" onPress={addNotFoundManually} /><SecondaryButton label="Fechar" onPress={() => setLookupModal(false)} /></View>}
          </View>
        </View>
      </Modal>

      <Modal transparent visible={scanAddModal} animationType="slide" onRequestClose={() => setScanAddModal(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setScanAddModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <ScrollView style={styles.productFormScroll} contentContainerStyle={styles.productFormContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>Adicionar à lista</Text>
              {scanProduct ? <>
                <Text style={styles.productName}>{scanProduct.name}</Text>
                <Text style={textStyles.secondary}>{[scanProduct.brand, scanProduct.sizeValue != null && scanProduct.sizeUnit ? `${scanProduct.sizeValue} ${scanProduct.sizeUnit}` : "Tamanho não informado", scanProduct.barcode ? `EAN ${scanProduct.barcode}` : null].filter(Boolean).join(" · ")}</Text>
              </> : null}
              {scanPriceSummary?.sourceCount ? <>
                <Card style={styles.scanPriceCard}>
                  <Text style={styles.scanPriceHeading}>Resumo de preços compatíveis</Text>
                  <Text style={textStyles.secondary}>Média encontrada: {formatBRL(scanPriceSummary.averagePriceCents)} · menor: {formatBRL(scanPriceSummary.lowestPriceCents)} · maior: {formatBRL(scanPriceSummary.highestPriceCents)}</Text>
                  <Text style={styles.scanReference}>Preço de referência: {formatBRL(scanPriceSummary.referencePriceCents)}</Text>
                  <Text style={textStyles.secondary}>{scanPriceSummary.sourceCount} {scanPriceSummary.sourceCount === 1 ? "preço encontrado" : "preços encontrados"} · consultado {dateLabel(scanPriceSummary.searchedAt)}</Text>
                  <Text style={textStyles.secondary}>Preços manuais salvos localmente. Nenhuma fonte automática autorizada está ativa.</Text>
                </Card>
                {scanStoreOffers.length ? <View style={{ gap: 7 }}><Text style={styles.fieldLabel}>Supermercados (preços manuais confirmáveis)</Text>{scanStoreOffers.map((offer, index) => <Pressable key={`${offer.productId}-${offer.storeId}-${index}`} style={styles.storeOfferRow} onPress={() => { if (offer.storeId) void addScannedProduct(offer.storeId); }}><View style={{ flex: 1 }}><Text style={styles.storeName}>{offer.storeName ?? "Supermercado"}</Text><Text style={textStyles.secondary}>Informado manualmente · {dateLabel(offer.observedAt)}</Text></View><Text style={styles.priceValue}>{formatBRL(offer.priceCents)}</Text><Ionicons name="chevron-forward" size={18} color={C.leaf} /></Pressable>)}</View> : null}
                {scanMarketplaceOffers.length ? <View style={styles.marketplaceNote}><Text style={styles.scanPriceHeading}>Mercado Livre · marketplace, não supermercado</Text>{scanMarketplaceOffers.map((offer, index) => <Text key={`${offer.productId}-market-${index}`} style={textStyles.secondary}>{offer.sourceLabel}: {formatBRL(offer.priceCents)}</Text>)}</View> : null}
              </> : <Card style={styles.scanPriceCard}><Text style={styles.scanPriceHeading}>Preço: não disponível</Text><Text style={textStyles.secondary}>Não há preço compatível para este produto nas fontes locais. Você pode adicioná-lo mesmo assim, sem valor fictício.</Text><Text style={textStyles.secondary}>Consulta {scanPriceSummary ? dateLabel(scanPriceSummary.searchedAt) : "local"}; nenhuma fonte automática autorizada está ativa.</Text></Card>}
              {scanPriceSummary?.sourceCount ? <Text style={textStyles.secondary}>Se não escolher uma loja acima, a referência média será usada somente como estimativa; ela não representa uma cotação de supermercado.</Text> : null}
              <View style={styles.quantityControl}>
                <Pressable accessibilityRole="button" accessibilityLabel="Diminuir quantidade" style={styles.stepper} onPress={() => setScanQuantity((value) => String(Math.max(1, (parsePositiveNumber(value) ?? 1) - 1)))}><Ionicons name="remove" size={19} color={C.leaf} /></Pressable>
                <Text style={styles.quantity}>{scanQuantity.replace(".", ",")}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Aumentar quantidade" style={styles.stepper} onPress={() => setScanQuantity((value) => String((parsePositiveNumber(value) ?? 1) + 1))}><Ionicons name="add" size={19} color={C.leaf} /></Pressable>
              </View>
              <Field label="Quantidade" value={scanQuantity} onChangeText={setScanQuantity} keyboardType="decimal-pad" helper="Subtotal é calculado automaticamente: quantidade × preço disponível." />
              <Text style={styles.scanReference}>{scanPriceSummary?.referencePriceCents != null ? `Subtotal de referência: ${formatBRL(Math.round(scanPriceSummary.referencePriceCents * (parsePositiveNumber(scanQuantity) ?? 1)))}.` : "Sem preço elegível, o item será adicionado sem subtotal."}</Text>
              <PrimaryButton label={busy ? "Adicionando…" : scanPriceSummary?.referencePriceCents != null ? "Usar referência e adicionar" : "Adicionar sem preço"} icon="add" disabled={!scanProduct || !parsePositiveNumber(scanQuantity) || busy} onPress={() => { void addScannedProduct(null); }} />
              <SecondaryButton label="Cancelar" onPress={() => setScanAddModal(false)} />
            </ScrollView>
          </View>
        </View>
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
  confirmCard: { backgroundColor: C.cream, padding: 22, borderRadius: 22, gap: 13, maxHeight: "90%" },
  confirmScroll: { flexShrink: 1 },
  confirmContent: { gap: 12 },
  productFormScroll: { flexShrink: 1 },
  productFormContent: { gap: 13, paddingBottom: 10 },
  productImage: { width: "100%", height: 128, borderRadius: 18, backgroundColor: C.paper },
  noProductImage: { minHeight: 86, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.paper, borderRadius: 18, padding: 14 },
  scanPriceCard: { gap: 7, backgroundColor: C.paper },
  scanPriceHeading: { color: C.leafDark, fontSize: 15, fontWeight: "800" },
  scanReference: { color: C.leafDark, fontSize: 13, fontWeight: "800" },
  priceValue: { color: C.leafDark, fontSize: 15, fontWeight: "900" },
  storeOfferRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: C.paper, borderRadius: 15, paddingVertical: 10, paddingHorizontal: 12 },
  marketplaceNote: { gap: 6, backgroundColor: C.paleAmber, borderRadius: 16, padding: 12 },
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
