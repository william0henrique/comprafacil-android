import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen, C, Card, EmptyState, Field, IconButton, PageHeading, textStyles } from "@/components/comprafacil-ui";
import { getProducts, toggleProductFavorite, type Product } from "@/lib/local-db";

export default function ProductsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const refresh = useCallback(async () => setProducts(await getProducts(db)), [db]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    if (!needle) return products;
    return products.filter((product) => `${product.name} ${product.brand ?? ""} ${product.category ?? ""} ${product.sizeValue ?? ""} ${product.sizeUnit ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle));
  }, [products, query]);

  return (
    <AppScreen>
      <PageHeading title="Meus produtos" subtitle={`${products.length} ${products.length === 1 ? "produto cadastrado" : "produtos cadastrados"}`} action={<IconButton icon="arrow-back" label="Voltar" onPress={() => router.back()} />} />
      <Field label="Buscar produto" value={query} onChangeText={setQuery} placeholder="Nome, marca, categoria ou tamanho" />
      {!products.length ? <Card><EmptyState icon="cube-outline" title="Ainda sem produtos" body="Os produtos são cadastrados ao adicioná-los a uma lista. A combinação de nome, marca e tamanho evita juntar embalagens diferentes." /></Card> : null}
      {products.length > 0 && !filtered.length ? <Card><EmptyState icon="search-outline" title="Nenhum resultado" body="Tente outro nome, marca ou tamanho." /></Card> : null}
      {filtered.map((product) => <Card key={product.id} style={styles.card}>
        <View style={styles.row}>
          <Pressable style={styles.mainRow} onPress={() => router.push({ pathname: "/products/[id]", params: { id: product.id } })}>
            <View style={styles.icon}><Ionicons name="cube-outline" size={21} color={C.leaf} /></View>
            <View style={{ flex: 1, gap: 4 }}><Text style={styles.name}>{product.name}</Text><Text style={textStyles.secondary}>{[product.brand, product.sizeValue != null && product.sizeUnit ? `${product.sizeValue} ${product.sizeUnit}` : "Tamanho não informado"].filter(Boolean).join(" · ")}</Text>{product.category ? <Text style={styles.category}>{product.category}</Text> : null}</View>
          </Pressable>
          <IconButton icon={product.isFavorite ? "heart" : "heart-outline"} label={product.isFavorite ? "Remover favorito" : "Favoritar produto"} tint={product.isFavorite ? C.coral : C.leaf} onPress={() => { void toggleProductFavorite(db, product.id).then(refresh); }} />
        </View>
      </Card>)}
      <Text style={styles.note}>Somente produtos criados por você são mostrados. Não há catálogo ou preço fictício.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12 },
  row: { minHeight: 47, flexDirection: "row", alignItems: "center", gap: 8 },
  mainRow: { flex: 1, minHeight: 47, flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  name: { color: C.leafDark, fontSize: 15, fontWeight: "800" },
  category: { color: C.leaf, fontSize: 11, fontWeight: "700" },
  note: { color: C.muted, textAlign: "center", fontSize: 12, lineHeight: 18 },
});
