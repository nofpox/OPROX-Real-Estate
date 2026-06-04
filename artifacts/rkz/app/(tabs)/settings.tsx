import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

const PLATFORM_ITEMS = [
  { id: "aqar", name: "عقار", icon: "home" as const, color: "#2563EB", connected: true },
  { id: "bayut", name: "بيوت", icon: "villa" as const, color: "#7C3AED", connected: true },
  { id: "wasalt", name: "وصلت", icon: "location-on" as const, color: "#059669", connected: false },
  { id: "property_finder", name: "Property Finder", icon: "apartment" as const, color: "#D97706", connected: false },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser, properties } = useApp();
  const { t, isAr } = useLocale();

  const [authorized, setAuthorized] = useState(user?.authorized ?? false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [notifs, setNotifs] = useState(true);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 + 84 : 84) + 16;

  function handleLogout() {
    Alert.alert(t.settings.logoutTitle, t.settings.logoutMsg, [
      { text: t.settings.cancel, style: "cancel" },
      {
        text: t.settings.logoutConfirm,
        style: "destructive",
        onPress: () => {
          setUser(null);
          router.replace("/login");
        },
      },
    ]);
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.navy,
      paddingTop: topPad + 16,
      paddingBottom: 24,
      paddingHorizontal: 20,
    },
    headerTitle: {
      color: "#FFFFFF",
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      marginBottom: 4,
      textAlign: isAr ? "right" : "left",
    },
    headerSub: {
      color: "rgba(255,255,255,0.55)",
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: isAr ? "right" : "left",
    },
    scroll: { flex: 1 },
    profileCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 16,
      padding: 20,
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 16,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.navy,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold" },
    profileName: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: isAr ? "right" : "left",
    },
    profilePhone: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    profileStats: {
      marginTop: 6,
      flexDirection: isAr ? "row-reverse" : "row",
      gap: 16,
    },
    profileStat: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.gold },
    section: { marginTop: 20, paddingHorizontal: 16 },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      marginBottom: 10,
      paddingHorizontal: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      textAlign: isAr ? "right" : "left",
    },
    settingCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    settingRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    settingDivider: { height: 1, backgroundColor: colors.border, marginLeft: 52 },
    settingIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    settingLabel: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      textAlign: isAr ? "right" : "left",
    },
    authCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    authTitle: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 6,
      textAlign: isAr ? "right" : "left",
    },
    authDesc: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      lineHeight: 20,
      marginBottom: 14,
      textAlign: isAr ? "right" : "left",
    },
    authRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    authStatus: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    platCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    platRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    platIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    platName: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      textAlign: isAr ? "right" : "left",
    },
    connectedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    connectedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    logoutBtn: {
      marginHorizontal: 16,
      marginTop: 20,
      borderRadius: 14,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FEF2F2",
      flexDirection: "row",
      gap: 8,
    },
    logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.destructive },
    version: {
      textAlign: "center",
      marginTop: 16,
      color: colors.mutedForeground,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
  });

  const publishedCount = properties.filter((p) =>
    p.platforms.some((x) => x.status === "published")
  ).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.settings.title}</Text>
        <Text style={styles.headerSub}>{t.settings.subtitle}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.phone?.charAt(3) ?? "م"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name ?? t.settings.ownerFallback}</Text>
            <Text style={styles.profilePhone}>{user ? `+966 ${user.phone}` : "—"}</Text>
            <View style={styles.profileStats}>
              <Text style={styles.profileStat}>{t.settings.propertyCount(properties.length)}</Text>
              <Text style={styles.profileStat}>{t.settings.publishedCount(publishedCount)}</Text>
            </View>
          </View>
        </View>

        {/* Authorization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.settings.authSection}</Text>
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>{t.settings.authTitle}</Text>
            <Text style={styles.authDesc}>{t.settings.authDesc}</Text>
            <View style={styles.authRow}>
              <Text style={[styles.authStatus, { color: authorized ? colors.success : colors.mutedForeground }]}>
                {authorized ? t.settings.authEnabled : t.settings.authDisabled}
              </Text>
              <Switch
                value={authorized}
                onValueChange={(v) => {
                  setAuthorized(v);
                  Haptics.selectionAsync();
                  setUser(user ? { ...user, authorized: v } : null);
                }}
                trackColor={{ false: colors.border, true: colors.gold }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Platform connections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.settings.platformsSection}</Text>
          <View style={styles.platCard}>
            {PLATFORM_ITEMS.map((item, i) => (
              <React.Fragment key={item.id}>
                {i > 0 && <View style={styles.settingDivider} />}
                <View style={styles.platRow}>
                  <View style={[styles.platIcon, { backgroundColor: item.color + "20" }]}>
                    <MaterialIcons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={styles.platName}>{item.name}</Text>
                  <View
                    style={[
                      styles.connectedBadge,
                      { backgroundColor: item.connected ? "#DCFCE7" : colors.muted },
                    ]}
                  >
                    <Text
                      style={[
                        styles.connectedText,
                        { color: item.connected ? "#16A34A" : colors.mutedForeground },
                      ]}
                    >
                      {item.connected ? t.settings.connected : t.settings.notConnected}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.settings.prefsSection}</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIconBox, { backgroundColor: "#EFF6FF" }]}>
                <MaterialIcons name="autorenew" size={20} color="#2563EB" />
              </View>
              <Text style={styles.settingLabel}>{t.settings.autoRenew}</Text>
              <Switch
                value={autoRenew}
                onValueChange={(v) => { setAutoRenew(v); Haptics.selectionAsync(); }}
                trackColor={{ false: colors.border, true: colors.gold }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View style={[styles.settingIconBox, { backgroundColor: "#FFF7ED" }]}>
                <MaterialIcons name="notifications-active" size={20} color="#D97706" />
              </View>
              <Text style={styles.settingLabel}>{t.settings.notifications}</Text>
              <Switch
                value={notifs}
                onValueChange={(v) => { setNotifs(v); Haptics.selectionAsync(); }}
                trackColor={{ false: colors.border, true: colors.gold }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.settingDivider} />
            <Pressable style={styles.settingRow}>
              <View style={[styles.settingIconBox, { backgroundColor: "#F0FDF4" }]}>
                <MaterialIcons name="support-agent" size={20} color="#16A34A" />
              </View>
              <Text style={styles.settingLabel}>{t.settings.support}</Text>
              <MaterialIcons
                name={isAr ? "chevron-left" : "chevron-right"}
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </View>

        {/* Company / About Rkz */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.settings.companySection}</Text>
          <View style={styles.settingCard}>
            <Pressable
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.8 }]}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost";
                const url = Platform.OS === "web"
                  ? "/realestate-portal"
                  : `https://${domain}/realestate-portal`;
                await WebBrowser.openBrowserAsync(url, {
                  presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                  toolbarColor: "#0A1628",
                  controlsColor: "#D4A843",
                });
              }}
            >
              <View style={[styles.settingIconBox, { backgroundColor: "#FEF9EC" }]}>
                <MaterialIcons name="language" size={20} color="#D4A843" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t.settings.visitWebsite}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: isAr ? "right" : "left" }}>
                  {t.settings.visitWebsiteDesc}
                </Text>
              </View>
              <MaterialIcons name="open-in-new" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Investor Portal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.portal.menuTitle}</Text>
          <View style={styles.settingCard}>
            <Pressable
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.8 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/investor-portal");
              }}
            >
              <View style={[styles.settingIconBox, { backgroundColor: "#FEF3C7" }]}>
                <MaterialIcons name="lock" size={20} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t.portal.menuTitle}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: isAr ? "right" : "left" }}>
                  {t.portal.menuDesc}
                </Text>
              </View>
              <MaterialIcons name={isAr ? "chevron-left" : "chevron-right"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Admin Control Panel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.admin.adminEntry}</Text>
          <View style={styles.settingCard}>
            <Pressable
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.8 }]}
              onPress={() => router.push("/admin")}
            >
              <View style={[styles.settingIconBox, { backgroundColor: "#FEF3C7" }]}>
                <MaterialIcons name="security" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t.admin.title}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: isAr ? "right" : "left" }}>
                  {t.admin.adminEntryDesc}
                </Text>
              </View>
              <MaterialIcons name={isAr ? "chevron-left" : "chevron-right"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={18} color={colors.destructive} />
          <Text style={styles.logoutText}>{t.settings.logout}</Text>
        </Pressable>

        <Text style={styles.version}>{t.settings.version}</Text>
      </ScrollView>
    </View>
  );
}
