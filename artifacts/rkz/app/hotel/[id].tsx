import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLocale } from "@/hooks/useLocale";
import { HOTEL_LISTINGS } from "@/constants/mockTourism";

const NAVY = "#0f2040";
const GOLD  = "#c9a84c";
const GREEN = "#22c55e";

// ── Date helpers ───────────────────────────────────────────────────────────────
function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayAfter(dateStr: string, days = 1) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, "0");
  const nd = String(dt.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function nightsBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = new Date(ay, am - 1, ad);
  const db = new Date(by, bm - 1, bd);
  const diff = (db.getTime() - da.getTime()) / 86400000;
  return Math.max(1, Math.floor(diff));
}

function fmtDate(dateStr: string, isAr: boolean) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const locale = isAr ? "ar-SA" : "en-GB";
  return dt.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

// ── Amenity row ────────────────────────────────────────────────────────────────
function AmenityIcon({ label }: { label: string }) {
  return (
    <View style={s.amenRow}>
      <MaterialIcons name="check-circle" size={16} color={GREEN} />
      <Text style={s.amenTxt}>{label}</Text>
    </View>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function HotelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, isAr } = useLocale();
  const tour = t.tourism;

  const hotel = HOTEL_LISTINGS.find((h) => h.id === id);

  const [checkIn,  setCheckIn]  = useState(today());
  const [checkOut, setCheckOut] = useState(dayAfter(today(), 2));
  const [guests,   setGuests]   = useState(2);
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [booked,   setBooked]   = useState(false);

  if (!hotel) {
    return (
      <SafeAreaView style={s.safe}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={NAVY} />
          <Text style={s.backTxt}>{t.common.back}</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: NAVY, fontFamily: "Inter_600SemiBold" }}>Hotel not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const nights = nightsBetween(checkIn, checkOut);
  const total  = nights * hotel.pricePerNight;

  const stars    = "★".repeat(hotel.stars) + "☆".repeat(5 - hotel.stars);
  const typeLabel = hotel.type === "hotel" ? tour.hotelType : tour.apartmentType;
  const amenities = isAr ? hotel.amenitiesAr : hotel.amenitiesEn;

  function handleBook() {
    if (!name.trim() || !phone.trim()) {
      Alert.alert(
        isAr ? "بيانات ناقصة" : "Missing Info",
        isAr ? "يرجى إدخال اسمك ورقم جوالك" : "Please enter your name and phone number",
      );
      return;
    }
    setBooked(true);
  }

  function handleCall() {
    Linking.openURL(`tel:${hotel.phone}`);
  }

  if (booked) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
        <View style={s.successBox}>
          <MaterialIcons name="check-circle" size={64} color={GREEN} />
          <Text style={[s.successTitle, isAr && s.rtl]}>{tour.booked}</Text>
          <Text style={[s.successSub, isAr && s.rtl]}>{tour.bookedSub}</Text>
          <View style={s.successDetails}>
            <Text style={[s.successHotel, isAr && s.rtl]}>
              {isAr ? hotel.nameAr : hotel.nameEn}
            </Text>
            <Text style={s.successMeta}>
              {fmtDate(checkIn, isAr)} → {fmtDate(checkOut, isAr)}
            </Text>
            <Text style={s.successMeta}>
              {tour.nights(nights)} · {total.toLocaleString()} {isAr ? "ر.س" : "SAR"}
            </Text>
          </View>
          <Pressable
            style={s.doneBtn}
            onPress={() => router.replace("/(tabs)/explore" as never)}
          >
            <Text style={s.doneBtnTxt}>{isAr ? "العودة للتصفح" : "Back to Explore"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header image */}
      <View style={s.imgWrap}>
        <Image source={{ uri: hotel.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(15,32,64,0.25)" }]} />

        {/* Back button */}
        <Pressable style={s.backFab} onPress={() => router.back()}>
          <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color={NAVY} />
        </Pressable>

        {/* Type badge */}
        <View style={s.imgBadge}>
          <Text style={s.imgBadgeTxt}>{typeLabel}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Info block ── */}
        <View style={s.infoBlock}>
          {/* Stars */}
          <Text style={s.starsRow}>{stars}</Text>
          <Text style={[s.hotelName, isAr && s.rtl]}>
            {isAr ? hotel.nameAr : hotel.nameEn}
          </Text>

          {/* Location */}
          <View style={[s.row, isAr && s.rowRev]}>
            <MaterialIcons name="location-on" size={14} color={GOLD} />
            <Text style={s.locTxt}>
              {isAr ? hotel.city : hotel.cityEn} · {isAr ? hotel.district : hotel.districtEn}
            </Text>
          </View>

          {/* Rating row */}
          <View style={[s.row, isAr && s.rowRev, { marginTop: 8 }]}>
            <Text style={s.ratingVal}>★ {hotel.rating.toFixed(1)}</Text>
            <Text style={s.reviewCnt}>({hotel.reviewCount.toLocaleString()})</Text>
            <Pressable style={s.callBtn} onPress={handleCall}>
              <MaterialIcons name="phone" size={14} color={GOLD} />
              <Text style={s.callTxt}>{tour.call}</Text>
            </Pressable>
          </View>

          {/* Description */}
          <Text style={[s.desc, isAr && s.rtl]}>
            {isAr ? hotel.descAr : hotel.descEn}
          </Text>

          {/* Amenities */}
          <Text style={[s.secTitle, isAr && s.rtl]}>{tour.amenities}</Text>
          <View style={s.amenGrid}>
            {amenities.map((a) => (
              <AmenityIcon key={a} label={a} />
            ))}
          </View>
        </View>

        {/* ── Booking form ── */}
        <View style={s.bookCard}>
          <Text style={[s.bookTitle, isAr && s.rtl]}>{tour.bookNow}</Text>

          {/* Price */}
          <View style={[s.priceRow, isAr && s.rowRev]}>
            <Text style={s.priceNum}>{hotel.pricePerNight.toLocaleString()}</Text>
            <Text style={s.priceCurr}>{isAr ? " ر.س" : " SAR"}</Text>
            <Text style={s.perNight}> / {isAr ? "ليلة" : "night"}</Text>
          </View>

          {/* Date inputs */}
          <View style={[s.datesRow, isAr && s.rowRev]}>
            <View style={s.dateField}>
              <Text style={[s.dateLabel, isAr && s.rtl]}>{tour.checkIn}</Text>
              <TextInput
                style={[s.dateInput, isAr && s.rtl]}
                value={checkIn}
                onChangeText={(v) => {
                  setCheckIn(v);
                  if (v > checkOut) setCheckOut(dayAfter(v, 1));
                }}
                placeholder="YYYY-MM-DD"
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
              />
            </View>
            <MaterialIcons name="arrow-forward" size={18} color="rgba(15,32,64,0.35)" />
            <View style={s.dateField}>
              <Text style={[s.dateLabel, isAr && s.rtl]}>{tour.checkOut}</Text>
              <TextInput
                style={[s.dateInput, isAr && s.rtl]}
                value={checkOut}
                onChangeText={setCheckOut}
                placeholder="YYYY-MM-DD"
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
              />
            </View>
          </View>

          {/* Guests */}
          <Text style={[s.dateLabel, isAr && s.rtl, { marginBottom: 4 }]}>{tour.guests}</Text>
          <View style={[s.guestRow, isAr && s.rowRev]}>
            <Pressable
              style={s.guestBtn}
              onPress={() => setGuests((g) => Math.max(1, g - 1))}
            >
              <MaterialIcons name="remove" size={18} color={NAVY} />
            </Pressable>
            <Text style={s.guestNum}>{guests}</Text>
            <Pressable style={s.guestBtn} onPress={() => setGuests((g) => g + 1)}>
              <MaterialIcons name="add" size={18} color={NAVY} />
            </Pressable>
          </View>

          {/* Name */}
          <Text style={[s.dateLabel, isAr && s.rtl, { marginBottom: 4, marginTop: 12 }]}>
            {isAr ? "الاسم الكامل" : "Full Name"}
          </Text>
          <TextInput
            style={[s.textField, isAr && s.rtl]}
            value={name}
            onChangeText={setName}
            placeholder={isAr ? "أدخل اسمك..." : "Enter your name..."}
            placeholderTextColor="rgba(15,32,64,0.35)"
          />

          {/* Phone */}
          <Text style={[s.dateLabel, isAr && s.rtl, { marginBottom: 4, marginTop: 10 }]}>
            {isAr ? "رقم الجوال" : "Phone Number"}
          </Text>
          <TextInput
            style={[s.textField, isAr && s.rtl]}
            value={phone}
            onChangeText={setPhone}
            placeholder={isAr ? "05xxxxxxxx" : "05xxxxxxxx"}
            placeholderTextColor="rgba(15,32,64,0.35)"
            keyboardType="phone-pad"
          />

          {/* Summary */}
          <View style={s.summaryBox}>
            <View style={[s.summaryRow, isAr && s.rowRev]}>
              <Text style={s.summaryLabel}>{tour.nights(nights)}</Text>
              <Text style={s.summaryVal}>
                {total.toLocaleString()} {isAr ? "ر.س" : "SAR"}
              </Text>
            </View>
            <View style={[s.summaryRow, s.summaryTotal, isAr && s.rowRev]}>
              <Text style={s.totalLabel}>{tour.totalCost}</Text>
              <Text style={s.totalVal}>
                {total.toLocaleString()} {isAr ? "ر.س" : "SAR"}
              </Text>
            </View>
          </View>

          {/* Confirm */}
          <Pressable style={s.confirmBtn} onPress={handleBook}>
            <MaterialIcons name="event-available" size={18} color="#fff" />
            <Text style={s.confirmTxt}>{tour.confirmBook}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f9" },

  imgWrap: { height: 260, position: "relative" },
  backFab: {
    position: "absolute",
    top: 12,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  imgBadge: {
    position: "absolute",
    top: 12,
    right: 16,
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  imgBadgeTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },

  backBtn: { flexDirection: "row", alignItems: "center", padding: 16, gap: 6 },
  backTxt: { fontSize: 14, fontFamily: "Inter_500Medium", color: NAVY },

  infoBlock: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  starsRow: { color: GOLD, fontSize: 14, marginBottom: 6 },
  hotelName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: NAVY,
    marginBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowRev: { flexDirection: "row-reverse" },
  locTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.6)" },
  ratingVal: { fontSize: 15, fontFamily: "Inter_700Bold", color: NAVY },
  reviewCnt: { fontSize: 12, color: "rgba(15,32,64,0.45)", flex: 1 },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(201,168,76,0.12)",
  },
  callTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: GOLD },
  desc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(15,32,64,0.7)",
    lineHeight: 22,
    marginTop: 14,
  },
  secTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: NAVY,
    marginTop: 16,
    marginBottom: 10,
  },
  amenGrid: { gap: 8 },
  amenRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  amenTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: NAVY },

  // Booking card
  bookCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  bookTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: NAVY,
    marginBottom: 10,
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 16 },
  priceNum: { fontSize: 26, fontFamily: "Inter_700Bold", color: NAVY },
  priceCurr: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: NAVY },
  perNight: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.5)" },

  // Dates
  datesRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(15,32,64,0.5)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  dateInput: {
    borderWidth: 1,
    borderColor: "rgba(15,32,64,0.15)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: NAVY,
  },

  // Guests
  guestRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 4 },
  guestBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,32,64,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  guestNum: { fontSize: 18, fontFamily: "Inter_700Bold", color: NAVY, width: 28, textAlign: "center" },

  // Text field
  textField: {
    borderWidth: 1,
    borderColor: "rgba(15,32,64,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: NAVY,
  },

  // Summary
  summaryBox: {
    backgroundColor: "rgba(15,32,64,0.04)",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    gap: 8,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.6)" },
  summaryVal: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: NAVY },
  summaryTotal: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,32,64,0.08)",
  },
  totalLabel: { fontSize: 14, fontFamily: "Inter_700Bold", color: NAVY },
  totalVal: { fontSize: 16, fontFamily: "Inter_700Bold", color: GOLD },

  // Confirm
  confirmBtn: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  confirmTxt: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  // Success
  successBox: { alignItems: "center", gap: 12 },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: NAVY, textAlign: "center" },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.6)", textAlign: "center", lineHeight: 22 },
  successDetails: {
    backgroundColor: "rgba(15,32,64,0.05)",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    gap: 6,
    marginTop: 8,
  },
  successHotel: { fontSize: 15, fontFamily: "Inter_700Bold", color: NAVY, textAlign: "center" },
  successMeta: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.6)", textAlign: "center" },
  doneBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  doneBtnTxt: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  rtl: { textAlign: "right" },
});
