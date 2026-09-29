import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppScreen, Badge, C, Card, IconButton, PageHeading, textStyles } from "@/components/comprafacil-ui";
import { getRecommendationPreference, setRecommendationPreference } from "@/lib/local-db";
import type { RecommendationPreference } from "@/lib/domain";
import {
  deleteRemoteBackup,
  enableCloudBackup,
  getCloudBackupSettings,
  getCloudBackupUiState,
  getRemoteBackupStatus,
  pauseCloudBackup,
  replaceRemoteWithLocal,
  restoreRemoteBackup,
  subscribeCloudBackupUiState,
  syncCloudBackupNow,
  type CloudBackupUiState,
} from "@/lib/cloud-backup-client";

type RecommendationOption = { id: RecommendationPreference; title: string; detail: string; icon: "cash-outline" | "navigate-outline" | "scale-outline" };
type DialogKind = "consent" | "remote" | "restore" | "replace" | "delete" | null;

const OPTIONS: RecommendationOption[] = [
  { id: "lowestPrice", title: "Menor preço", detail: "Prioriza o menor total entre os valores registrados.", icon: "cash-outline" },
  { id: "closest", title: "Menor distância", detail: "Prioriza a loja próxima quando houver localização confirmada.", icon: "navigate-outline" },
  { id: "balanced", title: "Equilíbrio", detail: "Considera preço e distância; evita deslocamento longo por economia pequena.", icon: "scale-outline" },
];

function formatDate(value?: string): string {
  if (!value) return "Ainda não sincronizado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [preference, setPreference] = useState<RecommendationPreference>("balanced");
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>();
  const [remoteExists, setRemoteExists] = useState(false);
  const [remoteCheckFailed, setRemoteCheckFailed] = useState(false);
  const [cloudState, setCloudState] = useState<CloudBackupUiState>(getCloudBackupUiState());
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setPreference(await getRecommendationPreference(db));
    if (Platform.OS !== "android") return;
    try {
      const settings = await getCloudBackupSettings();
      setBackupEnabled(settings.enabled);
      setLastSyncAt(settings.lastSyncAt);
    } catch (error) {
      setMessage(errorMessage(error));
    }
    try {
      const status = await getRemoteBackupStatus();
      setRemoteExists(status?.exists ?? false);
      setRemoteCheckFailed(false);
    } catch {
      setRemoteCheckFailed(true);
    }
  }, [db]);

  useFocusEffect(useCallback(() => {
    let focused = true;
    const unsubscribe = subscribeCloudBackupUiState((state) => {
      if (focused) {
        setCloudState(state);
        if (state.lastSyncAt) setLastSyncAt(state.lastSyncAt);
      }
    });
    void refresh().catch((error) => setMessage(errorMessage(error)));
    return () => { focused = false; unsubscribe(); };
  }, [refresh]));

  const runAction = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setDialog(null);
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const activateBackup = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await enableCloudBackup(db);
      if (result.status === "remote-exists") {
        setRemoteExists(true);
        setDialog("remote");
      } else {
        setDialog(null);
      }
      await refresh();
    } catch (error) {
      setDialog(null);
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [db, refresh]);

  const dialogContent = {
    consent: {
      title: "Ativar backup criptografado?",
      body: "O CompraFácil vai cifrar uma cópia dos seus dados neste Android antes de enviá-la por HTTPS. O servidor não recebe listas, preços ou preferências em texto legível; ainda poderá ver um identificador em hash, IP, tamanho aproximado e horários. Não há conta, recuperação de chave nem sincronização entre aparelhos. Perder a chave de cifragem torna o conteúdo irrecuperável. Se o token local também for perdido, a cópia não poderá ser localizada ou apagada pelo app. Ela não expira automaticamente; apague-a antes de desinstalar.",
      primary: "Concordo e ativar",
      destructive: false,
    },
    restore: {
      title: "Substituir os dados deste Android?",
      body: "A restauração substitui as listas, produtos, lojas salvas, preços manuais, histórico, alertas e preferências locais pela cópia criptografada desta instalação. Esta ação não pode ser desfeita. O app só aplica a cópia depois de conferir a autenticação e o conteúdo completo.",
      primary: "Restaurar cópia",
      destructive: true,
    },
    replace: {
      title: "Substituir a cópia remota?",
      body: "A cópia no servidor será sobrescrita pelo estado atual deste Android. Não existe histórico de versões para voltar atrás. Os dados locais não serão alterados.",
      primary: "Substituir cópia",
      destructive: true,
    },
    delete: {
      title: "Apagar a cópia remota?",
      body: "A cópia criptografada desta instalação será removida do MySQL. Listas e dados locais neste Android serão mantidos. Esta exclusão não pode ser desfeita.",
      primary: "Apagar cópia remota",
      destructive: true,
    },
  } as const;

  const activeDialog = dialog && dialog !== "remote" ? dialogContent[dialog] : null;

  return (
    <AppScreen>
      <PageHeading title="Preferências" subtitle="Sem conta. O backup na nuvem é opcional e criptografado no Android." action={<IconButton icon="arrow-back" label="Voltar" onPress={() => router.back()} />} />
      <Text style={styles.sectionTitle}>Como recomendar uma loja?</Text>
      {OPTIONS.map((option) => <Pressable key={option.id} onPress={() => { setPreference(option.id); void setRecommendationPreference(db, option.id); }} accessibilityRole="button" accessibilityLabel={`${option.title}. ${option.detail}`}>
        <Card style={[styles.optionCard, preference === option.id && styles.selectedOption]}>
          <View style={styles.optionRow}><View style={[styles.icon, preference === option.id && { backgroundColor: C.lime }]}><Ionicons name={option.icon} size={20} color={C.leaf} /></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.optionTitle}>{option.title}</Text><Text style={textStyles.secondary}>{option.detail}</Text></View>{preference === option.id ? <Ionicons name="checkmark-circle" size={23} color={C.leaf} /> : null}</View>
        </Card>
      </Pressable>)}

      <Card style={styles.privacyCard}>
        <View style={styles.privacyHead}><View style={styles.privacyIcon}><Ionicons name="phone-portrait-outline" size={22} color={C.leaf} /></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.optionTitle}>Seus dados e privacidade</Text><Badge tone="green">Sem login</Badge></View></View>
        <Text style={textStyles.secondary}>O SQLite deste Android continua sendo a fonte principal. Listas, produtos, favoritos, preferências, preços informados e histórico ficam no aparelho. A localização só é pedida para uma busca iniciada por você.</Text>
        <Text style={textStyles.secondary}>O backup remoto só começa após sua autorização. O servidor guarda o texto cifrado e um hash do token de acesso, não o conteúdo legível. Cada instalação usa chaves próprias; não há transferência nem recuperação entre aparelhos.</Text>
      </Card>

      <Card style={styles.backupCard}>
        <View style={styles.backupHeading}>
          <View style={styles.backupIcon}><Ionicons name="shield-checkmark-outline" size={22} color={C.leaf} /></View>
          <View style={{ flex: 1, gap: 3 }}><Text style={styles.optionTitle}>Backup criptografado</Text><Text style={textStyles.secondary}>Opcional · MySQL gerenciado · Android</Text></View>
          <Badge tone={backupEnabled ? "green" : "neutral"}>{backupEnabled ? "Ativo" : "Desativado"}</Badge>
        </View>
        <Text style={textStyles.secondary}>Quando ativo, as alterações são enviadas com o app em uso e uma tentativa ocorre ao abrir. Sem conexão, as gravações locais continuam normalmente. Não há tarefa agendada em segundo plano.</Text>
        <View style={styles.backupMetadata}>
          <Text style={styles.metaLabel}>Último envio confirmado</Text>
          <Text style={styles.metaValue}>{formatDate(lastSyncAt)}</Text>
        </View>
        <Text style={styles.privacyFinePrint}>As chaves ficam no SecureStore/Keystore deste Android e não são enviadas. Sem a chave de cifragem, o backup é irrecuperável; sem o token, o app não consegue localizar ou apagar a cópia. Não há expiração automática.</Text>

        {Platform.OS !== "android" ? <Text style={textStyles.secondary}>O backup está disponível somente no aplicativo Android.</Text> : null}
        {Platform.OS === "android" && !backupEnabled && !remoteExists ? <ActionButton title="Ativar backup criptografado" icon="lock-closed-outline" onPress={() => { setMessage(null); setDialog("consent"); }} disabled={busy} /> : null}
        {Platform.OS === "android" && !backupEnabled && remoteExists ? <ActionButton title="Gerenciar cópia encontrada" icon="cloud-outline" onPress={() => setDialog("remote")} disabled={busy} /> : null}
        {Platform.OS === "android" && backupEnabled ? <>
          <ActionButton title="Sincronizar agora" icon="sync-outline" onPress={() => void runAction(() => syncCloudBackupNow(db))} disabled={busy} />
          <ActionButton title="Pausar sincronização" icon="pause-outline" onPress={() => void runAction(pauseCloudBackup)} disabled={busy} secondary />
        </> : null}
        {Platform.OS === "android" && remoteExists ? <>
          <ActionButton title="Restaurar cópia neste Android…" icon="download-outline" onPress={() => setDialog("restore")} disabled={busy} secondary />
          <ActionButton title="Apagar cópia remota…" icon="trash-outline" onPress={() => setDialog("delete")} disabled={busy} destructive />
        </> : null}
        {remoteCheckFailed ? <Text style={styles.fineWarning}>Não foi possível verificar a cópia remota agora. O estado local e os dados do app não foram alterados.</Text> : null}
        {cloudState.phase === "syncing" ? <View style={styles.syncing}><ActivityIndicator color={C.leaf} /><Text style={textStyles.secondary}>Cifrando e enviando backup…</Text></View> : null}
        {cloudState.phase === "error" ? <Text style={styles.errorText}>{cloudState.message}</Text> : null}
        {cloudState.phase === "success" && cloudState.message ? <Text style={styles.successText}>{cloudState.message}</Text> : null}
        {message ? <Text style={styles.errorText}>{message}</Text> : null}
      </Card>

      <Card style={styles.sourceCard}>
        <Text style={styles.optionTitle}>Preços e fontes</Text>
        <Text style={textStyles.secondary}>Os preços usados nas comparações são informados manualmente e aparecem com essa identificação. A integração automática do SuperLuna continua desativada por HTTP 403 e falta de autorização confirmada. A referência do Mercado Livre também permanece desativada; não há preço fictício como real.</Text>
        <Text style={styles.version}>CompraFácil · Android · versão 1.1.0</Text>
      </Card>

      <Modal visible={dialog !== null} transparent animationType="fade" onRequestClose={() => !busy && setDialog(null)} accessibilityViewIsModal>
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <ScrollView contentContainerStyle={styles.dialogContent} showsVerticalScrollIndicator={false}>
            {dialog === "remote" ? <>
              <View style={styles.dialogIcon}><Ionicons name="cloud-outline" size={24} color={C.leaf} /></View>
              <Text style={styles.dialogTitle}>Já existe uma cópia desta instalação</Text>
              <Text style={textStyles.secondary}>Escolha explicitamente o que fazer. Não vamos substituir os dados locais nem remotos sem a sua decisão.</Text>
              <ActionButton title="Restaurar cópia remota" icon="download-outline" onPress={() => setDialog("restore")} disabled={busy} />
              <ActionButton title="Substituir pela cópia deste Android" icon="cloud-upload-outline" onPress={() => setDialog("replace")} disabled={busy} destructive />
              <TextButton title="Cancelar" onPress={() => setDialog(null)} disabled={busy} />
            </> : activeDialog ? <>
              <View style={[styles.dialogIcon, activeDialog.destructive && styles.dialogIconDestructive]}><Ionicons name={activeDialog.destructive ? "warning-outline" : "lock-closed-outline"} size={24} color={activeDialog.destructive ? "#A84135" : C.leaf} /></View>
              <Text style={styles.dialogTitle}>{activeDialog.title}</Text>
              <Text style={textStyles.secondary}>{activeDialog.body}</Text>
              <ActionButton title={busy ? "Aguarde…" : activeDialog.primary} icon={activeDialog.destructive ? "trash-outline" : "shield-checkmark-outline"} onPress={() => {
                if (dialog === "consent") void activateBackup();
                else if (dialog === "restore") void runAction(() => restoreRemoteBackup(db));
                else if (dialog === "replace") void runAction(() => replaceRemoteWithLocal(db));
                else if (dialog === "delete") void runAction(deleteRemoteBackup);
              }} disabled={busy} destructive={activeDialog.destructive} />
              <TextButton title="Cancelar" onPress={() => setDialog(null)} disabled={busy} />
            </> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

function ActionButton({ title, icon, onPress, disabled, secondary, destructive }: { title: string; icon: React.ComponentProps<typeof Ionicons>["name"]; onPress: () => void; disabled?: boolean; secondary?: boolean; destructive?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} style={[styles.actionButton, secondary && styles.secondaryButton, destructive && styles.destructiveButton, disabled && styles.disabledButton]}>
    <Ionicons name={icon} size={18} color={destructive ? "#A84135" : secondary ? C.leaf : C.paper} />
    <Text style={[styles.actionText, secondary && styles.secondaryActionText, destructive && styles.destructiveActionText]}>{title}</Text>
  </Pressable>;
}

function TextButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={styles.textButton}>
    <Text style={styles.textButtonLabel}>{title}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  sectionTitle: { color: C.leafDark, fontSize: 16, fontWeight: "800" },
  optionCard: { padding: 14 },
  selectedOption: { borderColor: "#9FBF83", backgroundColor: "#F8FAF1", borderWidth: 1.5 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  optionTitle: { color: C.leafDark, fontSize: 14, fontWeight: "800" },
  privacyCard: { backgroundColor: C.paleGreen, borderColor: "#DDE8D6", gap: 11 },
  privacyHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  privacyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.paper, alignItems: "center", justifyContent: "center" },
  backupCard: { borderColor: "#DDE8D6", gap: 12 },
  backupHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  backupIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  backupMetadata: { backgroundColor: "#F8FAF1", borderRadius: 12, padding: 12, gap: 4 },
  metaLabel: { color: C.muted, fontSize: 11, fontWeight: "700" },
  metaValue: { color: C.leafDark, fontSize: 13, fontWeight: "800" },
  privacyFinePrint: { color: C.muted, fontSize: 12, lineHeight: 17 },
  sourceCard: { backgroundColor: "#FFFCF5", borderColor: "#F0E6D2", gap: 8 },
  version: { color: C.muted, fontSize: 11, fontWeight: "700", marginTop: 3 },
  actionButton: { minHeight: 46, borderRadius: 13, backgroundColor: C.leaf, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 14 },
  secondaryButton: { backgroundColor: C.paleGreen, borderWidth: 1, borderColor: "#DDE8D6" },
  destructiveButton: { backgroundColor: "#FFF1ED", borderWidth: 1, borderColor: "#F1CCC4" },
  disabledButton: { opacity: 0.55 },
  actionText: { color: C.paper, fontSize: 13, fontWeight: "800" },
  secondaryActionText: { color: C.leafDark },
  destructiveActionText: { color: "#A84135" },
  syncing: { flexDirection: "row", alignItems: "center", gap: 10 },
  errorText: { color: "#A84135", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  successText: { color: C.leaf, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  fineWarning: { color: "#875B18", fontSize: 12, lineHeight: 17 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17, 36, 28, 0.48)", justifyContent: "center", alignItems: "center", padding: 18 },
  dialogCard: { width: "100%", maxWidth: 480, maxHeight: "90%", borderRadius: 22, backgroundColor: C.paper, padding: 20, gap: 13 },
  dialogContent: { gap: 13 },
  dialogIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.paleGreen, alignItems: "center", justifyContent: "center" },
  dialogIconDestructive: { backgroundColor: "#FFF1ED" },
  dialogTitle: { color: C.leafDark, fontSize: 18, fontWeight: "900" },
  textButton: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  textButtonLabel: { color: C.muted, fontSize: 13, fontWeight: "700" },
});
