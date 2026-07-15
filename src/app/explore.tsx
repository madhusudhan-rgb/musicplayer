import { useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CustomModal, ModalConfig } from "../components/CustomModal";

export default function Contact() {
  const scaleTerms = useRef(new Animated.Value(1)).current;
  const scalerndm = useRef(new Animated.Value(1)).current;

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const showModal = (config: ModalConfig) => {
    setModalConfig(config);
    setModalVisible(true);
  };

  const bounce = (scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const exitApp = () => {
    if (Platform.OS === "android") {
      BackHandler.exitApp();
      return;
    }
    showModal({ title: "Exit", message: "Please close the app from the app switcher.", buttons: [{ text: "OK", style: "cancel" }] });
  };

  const showPrivacyAlert = () => {
    showModal({
      title: "Terms & Conditions",
      message:
        "This app is provided for entertainment purposes only, and the developer is not responsible for any damage, harm, or loss resulting from its use.\n\n " +
        "By continuing, you agree to these terms.",
      buttons: [
        {
          text: "Disagree",
          style: "danger",
          onPress: () =>
            showModal({
              title: "Access Denied",
              message: "You must accept the terms to continue using the app.",
              buttons: [
                { text: "Exit", style: "danger", onPress: exitApp },
                { text: "Back" },
              ],
            }),
        },
        {
          text: "Agree",
          onPress: () =>
            showModal({
              title: "Accepted",
              message: "You have agreed to the Terms and Conditions.",
              buttons: [{ text: "Continue" }],
            }),
        },
        {
          text: "Cpyright-policy",
          onPress: () =>
            Linking.openURL(
              "https://creativecommons.org/publicdomain/zero/1.0/legalcode.en"
            ),
        },
      ],
    });
  };

  const buttonData = [
    { scale: scaleTerms, icon: "📄", label: "Terms & Conditions", style: "secondary" as const, onPress: showPrivacyAlert },
    {
      scale: scalerndm,
      icon: "🔗",
      label: "Resources",
      style: "green" as const,
      onPress: () =>
        showModal({
          title: "Resources",
          message:
            "Images sourced from Pinterest. All images provided are owned by their respective owners or the users who post the images in the Website.",
          buttons: [
            { text: "Image#1", onPress: () => Linking.openURL("https://www.pinterest.com/pin/1107955945860886546/") },
            { text: "Image#2", onPress: () => Linking.openURL("https://www.pinterest.com/pin/853854410640464822/") },
            { text: "OK", style: "cancel" },
          ],
        }),
    },
  ];

  return (
    <ImageBackground source={require("../../assets/images/bg1.jpg")} style={styles.background}>
      <View style={styles.overlay} />
      <CustomModal visible={modalVisible} config={modalConfig} onClose={() => setModalVisible(false)} />

      <View style={styles.bg}>
        <View style={styles.header}>
          <Text style={styles.title}>Additional Info</Text>
          <Text style={styles.subtitle}>Contact, legal, and resource links</Text>
        </View>

        <View style={styles.card}>
          {buttonData.map(({ scale, icon, label, style, onPress }) => (
            <Pressable key={label} onPress={() => { bounce(scale); onPress(); }}>
              <Animated.View style={[styles.btn, styles[`btn_${style}`], { transform: [{ scale }] }]}>
                <Text style={styles.btnIcon}>{icon}</Text>
                <Text style={styles.btnText}>{label}</Text>
              </Animated.View>
            </Pressable>
          ))}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.55)" },
  bg: { flex: 1, justifyContent: "center", padding: 24 },
  header: { marginBottom: 24 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 6 },
  card: { gap: 12 },
  btn: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, gap: 12 },
  btn_secondary: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  btn_green: { backgroundColor: "#00cc2c", borderWidth: 1, borderColor: "#00aa24" },
  btnIcon: { fontSize: 20 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700", flex: 1 },
});