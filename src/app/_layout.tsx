import "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavbarProvider, useNavbar } from "../context/NavbarContext";

const ACCENT   = "#00cc2c";
const INACTIVE = "rgba(255,255,255,0.3)";

function TabContent() {
  const { showNavbar } = useNavbar();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 12,
          left: 24,
          right: 24,
          height: 64,
          borderRadius: 50,
          backgroundColor: "rgba(18,18,18,0.92)",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          display: showNavbar ? "flex" : "none",
          paddingHorizontal: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 20,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: INACTIVE,
        tabBarItemStyle: {
          paddingVertical: 8,
          borderRadius: 30,
        },
      }}
    >
<Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
          ),
        }}
      />
<Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "code" : "code-outline"} size={26} color={color} />
          ),
        }}
     />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavbarProvider>
          <TabContent />
        </NavbarProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}