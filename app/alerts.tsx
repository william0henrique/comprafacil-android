import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { AppScreen, Badge, C, Card, EmptyState, Field, PageHeading, PrimaryButton, textStyles } from "@/components/comprafacil-ui";
import { formatBRL, parseBRLToCents } from "@/lib/domain";
import { getAlertPreferences, getPriceEvents, markPriceEventRead, setAlertPreference, type AlertKey, type AlertPreference, type PriceEvent } from "@/lib/local-db";
import { requestNotificationPermission } from "@/lib/notifications";

type AlertSpec = { key: AlertKey; title: string; detail: string; sourceRequired?: boolean };

const ALERTS: AlertSpec[] = [
  { key: "price_drop", title: "Queda de preço", detail: "Notificação local quando um preço manual for atualizado para baixo." },
  { key: "price_rise", title: "Aumento de preço", detail: "Notificação local quando um preço manual for atualizado para cima." },
  { key: "promotion", title: "Promoção", detail: "Preferência salva; depende de uma fonte autorizada de promoções.", sourceRequired: true },
  { key: "unavailable", title: "Produto indisponível", detail: "Preferência salva; depende de uma fonte autorizada de disponibilidade.", sourceRequired: true },
  { key: "lowest_store", title: "Mudança do menor preço", detail: "Preferência salva; depende de dados comparáveis atualizados.", sourceRequired: true },
];

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "Data desconhecida";
}

export default function AlertsScreen() {
  const db = useSQLiteContext();
  const [preferences, setPreferences] = useState<AlertPreference[]>([]);
  const [events, setEvents] = useState<PriceEvent[]>([]);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [threshold, setThreshold] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const [nextPreferences, nextEvents, permission] = await Promise.all([getAlertPreferences(db), getPriceEvents(db), Notifications.getPermissionsAsync()]);
    setPreferences(nextPreferences); setEvents(nextEvents); setNotificationGranted(permission.granted);
    const savedThreshold = nextPreferences.find((item) => item.key === "threshold")?.thresholdCents;
    if (savedThreshold != null) setThreshold((savedThreshold / 100).toFixed(2).replace(".", ","));
  }, [db]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const enabled = (key: AlertKey) => Boolean(preferences.find((item) => item.key === key)?.enabled);

  async function toggle(key: AlertKey, value: boolean) {
    await setAlertPreference(db, key, value);
    await refresh();
  }
  async function enableNotifications() {
    setBusy(true);
    try {
      const granted = await requestNotificationPermission();
      setNotificationGranted(granted);
      if (!granted) Alert.alert("Permissão não concedida", "As alterações continuam disponíveis na caixa de entrada do app.");
    } catch { Alert.alert("Notificações indisponíveis", "Você pode alterar a permissão nas configurações do Android."); }
    finally { setBusy(false); }
  }
  async function saveThreshold() {
    const cents = parseBRLToCents(threshold);
    if (cents == null) { Alert.alert("Limite inválido", "Informe um valor maior que zero, por exemplo R$ 20,00."); return; }
    await setAlertPreference(db, "threshold", true, cents);
    await refresh();
    Alert.alert("Limite salvo", `Você verá o limite de ${formatBRL(cents)} nesta configuração local. Alertas dependem de um preço registrado manualmente.`);
  }
  async function markRead(event: PriceEvent) {
    if (!event.isRead) await markPriceEventRead(db, event.id);
    await refresh();
  }

  return (
    <AppScreen>
      <PageHeading title="Alertas" subtitle="Preferências e mudanças registradas localmente." />
      <Card style={styles.permissionCard}>
        <View style={styles.permissionRow}><View style={styles.permissionIcon}><Ionicons name="notifications-outline" size={22} color={C.leaf} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Notificações do Android</Text><Text style={textStyles.secondary}>{notificationGranted ? "Permissão concedida neste aparelho." : "A permissão só será solicitada quando você tocar no botão."}</Text></View><Badge tone={notificationGranted ? "green" : "neutral"}>{notificationGranted ? "Ativa" : "Desativada"}</Badge></View>
        {!notificationGranted ? <PrimaryButton label={busy ? "Solicitando…" : "Ativar notificações"} icon="notifications" onPress={() => { void enableNotifications(); }} disabled={busy} /> : null}
      </Card>

      <Card style={styles.sourceNote}><View style={styles.noteRow}><Ionicons name="information-circle-outline" size={21} color={C.amber} /><Text style={styles.noteText}>Não há fonte automática de preços ativa. Alterações do mercado não gerarão alertas até existir uma integração autorizada.</Text></View></Card>

      <View style={{ gap: 10 }}><Text style={styles.sectionTitle}>O que você quer acompanhar?</Text>{ALERTS.map((alert) => <Card key={alert.key} style={styles.alertCard}>
        <View style={styles.alertRow}><View style={{ flex: 1, gap: 4 }}><View style={styles.alertTitleRow}><Text style={styles.cardTitle}>{alert.title}</Text>{alert.sourceRequired ? <Badge tone="amber">Fonte necessária</Badge> : null}</View><Text style={textStyles.secondary}>{alert.detail}</Text></View><Switch value={enabled(alert.key)} onValueChange={(value) => { void toggle(alert.key, value); }} trackColor={{ false: "#D3D7CE", true: "#A8C58E" }} thumbColor={enabled(alert.key) ? C.leaf : "#F7F7F4"} accessibilityLabel={alert.title} /></View>
      </Card>)}</View>

      <Card style={styles.thresholdCard}><View style={styles.alertTitleRow}><Text style={styles.cardTitle}>Abaixo do meu limite</Text><Badge tone={enabled("threshold") ? "green" : "neutral"}>{enabled("threshold") ? "Configurado" : "Opcional"}</Badge></View><Text style={textStyles.secondary}>Guarde um valor de referência. O limite fica salvo localmente; sem fonte ativa, só poderá ser comparado a um preço que você registrar.</Text><Field label="Limite (R$)" value={threshold} onChangeText={setThreshold} placeholder="20,00" keyboardType="decimal-pad" /><PrimaryButton label="Salvar limite" icon="checkmark" onPress={() => { void saveThreshold(); }} disabled={parseBRLToCents(threshold) == null} /></Card>

      <View style={styles.inboxHeading}><Text style={styles.sectionTitle}>Caixa de entrada</Text><Badge tone={events.some((event) => !event.isRead) ? "coral" : "neutral"}>{events.filter((event) => !event.isRead).length} não lidos</Badge></View>
      {!events.length ? <Card><EmptyState icon="mail-open-outline" title="Nenhuma mudança registrada" body="A caixa recebe eventos quando um preço informado manualmente muda. O primeiro registro cria histórico, mas não simula uma alteração." /></Card> : events.map((event) => <Pressable key={event.id} onPress={() => { void markRead(event); }}><Card style={[styles.eventCard, !event.isRead && styles.eventUnread]}>
        <View style={styles.eventIcon}><Ionicons name={event.newPriceCents != null && event.oldPriceCents != null && event.newPriceCents < event.oldPriceCents ? "trending-down" : "trending-up"} size={19} color={C.leaf} /></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.eventMessage}>{event.message}</Text><Text style={textStyles.secondary}>{dateLabel(event.createdAt)} · registro manual</Text>{event.oldPriceCents != null && event.newPriceCents != null ? <Text style={styles.eventPrices}>{formatBRL(event.oldPriceCents)} → {formatBRL(event.newPriceCents)}</Text> : null}</View>{!event.isRead ? <View style={styles.unreadDot} /> : null}
      </Card></Pressable>)}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  permissionCard: { backgroundColor: C.paleGreen, borderColor: "#DDE8D6" },
  permissionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  permissionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.paper, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: C.leafDark, fontSize: 14, fontWeight: "800" },
  sourceNote: { backgroundColor: "#FFFCF5", borderColor: "#F0E6D2" },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteText: { color: "#76530F", fontSize: 12, lineHeight: 18, flex: 1 },
  sectionTitle: { color: C.leafDark, fontSize: 16, fontWeight: "800" },
  alertCard: { padding: 13 },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  alertTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  thresholdCard: { backgroundColor: C.paper },
  inboxHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eventCard: { padding: 13, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  eventUnread: { borderColor: "#BBD0A6", backgroundColor: "#FBFDF7" },
  eventIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  eventMessage: { color: C.leafDark, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  eventPrices: { color: C.leaf, fontSize: 13, fontWeight: "800" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.leaf, marginTop: 5 },
});
