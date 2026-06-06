import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BillingCycle,
  DUE_WINDOW_DAYS,
  Lease,
  TenantNotification,
  daysUntil,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  // Reject auto-normalized impossible dates (e.g. 2026-02-31 → Mar 3).
  const [y, m, day] = s.split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
}

export default function LeasesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isAr } = useLocale();
  const tl = t.lease;
  const {
    properties,
    tenants,
    leases,
    notifications,
    addLease,
    deleteLease,
    markRentPaid,
    leaseAlerts,
  } = useApp();

  const [showForm, setShowForm] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────
  const [fName, setFName] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPropertyId, setFPropertyId] = useState<string | undefined>(undefined);
  const [fUnit, setFUnit] = useState("");
  const [fRent, setFRent] = useState("");
  const [fCycle, setFCycle] = useState<BillingCycle>("monthly");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fContract, setFContract] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState("");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + 32;

  const priceLocale = isAr ? "ar-SA" : "en-US";
  const fmtMoney = (n: number) => n.toLocaleString(priceLocale);

  const tenantById = useMemo(() => {
    const m: Record<string, string> = {};
    tenants.forEach((tn) => (m[tn.id] = tn.name));
    return m;
  }, [tenants]);

  const propertyLabel = (id?: string) => {
    if (!id) return undefined;
    const p = properties.find((x) => x.id === id);
    if (!p) return undefined;
    return p.title ?? `${(t.propertyTypes as Record<string, string>)[p.type] ?? p.type} — ${p.location.city}`;
  };

  const cycleLabel = (c: BillingCycle) =>
    c === "monthly" ? tl.cycleMonthly : c === "quarterly" ? tl.cycleQuarterly : tl.cycleAnnual;

  function resetForm() {
    setFName("");
    setFPhone("");
    setFEmail("");
    setFPropertyId(undefined);
    setFUnit("");
    setFRent("");
    setFCycle("monthly");
    setFStart("");
    setFEnd("");
    setFContract(undefined);
    setFormError("");
  }

  async function pickContract() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status === "granted" && Platform.OS !== "web") {
        const r = await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          quality: 0.6,
          allowsEditing: true,
        });
        if (!r.canceled && r.assets[0]) {
          setFContract(r.assets[0].uri);
          return;
        }
      }
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (lib.status !== "granted") return;
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.6,
        allowsEditing: true,
      });
      if (!r.canceled && r.assets[0]) setFContract(r.assets[0].uri);
    } catch {}
  }

  function handleSave() {
    if (!fName.trim() || !fPhone.trim() || !fRent.trim() || !fStart.trim() || !fEnd.trim()) {
      setFormError(tl.requiredFields);
      return;
    }
    if (!isValidDate(fStart) || !isValidDate(fEnd)) {
      setFormError(tl.invalidDate);
      return;
    }
    if (new Date(fEnd + "T00:00:00") <= new Date(fStart + "T00:00:00")) {
      setFormError(tl.invalidRange);
      return;
    }
    const rent = parseInt(fRent.replace(/[^\d]/g, ""), 10);
    if (!rent || rent <= 0) {
      setFormError(tl.requiredFields);
      return;
    }
    addLease({
      tenant: { name: fName.trim(), phone: fPhone.trim(), email: fEmail.trim() || undefined },
      propertyId: fPropertyId,
      unitLabel: fUnit.trim() || undefined,
      rentAmount: rent,
      cycle: fCycle,
      startDate: fStart,
      endDate: fEnd,
      contractImageUri: fContract,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetForm();
    setShowForm(false);
  }

  function handleMarkPaid(lease: Lease) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markRentPaid(lease.id);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.alert(tl.paidToast);
    } else {
      Alert.alert(tl.paidToast);
    }
  }

  function handleDelete(lease: Lease) {
    const doDelete = () => {
      deleteLease(lease.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined"
          ? window.confirm(`${tl.deleteConfirmTitle}\n\n${tl.deleteConfirmMsg}`)
          : true;
      if (ok) doDelete();
      return;
    }
    Alert.alert(tl.deleteConfirmTitle, tl.deleteConfirmMsg, [
      { text: tl.cancel, style: "cancel" },
      { text: tl.delete, style: "destructive", onPress: doDelete },
    ]);
  }

  async function viewContract(uri: string) {
    try {
      await WebBrowser.openBrowserAsync(uri);
    } catch {}
  }

  const s = makeStyles(colors, isAr, topPad);

  const alertCount = leaseAlerts.dueSoon.length + leaseAlerts.expiringSoon.length;

  return (
    <View style={s.container}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={[s.headerRow, isAr && { flexDirection: "row-reverse" }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
            <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, isAr && { textAlign: "right" }]}>{tl.title}</Text>
            <Text style={[s.headerSub, isAr && { textAlign: "right" }]}>{tl.subtitle}</Text>
          </View>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              resetForm();
              setShowForm(true);
            }}
            style={s.addBtn}
            hitSlop={8}
          >
            <MaterialIcons name="add" size={22} color="#0A1628" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{tl.alertsTitle}</Text>
          {alertCount === 0 ? (
            <View style={s.alertEmpty}>
              <MaterialIcons name="check-circle" size={18} color={colors.success} />
              <Text style={s.alertEmptyText}>{tl.noAlerts}</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {leaseAlerts.dueSoon.length > 0 && (
                <View style={[s.alertCard, { borderColor: "#D97706" }]}>
                  <View style={[s.alertIcon, { backgroundColor: "#FEF3C7" }]}>
                    <MaterialIcons name="payments" size={18} color="#B45309" />
                  </View>
                  <Text style={s.alertText}>{tl.dueSoon(leaseAlerts.dueSoon.length)}</Text>
                </View>
              )}
              {leaseAlerts.expiringSoon.length > 0 && (
                <View style={[s.alertCard, { borderColor: "#DC2626" }]}>
                  <View style={[s.alertIcon, { backgroundColor: "#FEE2E2" }]}>
                    <MaterialIcons name="event-busy" size={18} color="#DC2626" />
                  </View>
                  <Text style={s.alertText}>{tl.expiringSoon(leaseAlerts.expiringSoon.length)}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Lease list ──────────────────────────────────────────────────── */}
        {leases.length === 0 ? (
          <View style={s.empty}>
            <MaterialIcons name="description" size={52} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>{tl.emptyTitle}</Text>
            <Text style={s.emptySubtitle}>{tl.emptySubtitle}</Text>
            <Pressable
              style={s.emptyAddBtn}
              onPress={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <MaterialIcons name="add" size={18} color="#FFFFFF" />
              <Text style={s.emptyAddText}>{tl.addLease}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{tl.title}</Text>
            {leases.map((lease) => {
              const dueIn = daysUntil(lease.nextDueDate);
              const expIn = daysUntil(lease.endDate);
              const dueColor =
                dueIn < 0 ? "#DC2626" : dueIn <= DUE_WINDOW_DAYS ? "#D97706" : "#16A34A";
              const propLabel = propertyLabel(lease.propertyId);
              return (
                <View key={lease.id} style={s.leaseCard}>
                  <View style={[s.leaseTop, isAr && { flexDirection: "row-reverse" }]}>
                    <View style={s.tenantAvatar}>
                      <Text style={s.tenantAvatarText}>
                        {(tenantById[lease.tenantId] ?? "?").charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.tenantName, isAr && { textAlign: "right" }]} numberOfLines={1}>
                        {tenantById[lease.tenantId] ?? "—"}
                      </Text>
                      {(propLabel || lease.unitLabel) && (
                        <Text style={[s.leaseSub, isAr && { textAlign: "right" }]} numberOfLines={1}>
                          {[propLabel, lease.unitLabel].filter(Boolean).join(" · ")}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        s.statusChip,
                        { backgroundColor: lease.status === "active" ? "#DCFCE7" : colors.muted },
                      ]}
                    >
                      <Text
                        style={[
                          s.statusChipText,
                          { color: lease.status === "active" ? "#16A34A" : colors.mutedForeground },
                        ]}
                      >
                        {lease.status === "active" ? tl.statusActive : tl.statusEnded}
                      </Text>
                    </View>
                  </View>

                  <View style={s.leaseMetaGrid}>
                    <View style={s.metaCell}>
                      <Text style={s.metaLabel}>{tl.rentLabel}</Text>
                      <Text style={s.metaValue}>
                        {fmtMoney(lease.rentAmount)} <Text style={s.metaUnit}>{isAr ? "ريال" : "SAR"}</Text>
                      </Text>
                      <Text style={s.metaUnit}>{cycleLabel(lease.cycle)}</Text>
                    </View>
                    <View style={s.metaCell}>
                      <Text style={s.metaLabel}>{tl.nextDue}</Text>
                      <Text style={s.metaValue}>{lease.nextDueDate}</Text>
                      <Text style={[s.metaPill, { color: dueColor, backgroundColor: dueColor + "1A" }]}>
                        {dueIn < 0 ? tl.overdue : tl.daysLeft(dueIn)}
                      </Text>
                    </View>
                    <View style={s.metaCell}>
                      <Text style={s.metaLabel}>{tl.expires}</Text>
                      <Text style={s.metaValue}>{lease.endDate}</Text>
                      <Text
                        style={[
                          s.metaPill,
                          {
                            color: expIn <= 90 ? "#DC2626" : colors.mutedForeground,
                            backgroundColor: (expIn <= 90 ? "#DC2626" : colors.mutedForeground) + "1A",
                          },
                        ]}
                      >
                        {expIn < 0 ? tl.overdue : tl.daysLeft(expIn)}
                      </Text>
                    </View>
                  </View>

                  {lease.payments.length > 0 && (
                    <Text style={[s.paymentsCount, isAr && { textAlign: "right" }]}>
                      {tl.paymentsCount(lease.payments.length)}
                    </Text>
                  )}

                  <View style={[s.leaseActions, isAr && { flexDirection: "row-reverse" }]}>
                    <Pressable
                      style={({ pressed }) => [s.paidBtn, pressed && { opacity: 0.85 }]}
                      onPress={() => handleMarkPaid(lease)}
                    >
                      <MaterialIcons name="check" size={16} color="#0A1628" />
                      <Text style={s.paidBtnText}>{tl.markPaid}</Text>
                    </Pressable>
                    {lease.contractImageUri && (
                      <Pressable
                        style={s.iconActionBtn}
                        onPress={() => viewContract(lease.contractImageUri!)}
                        hitSlop={6}
                      >
                        <MaterialIcons name="description" size={18} color={colors.gold} />
                      </Pressable>
                    )}
                    <Pressable style={s.iconActionBtn} onPress={() => handleDelete(lease)} hitSlop={6}>
                      <MaterialIcons name="delete-outline" size={18} color={colors.destructive} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Notifications log ───────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{tl.notificationsTitle}</Text>
          <Text style={[s.sectionDesc, isAr && { textAlign: "right" }]}>{tl.notificationsDesc}</Text>
          {notifications.length === 0 ? (
            <View style={s.alertEmpty}>
              <MaterialIcons name="notifications-none" size={18} color={colors.mutedForeground} />
              <Text style={s.alertEmptyText}>{tl.noNotifications}</Text>
            </View>
          ) : (
            <View style={s.card}>
              {notifications.slice(0, 30).map((n, i) => (
                <NotificationRow
                  key={n.id}
                  notif={n}
                  tenantName={tenantById[n.tenantId]}
                  isFirst={i === 0}
                  s={s}
                  isAr={isAr}
                  tl={tl}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Add Lease Modal ─────────────────────────────────────────────────── */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={s.modalSheet}
          >
            <View style={[s.modalHeader, isAr && { flexDirection: "row-reverse" }]}>
              <Text style={s.modalTitle}>{tl.newLease}</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={10}>
                <MaterialIcons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {formError ? (
                <View style={s.errorBox}>
                  <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                  <Text style={s.errorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={s.formSection}>{tl.tenantSection}</Text>
              <Field label={tl.tenantName} value={fName} onChange={setFName} s={s} isAr={isAr} colors={colors} />
              <Field
                label={tl.tenantPhone}
                value={fPhone}
                onChange={setFPhone}
                keyboardType="phone-pad"
                s={s}
                isAr={isAr}
                colors={colors}
              />
              <Field
                label={tl.tenantEmail}
                value={fEmail}
                onChange={setFEmail}
                keyboardType="email-address"
                s={s}
                isAr={isAr}
                colors={colors}
              />

              <Text style={s.formSection}>{tl.leaseSection}</Text>

              {/* Property picker */}
              <Text style={[s.fieldLabel, isAr && { textAlign: "right" }]}>{tl.propertyLabel}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[s.chipRow, isAr && { flexDirection: "row-reverse" }]}
              >
                <Pressable
                  onPress={() => setFPropertyId(undefined)}
                  style={[s.chip, fPropertyId === undefined && s.chipActive]}
                >
                  <Text style={[s.chipText, fPropertyId === undefined && s.chipTextActive]}>
                    {tl.propertyNone}
                  </Text>
                </Pressable>
                {properties.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setFPropertyId(p.id)}
                    style={[s.chip, fPropertyId === p.id && s.chipActive]}
                  >
                    <Text style={[s.chipText, fPropertyId === p.id && s.chipTextActive]} numberOfLines={1}>
                      {p.title ?? `${(t.propertyTypes as Record<string, string>)[p.type] ?? p.type} — ${p.location.city}`}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Field
                label={tl.unitLabel}
                value={fUnit}
                onChange={setFUnit}
                placeholder={tl.unitPlaceholder}
                s={s}
                isAr={isAr}
                colors={colors}
              />
              <Field
                label={tl.rentAmount}
                value={fRent}
                onChange={setFRent}
                keyboardType="number-pad"
                s={s}
                isAr={isAr}
                colors={colors}
              />

              {/* Cycle picker */}
              <Text style={[s.fieldLabel, isAr && { textAlign: "right" }]}>{tl.cycle}</Text>
              <View style={[s.chipRow, isAr && { flexDirection: "row-reverse" }]}>
                {(["monthly", "quarterly", "annual"] as BillingCycle[]).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setFCycle(c)}
                    style={[s.chip, fCycle === c && s.chipActive]}
                  >
                    <Text style={[s.chipText, fCycle === c && s.chipTextActive]}>{cycleLabel(c)}</Text>
                  </Pressable>
                ))}
              </View>

              <Field
                label={tl.startDate}
                value={fStart}
                onChange={setFStart}
                placeholder={tl.datePlaceholder}
                s={s}
                isAr={isAr}
                colors={colors}
              />
              <Field
                label={tl.endDate}
                value={fEnd}
                onChange={setFEnd}
                placeholder={tl.datePlaceholder}
                s={s}
                isAr={isAr}
                colors={colors}
              />

              {/* Contract scanner */}
              <Pressable style={s.scanBtn} onPress={pickContract}>
                <MaterialIcons
                  name={fContract ? "check-circle" : "document-scanner"}
                  size={20}
                  color={fContract ? colors.success : colors.gold}
                />
                <Text style={[s.scanBtnText, fContract && { color: colors.success }]}>
                  {fContract ? tl.contractScanned : tl.scanContract}
                </Text>
              </Pressable>
              {fContract && <Image source={{ uri: fContract }} style={s.contractPreview} resizeMode="cover" />}

              <Pressable style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>{tl.save}</Text>
              </Pressable>
              <Pressable style={s.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={s.cancelBtnText}>{tl.cancel}</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ── Notification row ────────────────────────────────────────────────────────
function NotificationRow({
  notif,
  tenantName,
  isFirst,
  s,
  isAr,
  tl,
  colors,
}: {
  notif: TenantNotification;
  tenantName?: string;
  isFirst: boolean;
  s: ReturnType<typeof makeStyles>;
  isAr: boolean;
  tl: ReturnType<typeof useLocale>["t"]["lease"];
  colors: ReturnType<typeof useColors>;
}) {
  const meta: Record<TenantNotification["type"], { icon: React.ComponentProps<typeof MaterialIcons>["name"]; color: string; label: string }> = {
    rent_due: { icon: "payments", color: "#D97706", label: tl.notifRentDue },
    lease_expiry: { icon: "event-busy", color: "#DC2626", label: tl.notifLeaseExpiry },
    payment_confirmed: { icon: "check-circle", color: "#16A34A", label: tl.notifPaymentConfirmed },
  };
  const m = meta[notif.type];
  return (
    <View style={[s.notifRow, !isFirst && s.notifDivider, isAr && { flexDirection: "row-reverse" }]}>
      <View style={[s.notifIcon, { backgroundColor: m.color + "1A" }]}>
        <MaterialIcons name={m.icon} size={16} color={m.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={[s.notifHeadRow, isAr && { flexDirection: "row-reverse" }]}>
          <Text style={[s.notifLabel, { color: m.color }]}>{m.label}</Text>
          {tenantName ? <Text style={s.notifTenant}>· {tenantName}</Text> : null}
        </View>
        <Text style={[s.notifMsg, isAr && { textAlign: "right" }]}>{notif.message}</Text>
      </View>
    </View>
  );
}

// ── Reusable input field ────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  s,
  isAr,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "phone-pad" | "email-address";
  s: ReturnType<typeof makeStyles>;
  isAr: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[s.fieldLabel, isAr && { textAlign: "right" }]}>{label}</Text>
      <TextInput
        style={[s.input, { textAlign: isAr ? "right" : "left" }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, isAr: boolean, topPad: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.navy,
      paddingTop: topPad + 14,
      paddingBottom: 18,
      paddingHorizontal: 16,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: "rgba(255,255,255,0.08)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold" },
    headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.gold,
      alignItems: "center",
      justifyContent: "center",
    },

    section: { marginTop: 18, paddingHorizontal: 16 },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      textAlign: isAr ? "right" : "left",
    },
    sectionDesc: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: -4,
      marginBottom: 10,
    },

    // Alerts
    alertEmpty: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
    },
    alertEmptyText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    alertCard: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderLeftWidth: isAr ? 0 : 4,
      borderRightWidth: isAr ? 4 : 0,
    },
    alertIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
    alertText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: isAr ? "right" : "left" },

    // Lease card
    leaseCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    leaseTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
    tenantAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.navy,
      alignItems: "center",
      justifyContent: "center",
    },
    tenantAvatarText: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
    tenantName: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    leaseSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusChipText: { fontSize: 11, fontFamily: "Inter_700Bold" },

    leaseMetaGrid: {
      flexDirection: isAr ? "row-reverse" : "row",
      justifyContent: "space-between",
      gap: 8,
    },
    metaCell: { flex: 1, gap: 3, alignItems: isAr ? "flex-end" : "flex-start" },
    metaLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.3 },
    metaValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },
    metaUnit: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    metaPill: {
      fontSize: 10,
      fontFamily: "Inter_700Bold",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 5,
      overflow: "hidden",
    },

    paymentsCount: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.success, marginTop: 12 },

    leaseActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    paidBtn: {
      flex: 1,
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.gold,
      borderRadius: 10,
      paddingVertical: 10,
    },
    paidBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0A1628" },
    iconActionBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },

    // Empty
    empty: { alignItems: "center", paddingTop: 50, paddingHorizontal: 32, gap: 12 },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" },
    emptyAddBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.navy,
      borderRadius: 12,
      paddingHorizontal: 22,
      paddingVertical: 12,
      marginTop: 6,
    },
    emptyAddText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },

    // Notifications
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    notifRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
    notifDivider: { borderTopWidth: 1, borderTopColor: colors.border },
    notifIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    notifHeadRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
    notifLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
    notifTenant: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    notifMsg: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 19 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 28,
      maxHeight: "92%",
    },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    formSection: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: colors.gold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 8,
      marginBottom: 12,
      textAlign: isAr ? "right" : "left",
    },
    fieldLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      marginBottom: 6,
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.card,
    },
    chipRow: { gap: 8, paddingVertical: 2, marginBottom: 12, flexDirection: "row", flexWrap: "wrap" },
    chip: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      maxWidth: 200,
    },
    chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    chipTextActive: { color: "#0A1628" },

    scanBtn: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.gold,
      borderRadius: 12,
      paddingVertical: 14,
      marginTop: 4,
      marginBottom: 12,
    },
    scanBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.gold },
    contractPreview: { width: "100%", height: 160, borderRadius: 12, marginBottom: 14 },

    saveBtn: {
      backgroundColor: colors.navy,
      borderRadius: 13,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
    },
    saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    cancelBtn: { alignItems: "center", paddingVertical: 14 },
    cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },

    errorBox: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#FEF2F2",
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
    },
    errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#DC2626", textAlign: isAr ? "right" : "left" },
  });
}
