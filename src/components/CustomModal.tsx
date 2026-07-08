import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export type ModalButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "danger";
};

export type ModalConfig = {
  title: string;
  message: string;
  buttons: ModalButton[];
};

export function CustomModal({
  visible,
  config,
  onClose,
}: {
  visible: boolean;
  config: ModalConfig | null;
  onClose: () => void;
}) {
  if (!config) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.box}>
          <Text style={s.title}>{config.title}</Text>
          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            <Text style={s.message}>{config.message}</Text>
          </ScrollView>
          <View style={s.divider} />
          <View style={s.btnRow}>
            {config.buttons.map((btn, i) => (
              <Pressable
                key={i}
                style={[
                  s.btn,
                  btn.style === "cancel" && s.btnCancel,
                  btn.style === "danger" && s.btnDanger,
                  i < config.buttons.length - 1 && s.btnBorder,
                  config.buttons.length === 1 && { flex: 1 },
                ]}
                onPress={() => { onClose(); setTimeout(() => btn.onPress?.(), 300); }}
              >
                <Text style={[
                  s.btnText,
                  btn.style === "cancel" && s.btnTextCancel,
                  btn.style === "danger" && s.btnTextDanger,
                ]}>
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 36,
  },
  box: {
    width: "100%",
    backgroundColor: "#12211af1",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  message: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  btnRow: { flexDirection: "row" },
  btn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBorder: { borderRightWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  btnCancel: { backgroundColor: "rgba(255,255,255,0.03)" },
  btnDanger: { backgroundColor: "rgba(255,59,48,0.12)" },
  btnText: { color: "#00cc2c", fontWeight: "700", fontSize: 15 },
  btnTextCancel: { color: "rgba(255,255,255,0.35)" },
  btnTextDanger: { color: "#ff3b30" },
});