import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen, C, Card, EmptyState, PageHeading, SectionTitle, textStyles } from "@/components/comprafacil-ui";
import { getFavoriteLists, getFavoriteStores, getProducts, toggleListFavorite, toggleProductFavorite, toggleStoreFavorite, type Product, type ShoppingList, type Store } from "@/lib/local-db";

export default function FavoritesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const refresh = useCallback(async () => {
    const [nextLists, allProducts, nextStores] = await Promise.all([getFavoriteLists(db), getProducts(db, true), getFavoriteStores(db)]);
    setLists(nextLists); setProducts(allProducts); setStores(nextStores);
  }, [db]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const count = lists.length + products.length + stores.length;

  return (
    <AppScreen>
      <PageHeading title="Favoritos" subtitle="Acesso rápido aos seus itens salvos." />
      {count === 0 ? <Card><EmptyState icon="heart-outline" title="Seus favoritos aparecem aqui" body="Toque no coração de uma lista, produto ou supermercado para salvá-lo neste aparelho." /></Card> : null}
      {lists.length ? <View style={styles.section}><SectionTitle title="Listas" />{lists.map((list) => <Card key={list.id} style={styles.card}><View style={styles.row}><Pressable style={styles.mainRow} onPress={() => router.push({ pathname: "/lists/[id]", params: { id: list.id } })}><Ionicons name="list-outline" size={22} color={C.leaf} /><View style={{ flex: 1 }}><Text style={styles.title}>{list.name}</Text><Text style={textStyles.secondary}>{list.itemCount} {list.itemCount === 1 ? "item" : "itens"}</Text></View></Pressable><Pressable style={styles.favoriteButton} accessibilityRole="button" accessibilityLabel="Remover favorito" hitSlop={12} onPress={() => { void toggleListFavorite(db, list.id).then(refresh); }}><Ionicons name="heart" size={21} color={C.coral} /></Pressable></View></Card>)}</View> : null}
      {products.length ? <View style={styles.section}><SectionTitle title="Produtos" />{products.map((product) => <Card key={product.id} style={styles.card}><View style={styles.row}><Pressable style={styles.mainRow} onPress={() => router.push({ pathname: "/products/[id]", params: { id: product.id } })}><Ionicons name="cube-outline" size={22} color={C.leaf} /><View style={{ flex: 1 }}><Text style={styles.title}>{product.name}</Text><Text style={textStyles.secondary}>{[product.brand, product.sizeValue != null && product.sizeUnit ? `${product.sizeValue} ${product.sizeUnit}` : null].filter(Boolean).join(" · ") || "Tamanho não informado"}</Text></View></Pressable><Pressable style={styles.favoriteButton} accessibilityRole="button" accessibilityLabel="Remover favorito" hitSlop={12} onPress={() => { void toggleProductFavorite(db, product.id).then(refresh); }}><Ionicons name="heart" size={21} color={C.coral} /></Pressable></View></Card>)}</View> : null}
      {stores.length ? <View style={styles.section}><SectionTitle title="Supermercados" />{stores.map((store) => <Card key={store.id} style={styles.card}><View style={styles.row}><Pressable style={styles.mainRow} onPress={() => router.push("/stores")}><Ionicons name="storefront-outline" size={22} color={C.leaf} /><View style={{ flex: 1 }}><Text style={styles.title}>{store.chainName}{store.branchName ? ` — ${store.branchName}` : ""}</Text><Text style={textStyles.secondary}>{store.address ?? "Endereço não confirmado"}</Text></View></Pressable><Pressable style={styles.favoriteButton} accessibilityRole="button" accessibilityLabel="Remover favorito" hitSlop={12} onPress={() => { void toggleStoreFavorite(db, store.id).then(refresh); }}><Ionicons name="heart" size={21} color={C.coral} /></Pressable></View></Card>)}</View> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  card: { padding: 12 },
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 9 },
  mainRow: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 11 },
  favoriteButton: { minWidth: 42, minHeight: 42, alignItems: "center", justifyContent: "center" },
  title: { color: C.leafDark, fontSize: 14, fontWeight: "800" },
});
