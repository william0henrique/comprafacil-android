import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen, Badge, C, Card, IconButton, PageHeading, PrimaryButton, SectionTitle, textStyles } from "@/components/comprafacil-ui";
import { formatBRL } from "@/lib/domain";
import { getLists, type ShoppingList } from "@/lib/local-db";

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const refresh = useCallback(async () => setLists(await getLists(db)), [db]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const recent = lists[0];

  return (
    <AppScreen>
      <PageHeading
        title="CompraFácil"
        subtitle="Sua compra organizada, direto no celular."
        action={<IconButton icon="notifications-outline" label="Abrir alertas" onPress={() => router.push("/alerts")} />}
      />

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>BOM DIA, VIZINHO</Text>
          <Text style={styles.heroTitle}>Uma compra{ "\n" }mais tranquila.</Text>
          <Text style={styles.heroBody}>Monte sua lista e acompanhe os valores que você registrar.</Text>
          <PrimaryButton label="Nova lista" icon="add" onPress={() => router.push("/lists")} style={{ alignSelf: "flex-start", marginTop: 8 }} />
        </View>
        <View style={styles.basketMark}>
          <Ionicons name="basket-outline" size={53} color={C.leaf} />
          <View style={styles.leafDot}><Ionicons name="leaf" size={17} color={C.leafDark} /></View>
        </View>
      </View>

      <SectionTitle title="Continue de onde parou" action={<Pressable onPress={() => router.push("/lists")}><Text style={styles.link}>Ver listas</Text></Pressable>} />
      {recent ? (
        <Pressable onPress={() => router.push({ pathname: "/lists/[id]", params: { id: recent.id } })}>
          <Card style={styles.recentCard}>
            <View style={styles.recentTop}>
              <View style={styles.listIcon}><Ionicons name="list" size={21} color={C.leaf} /></View>
              <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{recent.name}</Text><Text style={textStyles.secondary}>{recent.itemCount} {recent.itemCount === 1 ? "item" : "itens"}</Text></View>
              <Ionicons name="chevron-forward" size={20} color={C.muted} />
            </View>
            <View style={styles.totalRow}>
              <View><Text style={styles.totalLabel}>{recent.selectedStoreId ? "Subtotal registrado" : "Total da lista"}</Text><Text style={styles.totalValue}>{formatBRL(recent.totalCents)}</Text></View>
              <Badge tone={recent.totalCents == null ? "neutral" : "green"}>{recent.totalCents == null ? "Sem preços" : `${recent.missingCount} sem preço`}</Badge>
            </View>
          </Card>
        </Pressable>
      ) : (
        <Card><Text style={styles.cardTitle}>Sua primeira lista começa aqui</Text><Text style={textStyles.secondary}>As listas ficam salvas apenas neste aparelho.</Text></Card>
      )}

      <Card style={styles.superlunaCard}>
        <View style={styles.superlunaHeader}>
          <View style={styles.storeIcon}><Ionicons name="storefront-outline" size={21} color={C.leaf} /></View>
          <View style={{ flex: 1 }}><Text style={styles.cardTitle}>SuperLuna Supermercados</Text><Text style={textStyles.secondary}>Fonte automática indisponível</Text></View>
          <Badge tone="amber">Sem preços online</Badge>
        </View>
        <Text style={styles.superlunaBody}>O acesso público à loja online respondeu HTTP 403 e não foi localizada API/feed com autorização confirmada. Nenhum preço do SuperLuna foi inventado ou importado.</Text>
        <Pressable onPress={() => router.push("/stores")} style={styles.textAction}><Text style={styles.link}>Ver unidades cadastradas</Text><Ionicons name="arrow-forward" size={16} color={C.leaf} /></Pressable>
      </Card>

      <View style={styles.quickRow}>
        <Pressable style={styles.quickCard} onPress={() => router.push("/products")}><Ionicons name="cube-outline" size={22} color={C.leaf} /><Text style={styles.quickTitle}>Meus produtos</Text><Text style={textStyles.secondary}>Produtos cadastrados por você</Text></Pressable>
        <Pressable style={styles.quickCard} onPress={() => router.push("/settings")}><Ionicons name="options-outline" size={22} color={C.leaf} /><Text style={styles.quickTitle}>Preferências</Text><Text style={textStyles.secondary}>Critério de comparação</Text></Pressable>
      </View>
      <Text style={styles.localNote}>Sem conta. Seus dados pessoais ficam neste aparelho.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: C.paleGreen, borderRadius: 25, padding: 18, minHeight: 214, overflow: "hidden", flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#DDE8D6" },
  heroCopy: { flex: 1, gap: 7, zIndex: 1 },
  kicker: { color: C.leaf, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  heroTitle: { color: C.leafDark, fontSize: 28, fontWeight: "800", lineHeight: 31 },
  heroBody: { color: C.muted, fontSize: 13, lineHeight: 18, maxWidth: 220 },
  basketMark: { width: 84, height: 84, borderRadius: 28, backgroundColor: C.cream, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-5deg" }], marginLeft: -3 },
  leafDot: { position: "absolute", right: 13, top: 11, backgroundColor: C.lime, width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  link: { color: C.leaf, fontSize: 13, fontWeight: "800" },
  recentCard: { padding: 16 },
  recentTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  listIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: C.leafDark, fontSize: 16, fontWeight: "800" },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 13, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  totalLabel: { color: C.muted, fontSize: 12 },
  totalValue: { color: C.leafDark, fontSize: 21, fontWeight: "800", marginTop: 3 },
  superlunaCard: { backgroundColor: "#FFFCF5", borderColor: "#F0E6D2" },
  superlunaHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  storeIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.paleAmber, alignItems: "center", justifyContent: "center" },
  superlunaBody: { color: C.muted, fontSize: 13, lineHeight: 19 },
  textAction: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  quickRow: { flexDirection: "row", gap: 11 },
  quickCard: { flex: 1, minHeight: 126, backgroundColor: C.paper, borderRadius: 19, borderWidth: 1, borderColor: C.border, padding: 14, gap: 7 },
  quickTitle: { color: C.leafDark, fontWeight: "800", fontSize: 14 },
  localNote: { textAlign: "center", color: C.muted, fontSize: 12, marginTop: -3 },
});
