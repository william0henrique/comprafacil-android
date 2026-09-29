import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { AppScreen, Badge, C, Card, EmptyState, IconButton, PageHeading, SecondaryButton, textStyles } from "@/components/comprafacil-ui";
import { formatBRL } from "@/lib/domain";
import { getPriceHistory, getProduct, getProductPriceRows, toggleProductFavorite, type PriceHistoryItem, type Product } from "@/lib/local-db";

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "Data desconhecida";
}

type ProductPriceRow = { storeId: string; storeName: string; branchName: string | null; priceCents: number; sourceLabel: string; observedAt: string };

function HistoryChart({ entries }: { entries: PriceHistoryItem[] }) {
  const ascending = entries.slice(0, 12).reverse().filter((entry) => entry.newPriceCents != null);
  const width = Math.max(250, Math.min(Dimensions.get("window").width - 72, 440));
  const height = 112;
  const values = ascending.flatMap((entry) => entry.newPriceCents == null ? [] : [entry.newPriceCents]);
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = 12 + (index / Math.max(ascending.length - 1, 1)) * (width - 24);
    const y = height - 12 - ((value - min) / range) * (height - 30);
    return { x, y, value };
  });
  return <View style={{ alignItems: "center" }}><Svg width={width} height={height}>
    <Line x1="10" y1={height - 12} x2={width - 10} y2={height - 12} stroke={C.border} strokeWidth="1" />
    {points.length > 1 ? <Polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={C.leaf} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
    {points.map((point, index) => <Circle key={index} cx={point.x} cy={point.y} r="5" fill={C.lime} stroke={C.leaf} strokeWidth="2" />)}
  </Svg><View style={styles.chartLegend}><Text style={styles.chartLabel}>{formatBRL(min)}</Text><Text style={styles.chartLabel}>{formatBRL(max)}</Text></View></View>;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Array.isArray(id) ? id[0] : id ?? "";
  const db = useSQLiteContext();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<PriceHistoryItem[]>([]);
  const [priceRows, setPriceRows] = useState<ProductPriceRow[]>([]);
  const refresh = useCallback(async () => {
    const [nextProduct, nextHistory, nextPrices] = await Promise.all([getProduct(db, productId), getPriceHistory(db, productId), getProductPriceRows(db, productId)]);
    setProduct(nextProduct); setHistory(nextHistory); setPriceRows(nextPrices);
  }, [db, productId]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  if (!product) return <AppScreen><EmptyState icon="cube-outline" title="Produto não encontrado" body="Ele pode ter sido removido do armazenamento local." action={<SecondaryButton label="Voltar" onPress={() => router.back()} />} /></AppScreen>;
  const size = product.sizeValue != null && product.sizeUnit ? `${product.sizeValue} ${product.sizeUnit}` : "Tamanho não informado";
  return (
    <AppScreen>
      <PageHeading title="Produto" subtitle="Detalhes e histórico local." action={<IconButton icon={product.isFavorite ? "heart" : "heart-outline"} label={product.isFavorite ? "Remover favorito" : "Favoritar"} tint={product.isFavorite ? C.coral : C.leaf} onPress={() => { void toggleProductFavorite(db, product.id).then(refresh); }} />} />
      <Card style={styles.productCard}><View style={styles.productIcon}><Ionicons name="cube-outline" size={29} color={C.leaf} /></View><Text style={styles.productName}>{product.name}</Text><Text style={styles.productMeta}>{[product.brand, size, product.category].filter(Boolean).join(" · ")}</Text><Badge tone="neutral">Correspondência local por tamanho exato</Badge><Text style={textStyles.secondary}>Embalagens de tamanhos diferentes permanecem como produtos separados. Não foi aplicado preço unitário estimado.</Text></Card>

      <View style={styles.sectionTitle}><Text style={styles.heading}>Preços anotados</Text><Badge tone={priceRows.length ? "amber" : "neutral"}>{priceRows.length ? "Manuais" : "Nenhum"}</Badge></View>
      {!priceRows.length ? <Card><EmptyState icon="pricetag-outline" title="Sem preço registrado" body="Adicione o produto a uma lista e informe manualmente o valor da unidade desejada." /></Card> : priceRows.map((row) => <Card key={row.storeId} style={styles.priceCard}><View style={{ flex: 1 }}><Text style={styles.storeName}>{row.storeName}{row.branchName ? ` — ${row.branchName}` : ""}</Text><Text style={textStyles.secondary}>{row.sourceLabel} · {dateLabel(row.observedAt)}</Text></View><Text style={styles.priceValue}>{formatBRL(row.priceCents)}</Text></Card>)}

      <Card style={styles.historyCard}><View style={styles.historyHead}><View style={{ flex: 1 }}><Text style={styles.heading}>Histórico de preço</Text><Text style={textStyles.secondary}>Registros manuais salvos neste aparelho.</Text></View><Badge tone={history.length ? "amber" : "neutral"}>{history.length} {history.length === 1 ? "registro" : "registros"}</Badge></View>
        {!history.length ? <Text style={[textStyles.secondary, { paddingVertical: 14 }]}>O histórico começa quando você registrar um preço. Nenhum dado demonstrativo é exibido.</Text> : <>
          <HistoryChart entries={history} />
          {history.map((entry) => <View key={entry.id} style={styles.historyRow}><View style={styles.historyDot}><Ionicons name="ellipse" size={7} color={C.leaf} /></View><View style={{ flex: 1 }}><Text style={styles.storeName}>{entry.storeName}{entry.branchName ? ` — ${entry.branchName}` : ""}</Text><Text style={textStyles.secondary}>{dateLabel(entry.changedAt)} · {entry.sourceLabel}</Text><Text style={styles.changeText}>{entry.oldPriceCents == null ? "Primeiro registro" : `${formatBRL(entry.oldPriceCents)} → ${formatBRL(entry.newPriceCents)}`}</Text></View><Text style={styles.historyPrice}>{formatBRL(entry.newPriceCents)}</Text></View>)}
        </>}
      </Card>
      <SecondaryButton label="Voltar à lista" icon="arrow-back" onPress={() => router.back()} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  productCard: { alignItems: "center", paddingVertical: 22 },
  productIcon: { width: 66, height: 66, borderRadius: 21, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  productName: { color: C.leafDark, fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: 4 },
  productMeta: { color: C.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { color: C.leafDark, fontSize: 16, fontWeight: "800" },
  priceCard: { flexDirection: "row", alignItems: "center", gap: 8 },
  storeName: { color: C.leafDark, fontSize: 14, fontWeight: "800" },
  priceValue: { color: C.leaf, fontSize: 18, fontWeight: "900" },
  historyCard: { gap: 13 },
  historyHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  chartLegend: { width: "100%", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  chartLabel: { color: C.muted, fontSize: 11, fontWeight: "700" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingTop: 11 },
  historyDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  changeText: { color: C.leafDark, fontSize: 12, fontWeight: "700", marginTop: 3 },
  historyPrice: { color: C.leafDark, fontSize: 15, fontWeight: "800" },
});
