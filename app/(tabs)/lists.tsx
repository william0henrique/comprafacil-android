import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen, Badge, C, Card, Field, IconButton, PageHeading, PrimaryButton, SecondaryButton, textStyles } from "@/components/comprafacil-ui";
import { formatBRL } from "@/lib/domain";
import { createList, deleteList, duplicateList, getLists, renameList, toggleListFavorite, type ShoppingList } from "@/lib/local-db";

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

export default function ListsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [deletingList, setDeletingList] = useState<ShoppingList | null>(null);
  const [editing, setEditing] = useState<ShoppingList | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const refresh = useCallback(async () => setLists(await getLists(db)), [db]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  function openCreate() { setEditing(null); setName(""); setModalVisible(true); }
  function openRename(list: ShoppingList) { setEditing(list); setName(list.name); setModalVisible(true); }
  async function saveList() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await renameList(db, editing.id, trimmed);
        setModalVisible(false);
        await refresh();
      } else {
        const id = await createList(db, trimmed);
        setModalVisible(false);
        router.push({ pathname: "/lists/[id]", params: { id } });
      }
    } catch {
      Alert.alert("Não foi possível salvar", "Tente novamente em instantes.");
    } finally { setSaving(false); }
  }
  function askDelete(list: ShoppingList) {
    setDeletingList(list);
  }
  async function confirmDelete() {
    const target = deletingList;
    setDeletingList(null);
    if (!target) return;
    try { await deleteList(db, target.id); await refresh(); }
    catch { Alert.alert("Não foi possível excluir", "Tente novamente em instantes."); }
  }

  return (
    <AppScreen>
      <PageHeading title="Minhas listas" subtitle="Tudo salvo neste aparelho." action={<IconButton icon="add" label="Criar lista" onPress={openCreate} />} />
      <PrimaryButton label="Criar nova lista" icon="add" onPress={openCreate} />
      {lists.length === 0 ? (
        <Card><View style={{ paddingVertical: 12 }}><Text style={styles.emptyTitle}>Nenhuma lista ainda</Text><Text style={[textStyles.secondary, { marginTop: 6 }]}>Crie uma lista e adicione produtos com as quantidades que você precisa.</Text></View></Card>
      ) : lists.map((list) => (
        <Card key={list.id} style={styles.listCard}>
          <View style={styles.listMain}>
            <Pressable style={styles.listPressable} onPress={() => router.push({ pathname: "/lists/[id]", params: { id: list.id } })}>
              <View style={styles.listIcon}><Ionicons name="list" size={22} color={C.leaf} /></View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.listName}>{list.name}</Text>
                <Text style={textStyles.secondary}>{list.itemCount} {list.itemCount === 1 ? "item" : "itens"} · atualizada {dateLabel(list.updatedAt)}</Text>
              </View>
            </Pressable>
            <IconButton icon={list.isFavorite ? "heart" : "heart-outline"} label={list.isFavorite ? "Remover dos favoritos" : "Favoritar lista"} tint={list.isFavorite ? C.coral : C.leaf} onPress={() => { void toggleListFavorite(db, list.id).then(refresh); }} />
          </View>
          <View style={styles.summaryRow}>
            <View><Text style={styles.totalCaption}>{list.selectedStoreId ? "Subtotal registrado" : "Estimativa"}</Text><Text style={styles.total}>{formatBRL(list.totalCents)}</Text></View>
            <Badge tone={list.totalCents == null ? "neutral" : list.missingCount ? "amber" : "green"}>{list.totalCents == null ? "Sem preços" : `${list.missingCount} sem preço`}</Badge>
          </View>
          <View style={styles.actions}>
            <SecondaryButton label="Renomear" icon="create-outline" onPress={() => openRename(list)} style={styles.actionButton} />
            <SecondaryButton label="Duplicar" icon="copy-outline" onPress={() => { void duplicateList(db, list.id).then(refresh); }} style={styles.actionButton} />
            <SecondaryButton label="Excluir" icon="trash-outline" danger onPress={() => askDelete(list)} style={styles.actionButton} />
          </View>
        </Card>
      ))}
      <Modal transparent visible={deletingList != null} animationType="fade" onRequestClose={() => setDeletingList(null)}>
        <View style={styles.confirmBackdrop}><View style={styles.confirmCard}><Text style={styles.sheetTitle}>Excluir lista?</Text><Text style={textStyles.secondary}>“{deletingList?.name}” e seus itens serão removidos deste aparelho.</Text><SecondaryButton label="Cancelar" onPress={() => setDeletingList(null)} /><SecondaryButton label="Excluir lista" icon="trash-outline" danger onPress={() => { void confirmDelete(); }} /></View></View>
      </Modal>
      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} accessibilityLabel="Fechar" />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editing ? "Renomear lista" : "Nova lista"}</Text>
            <Field label="Nome da lista" value={name} onChangeText={setName} placeholder="Ex.: Compras da semana" maxLength={50} returnKeyType="done" />
            <PrimaryButton label={saving ? "Salvando…" : "Salvar lista"} icon="checkmark" disabled={!name.trim() || saving} onPress={() => { void saveList(); }} />
            <SecondaryButton label="Cancelar" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  listCard: { gap: 14 },
  listMain: { flexDirection: "row", alignItems: "center", gap: 7 },
  listPressable: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 46 },
  listIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  listName: { color: C.leafDark, fontSize: 16, fontWeight: "800" },
  summaryRow: { borderTopColor: C.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalCaption: { color: C.muted, fontSize: 12 },
  total: { color: C.leafDark, fontSize: 20, fontWeight: "800", marginTop: 3 },
  actions: { flexDirection: "row", gap: 7 },
  actionButton: { flex: 1, paddingHorizontal: 6, minHeight: 43 },
  emptyTitle: { color: C.leafDark, fontSize: 17, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(24,48,39,0.28)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.cream, padding: 22, paddingBottom: 30, borderTopLeftRadius: 26, borderTopRightRadius: 26, gap: 16 },
  sheetHandle: { width: 42, height: 5, borderRadius: 5, backgroundColor: "#C7C9BD", alignSelf: "center", marginBottom: 2 },
  sheetTitle: { color: C.leafDark, fontSize: 21, fontWeight: "800" },
  confirmBackdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(24,48,39,0.35)" },
  confirmCard: { backgroundColor: C.cream, padding: 22, borderRadius: 22, gap: 13 },
});
