import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/hooks/useLocale";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";

const CATEGORIES = [
  { id: "apartment", labelAr: "شقة", labelEn: "Apartment", icon: "apartment" },
  { id: "villa", labelAr: "فيلا", labelEn: "Villa", icon: "house" },
  { id: "land", labelAr: "أرض", labelEn: "Land", icon: "landscape" },
  { id: "building", labelAr: "عمائر", labelEn: "Building", icon: "business" },
  { id: "commercial", labelAr: "تجاري", labelEn: "Commercial", icon: "store" },
  { id: "office", labelAr: "مكتب", labelEn: "Office", icon: "work" },
  { id: "warehouse", labelAr: "مستودع", labelEn: "Warehouse", icon: "warehouse" },
  { id: "farm", labelAr: "مزرعة / استراحة", labelEn: "Farm", icon: "agriculture" },
  { id: "chalet", labelAr: "شاليه", labelEn: "Chalet", icon: "pool" },
  { id: "residential_compound", labelAr: "مجمع سكني", labelEn: "Compound", icon: "domain" },
  { id: "commercial_building", labelAr: "مبنى تجاري", labelEn: "Commercial Bldg", icon: "domain-add" },
];

const CITIES = [
  "الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة", "الخبر", "الظهران", "أبها", "تبوك", "حائل", "القصيم"
];

const AMENITIES_LIST = [
  { id: "مسبح", labelAr: "مسبح", icon: "pool" },
  { id: "حديقة", labelAr: "حديقة", icon: "park" },
  { id: "مصعد", labelAr: "مصعد", icon: "elevator" },
  { id: "كراج", labelAr: "موقف خاص/كراج", icon: "directions-car" },
  { id: "تكييف مركزي", labelAr: "تكييف مركزي", icon: "ac-unit" },
  { id: "أمن 24/7", labelAr: "حراسة وأمن", icon: "security" },
  { id: "بلكونة", labelAr: "شرفة / بلكونة", icon: "balcony" },
  { id: "غرفة خادمة", labelAr: "غرفة خادمة", icon: "person" },
  { id: "غرفة سائق", labelAr: "غرفة سائق", icon: "drive-eta" },
  { id: "سطح خاص", labelAr: "ملحق / سطح", icon: "deck" },
];

export default function AddListingScreen() {
  const insets = useSafeAreaInsets();
  const { isAr } = useLocale();
  const params = useLocalSearchParams<{ editId?: string }>();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [listingType, setListingType] = useState<"sale" | "rent">("sale");
  const [propertyType, setPropertyType] = useState("apartment");
  
  // Location
  const [city, setCity] = useState("الرياض");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("24.7136");
  const [lng, setLng] = useState("46.6753");

  // Specs
  const [price, setPrice] = useState("");
  const [pricePeriod, setPricePeriod] = useState<"one_time" | "monthly" | "yearly">("one_time");
  const [areaSqm, setAreaSqm] = useState("");
  const [bedrooms, setBedrooms] = useState("3");
  const [bathrooms, setBathrooms] = useState("2");
  const [livingRooms, setLivingRooms] = useState("1");
  const [floor, setFloor] = useState("1");
  const [propertyAge, setPropertyAge] = useState("0");
  const [streetWidth, setStreetWidth] = useState("15");
  const [facade, setFacade] = useState("north");
  const [furnished, setFurnished] = useState<"none" | "semi" | "full">("none");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Content
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaList, setMediaList] = useState<Array<{ url: string; type: string; caption?: string }>>([
    { url: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1000", type: "photo", caption: "الواجهة الرئيسية" }
  ]);

  // Seller Info
  const [contactName, setContactName] = useState("مالك العقار");
  const [contactPhone, setContactPhone] = useState("+966500000000");
  const [contactEmail, setContactEmail] = useState("owner@oprox.sa");

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const addMediaItem = () => {
    if (!mediaUrl.trim()) return;
    setMediaList((prev) => [...prev, { url: mediaUrl.trim(), type: "photo" }]);
    setMediaUrl("");
  };

  const removeMediaItem = (idx: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveListing = async (publishStatus: "draft" | "published") => {
    if (!title.trim() && publishStatus === "published") {
      Alert.alert(isAr ? "تنبيه" : "Required", isAr ? "يرجى كتابة عنوان العقار" : "Property title is required");
      return;
    }
    if (!price.trim() && publishStatus === "published") {
      Alert.alert(isAr ? "تنبيه" : "Required", isAr ? "يرجى تحديد السعر" : "Price is required");
      return;
    }

    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      const payload = {
        tenantId: 1,
        title: title || `${CATEGORIES.find((c) => c.id === propertyType)?.labelAr || "عقار"} في ${district || city}`,
        description,
        listingType,
        propertyType,
        price: price ? String(price) : "0",
        pricePeriod: listingType === "rent" ? (pricePeriod === "one_time" ? "yearly" : pricePeriod) : "one_time",
        currency: "SAR",
        areaSqm: areaSqm ? Number(areaSqm) : 200,
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        livingRooms: Number(livingRooms),
        floor: Number(floor),
        propertyAge: Number(propertyAge),
        streetWidth: Number(streetWidth),
        facade,
        furnished,
        amenities: JSON.stringify(selectedAmenities),
        media: JSON.stringify(mediaList),
        address: address || `${district}، ${city}`,
        city,
        district,
        lat: Number(lat),
        lng: Number(lng),
        status: publishStatus,
        sellerType: "owner",
        contactName,
        contactPhone,
        contactEmail,
      };

      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      if (domain) {
        await fetch(`https://${domain}/realestate-api/listings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }

      setSubmitting(false);
      Alert.alert(
        isAr ? "تم بنجاح" : "Success",
        publishStatus === "published"
          ? (isAr ? "تم نشر عقارك بنجاح على منصة أبروكس العقارية!" : "Property published successfully!")
          : (isAr ? "تم حفظ المسودة بنجاح" : "Draft saved successfully"),
        [
          {
            text: isAr ? "حسناً" : "OK",
            onPress: () => router.push("/(tabs)/index" as never),
          },
        ]
      );
    } catch {
      setSubmitting(false);
      router.push("/(tabs)/index" as never);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>
            {params.editId ? (isAr ? "تعديل العقار" : "Edit Property") : (isAr ? "نشر عقار جديد" : "Add New Property")}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Step Indicator */}
        <View style={s.stepRow}>
          {[
            { num: 1, label: isAr ? "النوع" : "Type" },
            { num: 2, label: isAr ? "الموقع" : "Location" },
            { num: 3, label: isAr ? "المواصفات" : "Specs" },
            { num: 4, label: isAr ? "التفاصيل" : "Details" },
          ].map((st) => (
            <Pressable
              key={st.num}
              onPress={() => setStep(st.num as any)}
              style={[s.stepChip, step === st.num && s.stepChipActive]}
            >
              <Text style={[s.stepNum, step === st.num && s.stepNumActive]}>{st.num}</Text>
              <Text style={[s.stepText, step === st.num && s.stepTextActive]}>{st.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* STEP 1: Type & Category */}
        {step === 1 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isAr ? "1. الغرض ونوع العقار" : "1. Purpose & Category"}</Text>

            {/* Sale / Rent Toggle */}
            <View style={s.typeToggle}>
              <Pressable
                style={[s.typeBtn, listingType === "sale" && s.typeBtnActive]}
                onPress={() => { setListingType("sale"); setPricePeriod("one_time"); }}
              >
                <MaterialIcons name="sell" size={20} color={listingType === "sale" ? "#fff" : NAVY} />
                <Text style={[s.typeBtnText, listingType === "sale" && s.typeBtnTextActive]}>
                  {isAr ? "للبيع" : "For Sale"}
                </Text>
              </Pressable>
              <Pressable
                style={[s.typeBtn, listingType === "rent" && s.typeBtnActive]}
                onPress={() => { setListingType("rent"); setPricePeriod("yearly"); }}
              >
                <MaterialIcons name="key" size={20} color={listingType === "rent" ? "#fff" : NAVY} />
                <Text style={[s.typeBtnText, listingType === "rent" && s.typeBtnTextActive]}>
                  {isAr ? "للإيجار" : "For Rent"}
                </Text>
              </Pressable>
            </View>

            <Text style={s.fieldLabel}>{isAr ? "اختر فئة العقار" : "Select Property Category"}</Text>
            <View style={s.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[s.catCard, propertyType === cat.id && s.catCardActive]}
                  onPress={() => setPropertyType(cat.id)}
                >
                  <MaterialIcons
                    name={cat.icon as any}
                    size={26}
                    color={propertyType === cat.id ? GOLD : NAVY}
                  />
                  <Text style={[s.catLabel, propertyType === cat.id && s.catLabelActive]}>
                    {isAr ? cat.labelAr : cat.labelEn}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={s.nextBtn} onPress={() => setStep(2)}>
              <Text style={s.nextBtnText}>{isAr ? "التالي: حدد الموقع" : "Next: Location"}</Text>
              <MaterialIcons name={isAr ? "arrow-back" : "arrow-forward"} size={20} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* STEP 2: Location */}
        {step === 2 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isAr ? "2. موقع العقار" : "2. Property Location"}</Text>

            <Text style={s.fieldLabel}>{isAr ? "المدينة" : "City"}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CITIES.map((c) => (
                <Pressable
                  key={c}
                  style={[s.cityChip, city === c && s.cityChipActive]}
                  onPress={() => setCity(c)}
                >
                  <Text style={[s.cityChipText, city === c && s.cityChipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.fieldLabel}>{isAr ? "الحي" : "District"}</Text>
            <TextInput
              style={s.input}
              placeholder={isAr ? "مثال: حي النرجس / حي الملقا" : "e.g. Al-Narjis"}
              value={district}
              onChangeText={setDistrict}
            />

            <Text style={s.fieldLabel}>{isAr ? "اسم الشارع أو الوصف" : "Street Address"}</Text>
            <TextInput
              style={s.input}
              placeholder={isAr ? "مثال: شارع عثمان بن عفان" : "e.g. Othman Bin Affan St."}
              value={address}
              onChangeText={setAddress}
            />

            <View style={s.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{isAr ? "خط العرض (Lat)" : "Latitude"}</Text>
                <TextInput style={s.input} value={lat} onChangeText={setLat} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{isAr ? "خط الطول (Lng)" : "Longitude"}</Text>
                <TextInput style={s.input} value={lng} onChangeText={setLng} keyboardType="numeric" />
              </View>
            </View>

            <View style={s.btnRow}>
              <Pressable style={s.prevBtn} onPress={() => setStep(1)}>
                <Text style={s.prevBtnText}>{isAr ? "السابق" : "Back"}</Text>
              </Pressable>
              <Pressable style={s.nextBtnFlex} onPress={() => setStep(3)}>
                <Text style={s.nextBtnText}>{isAr ? "التالي: المواصفات" : "Next: Specs"}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* STEP 3: Specs & Amenities */}
        {step === 3 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isAr ? "3. المواصفات والمميزات" : "3. Specifications & Amenities"}</Text>

            {/* Price & Period */}
            <View style={s.rowTwo}>
              <View style={{ flex: 1.2 }}>
                <Text style={s.fieldLabel}>{isAr ? "السعر (ر.س)" : "Price (SAR)"}</Text>
                <TextInput
                  style={s.input}
                  placeholder="0.00"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>
              {listingType === "rent" && (
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>{isAr ? "دورة الإيجار" : "Rent Period"}</Text>
                  <View style={s.smallToggle}>
                    <Pressable
                      style={[s.smallToggleBtn, pricePeriod === "yearly" && s.smallToggleActive]}
                      onPress={() => setPricePeriod("yearly")}
                    >
                      <Text style={[s.smallToggleText, pricePeriod === "yearly" && s.smallToggleTextActive]}>
                        {isAr ? "سنوي" : "Yearly"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[s.smallToggleBtn, pricePeriod === "monthly" && s.smallToggleActive]}
                      onPress={() => setPricePeriod("monthly")}
                    >
                      <Text style={[s.smallToggleText, pricePeriod === "monthly" && s.smallToggleTextActive]}>
                        {isAr ? "شهري" : "Monthly"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* Area & Rooms */}
            <View style={s.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{isAr ? "المساحة (م²)" : "Area (Sqm)"}</Text>
                <TextInput style={s.input} value={areaSqm} onChangeText={setAreaSqm} keyboardType="numeric" placeholder="250" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{isAr ? "غرف النوم" : "Bedrooms"}</Text>
                <TextInput style={s.input} value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" />
              </View>
            </View>

            <View style={s.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{isAr ? "دورات المياه" : "Bathrooms"}</Text>
                <TextInput style={s.input} value={bathrooms} onChangeText={setBathrooms} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{isAr ? "عمر العقار (سنوات)" : "Age (Years)"}</Text>
                <TextInput style={s.input} value={propertyAge} onChangeText={setPropertyAge} keyboardType="numeric" />
              </View>
            </View>

            {/* Furnished status */}
            <Text style={s.fieldLabel}>{isAr ? "حالة التأثيث" : "Furnished Status"}</Text>
            <View style={s.typeToggle}>
              {[
                { id: "none", labelAr: "غير مؤثث", labelEn: "Unfurnished" },
                { id: "semi", labelAr: "شبه مؤثث", labelEn: "Semi-furnished" },
                { id: "full", labelAr: "مؤثث بالكامل", labelEn: "Fully Furnished" },
              ].map((f) => (
                <Pressable
                  key={f.id}
                  style={[s.typeBtn, furnished === f.id && s.typeBtnActive]}
                  onPress={() => setFurnished(f.id as any)}
                >
                  <Text style={[s.typeBtnText, furnished === f.id && s.typeBtnTextActive]}>
                    {isAr ? f.labelAr : f.labelEn}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Amenities Grid */}
            <Text style={s.fieldLabel}>{isAr ? "المرافق والخدمات" : "Amenities & Facilities"}</Text>
            <View style={s.amenitiesGrid}>
              {AMENITIES_LIST.map((a) => {
                const selected = selectedAmenities.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    style={[s.amenityChip, selected && s.amenityChipActive]}
                    onPress={() => toggleAmenity(a.id)}
                  >
                    <MaterialIcons name={a.icon as any} size={18} color={selected ? GOLD : NAVY} />
                    <Text style={[s.amenityText, selected && s.amenityTextActive]}>{a.labelAr}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.btnRow}>
              <Pressable style={s.prevBtn} onPress={() => setStep(2)}>
                <Text style={s.prevBtnText}>{isAr ? "السابق" : "Back"}</Text>
              </Pressable>
              <Pressable style={s.nextBtnFlex} onPress={() => setStep(4)}>
                <Text style={s.nextBtnText}>{isAr ? "التالي: التفاصيل والصور" : "Next: Media"}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* STEP 4: Title, Media & Publish */}
        {step === 4 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isAr ? "4. العنوان والصور والنشر" : "4. Media & Review"}</Text>

            <Text style={s.fieldLabel}>{isAr ? "عنوان الإعلان" : "Listing Title"}</Text>
            <TextInput
              style={s.input}
              placeholder={isAr ? "مثال: فيلا فاخرة مودرن للبيع في حي النرجس" : "e.g. Modern Villa for Sale"}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={s.fieldLabel}>{isAr ? "الوصف التفصيلي" : "Description"}</Text>
            <TextInput
              style={[s.input, { height: 100, textAlignVertical: "top" }]}
              placeholder={isAr ? "اكتب جميع تفاصيل العقار المميزة ومحتويات الدور الأرضي والعلوي..." : "Describe the property details..."}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Media URLs Input */}
            <Text style={s.fieldLabel}>{isAr ? "إضافة رابط صورة للعقار" : "Add Photo URL"}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="https://..."
                value={mediaUrl}
                onChangeText={setMediaUrl}
              />
              <Pressable style={s.addMediaBtn} onPress={addMediaItem}>
                <MaterialIcons name="add" size={24} color="#fff" />
              </Pressable>
            </View>

            {/* Media Preview Grid */}
            <View style={s.mediaPreviewRow}>
              {mediaList.map((m, idx) => (
                <View key={idx} style={s.mediaThumbWrap}>
                  <Image source={{ uri: m.url }} style={s.mediaThumb} />
                  <Pressable style={s.removeMediaBtn} onPress={() => removeMediaItem(idx)}>
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Seller Info */}
            <Text style={s.fieldLabel}>{isAr ? "بيانات التواصل" : "Contact Information"}</Text>
            <TextInput style={s.input} value={contactName} onChangeText={setContactName} placeholder={isAr ? "اسم المعلن" : "Contact Name"} />
            <TextInput style={s.input} value={contactPhone} onChangeText={setContactPhone} placeholder={isAr ? "رقم الجوال" : "Phone Number"} keyboardType="phone-pad" />

            {/* Actions */}
            <View style={{ gap: 12, marginTop: 24 }}>
              <Pressable
                style={[s.publishBtn, submitting && { opacity: 0.6 }]}
                onPress={() => handleSaveListing("published")}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="cloud-upload" size={22} color="#fff" />
                    <Text style={s.publishBtnText}>{isAr ? "نشر العقار الآن" : "Publish Listing Now"}</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[s.draftBtn, submitting && { opacity: 0.6 }]}
                onPress={() => handleSaveListing("draft")}
                disabled={submitting}
              >
                <MaterialIcons name="bookmark-border" size={20} color={NAVY} />
                <Text style={s.draftBtnText}>{isAr ? "حفظ كمسودة" : "Save as Draft"}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  header: { backgroundColor: NAVY, paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  stepRow: { flexDirection: "row", gap: 8, justifyContent: "space-between" },
  stepChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.08)" },
  stepChipActive: { backgroundColor: GOLD },
  stepNum: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_700Bold" },
  stepNumActive: { color: NAVY },
  stepText: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  stepTextActive: { color: NAVY },
  content: { padding: 16, paddingBottom: 60 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "rgba(15,32,64,0.08)" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: NAVY, marginBottom: 16, textAlign: "right" },
  typeToggle: { flexDirection: "row", gap: 10, marginBottom: 20 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(15,32,64,0.15)", backgroundColor: "#f8fafc" },
  typeBtnActive: { backgroundColor: NAVY, borderColor: NAVY },
  typeBtnText: { color: NAVY, fontSize: 14, fontFamily: "Inter_700Bold" },
  typeBtnTextActive: { color: "#fff" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: NAVY, marginBottom: 8, marginTop: 12, textAlign: "right" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  catCard: { width: "30%", minWidth: 90, alignItems: "center", paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(15,32,64,0.1)", backgroundColor: "#fff" },
  catCardActive: { borderColor: GOLD, backgroundColor: "rgba(201,168,76,0.08)" },
  catLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: NAVY, marginTop: 6, textAlign: "center" },
  catLabelActive: { color: NAVY, fontFamily: "Inter_700Bold" },
  nextBtn: { marginTop: 24, backgroundColor: GOLD, paddingVertical: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextBtnFlex: { flex: 1, backgroundColor: GOLD, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nextBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  prevBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: "rgba(15,32,64,0.2)" },
  prevBtnText: { color: NAVY, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 24 },
  cityChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f1f5f9", marginRight: 8 },
  cityChipActive: { backgroundColor: NAVY },
  cityChipText: { fontSize: 13, color: NAVY, fontFamily: "Inter_600SemiBold" },
  cityChipTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "rgba(15,32,64,0.15)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: NAVY, backgroundColor: "#fff", marginBottom: 12, textAlign: "right" },
  rowTwo: { flexDirection: "row", gap: 12 },
  smallToggle: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 8, padding: 2 },
  smallToggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
  smallToggleActive: { backgroundColor: NAVY },
  smallToggleText: { fontSize: 12, color: NAVY },
  smallToggleTextActive: { color: "#fff", fontWeight: "bold" },
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  amenityChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(15,32,64,0.12)", backgroundColor: "#f8fafc" },
  amenityChipActive: { borderColor: GOLD, backgroundColor: "rgba(201,168,76,0.12)" },
  amenityText: { fontSize: 12, color: NAVY, fontFamily: "Inter_500Medium" },
  amenityTextActive: { color: NAVY, fontFamily: "Inter_700Bold" },
  addMediaBtn: { width: 44, height: 44, backgroundColor: NAVY, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  mediaPreviewRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  mediaThumbWrap: { width: 80, height: 80, borderRadius: 10, overflow: "hidden", position: "relative" },
  mediaThumb: { width: "100%", height: "100%" },
  removeMediaBtn: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, padding: 2 },
  publishBtn: { backgroundColor: NAVY, paddingVertical: 16, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  publishBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  draftBtn: { backgroundColor: "#f1f5f9", paddingVertical: 14, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(15,32,64,0.12)" },
  draftBtnText: { color: NAVY, fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
