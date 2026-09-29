import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Linking, Modal, StyleSheet, Text, View } from "react-native";
import { C, PrimaryButton, SecondaryButton, textStyles } from "@/components/comprafacil-ui";

export function BarcodeScanner({ visible, onCancel, onDetected }: {
  visible: boolean;
  onCancel: () => void;
  onDetected: (rawCode: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [denied, setDenied] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const locked = useRef(false);
  const requested = useRef(false);

  useEffect(() => {
    if (!visible) {
      locked.current = false;
      requested.current = false;
      return;
    }
    if (permission?.granted || requested.current) return;
    requested.current = true;
    void requestPermission()
      .then((result) => setDenied(!result.granted))
      .catch(() => setDenied(true))
  }, [visible, permission?.granted, requestPermission]);

  function handleBarcode(result: BarcodeScanningResult) {
    if (locked.current) return;
    locked.current = true;
    onDetected(result.data);
  }

  function closeScanner() {
    locked.current = false;
    requested.current = false;
    setDenied(false);
    setCameraError(false);
    onCancel();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={closeScanner} statusBarTranslucent>
      <View style={styles.screen}>
        {permission?.granted && !cameraError ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["ean8", "ean13", "upc_a"] }}
            onBarcodeScanned={handleBarcode}
            onMountError={() => setCameraError(true)}
          />
        ) : null}

        {permission?.granted && !cameraError ? (
          <View pointerEvents="box-none" style={styles.overlay}>
            <View style={styles.topBar}><Text style={styles.topTitle}>Escanear código de barras</Text></View>
            <View style={styles.guideArea}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
                <View style={styles.scanLine} />
              </View>
              <Text style={styles.guideText}>Posicione o código dentro da moldura. A leitura para assim que um código for detectado.</Text>
            </View>
            <View style={styles.bottomBar}><SecondaryButton label="Cancelar leitura" icon="close" onPress={onCancel} style={styles.cancelButton} /></View>
          </View>
        ) : (
          <View style={styles.permissionPanel}>
            <Text style={styles.permissionTitle}>{cameraError ? "Câmera indisponível" : denied ? "Permissão da câmera não concedida" : "Preparando scanner"}</Text>
            <Text style={textStyles.secondary}>
              {cameraError
                ? "Não foi possível iniciar a câmera. O CompraFácil continua funcionando; tente novamente ou cadastre o produto manualmente."
                : denied
                  ? "Para escanear, ative a permissão da câmera nas configurações do Android. O restante do app continua disponível sem câmera."
                  : "A permissão será solicitada agora, somente porque você escolheu escanear."}
            </Text>
            {denied || cameraError ? <PrimaryButton label="Abrir configurações do Android" icon="settings-outline" onPress={() => { void Linking.openSettings(); }} /> : null}
            <SecondaryButton label="Voltar sem câmera" onPress={closeScanner} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#101512", justifyContent: "center" },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: "space-between", alignItems: "center", paddingTop: 36, paddingBottom: 26 },
  topBar: { width: "100%", paddingHorizontal: 22, alignItems: "center" },
  topTitle: { color: C.paper, fontSize: 19, fontWeight: "800" },
  guideArea: { width: "100%", alignItems: "center", gap: 20 },
  scanFrame: { width: "82%", height: 170, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.12)" },
  corner: { width: 28, height: 28, position: "absolute", borderColor: C.lime },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  scanLine: { width: "90%", height: 2, backgroundColor: C.lime, opacity: 0.9 },
  guideText: { color: C.paper, fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: 32 },
  bottomBar: { width: "100%", paddingHorizontal: 22 },
  cancelButton: { backgroundColor: C.cream },
  permissionPanel: { backgroundColor: C.cream, margin: 22, padding: 22, borderRadius: 22, gap: 15 },
  permissionTitle: { color: C.leafDark, fontSize: 21, fontWeight: "800" },
});
