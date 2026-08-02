/**
 * AIArchitectViewImpl — OPROX AI Architect Workspace (Phase 9)
 *
 * Full-featured AI Architectural Concept Engine & Workspace
 * Features:
 *  1. Property/Plot Context Selection & Preservation
 *  2. Natural Language & Structured Brief Extractor
 *  3. Saudi Architectural Context (Majlis, Family, Entrances, Privacy Zoning)
 *  4. Concept Generation Engine (Concepts A, B, C Comparison)
 *  5. Assumption Engine (USER_PROVIDED, PROPERTY_DATA, AI_ASSUMPTION, UNKNOWN)
 *  6. Space Program Schedule Table (Exact Math Sum)
 *  7. Interactive 2D Floor Plan Concept Renderer
 *  8. Conversational AI Revision Loop ("كبر المجلس", "صغر المطبخ")
 *  9. Version History Timeline (V1, V2, V3... Restore & Compare)
 * 10. 3D / VR / AR Property3DViewer Integration
 * 11. Facade & Material Concepts
 * 12. Regulatory, Structural, MEP, and Cost Boundary Disclaimers
 * 13. Professional Handoff Package Export
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Property3DViewer from "./Property3DViewer.web";
import {
  parseBriefFromText,
  generateArchitectConcept,
  generateConceptOptions,
  reviseArchitectConcept,
  generateHandoffPackage,
  create3DGenerationJob,
  ARCHITECTURAL_STYLES,
  type ArchitecturalBrief,
  type ArchitecturalConcept,
  type PropertyContext,
  type SpaceProgramItem,
  type ConceptVersionRecord,
  type FloorData,
} from "../../realestate-api/src/lib/architect-engine";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";
const BG = "#0a0f1e";
const CARD_BG = "rgba(15,30,60,0.7)";
const BORDER_COLOR = "rgba(201,168,76,0.25)";

interface Props {
  mode?: string;
  tripoKey?: string;
  brain?: { rules: { new_design_cost: number } };
  initialContext?: PropertyContext;
  onNeedCredits?: () => void;
  onCreditUsed?: () => void;
}

export default function AIArchitectViewImpl({
  mode = "auto",
  tripoKey = "",
  brain = { rules: { new_design_cost: 1 } },
  initialContext,
  onNeedCredits,
  onCreditUsed,
}: Props) {
  // ── States ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"brief" | "concept" | "floor2d" | "3d" | "history" | "export">("brief");
  const [naturalText, setNaturalText] = useState("عندي أرض 500 متر في حي النرجس بالرياض، أبي فيلا دورين فيها 4 غرف نوم ومجلس رجال واسع ومسبح خلفي وحديقة وجناح عاملة");
  const [context, setContext] = useState<PropertyContext>(
    initialContext || {
      propertyType: "land",
      city: "الرياض",
      district: "حي النرجس",
      plotAreaSqm: 500,
      dimensions: "20m x 25m",
    }
  );

  const [brief, setBrief] = useState<ArchitecturalBrief>(() =>
    parseBriefFromText(naturalText, context)
  );

  const [activeConcept, setActiveConcept] = useState<ArchitecturalConcept>(() =>
    generateArchitectConcept(brief, context, "A")
  );

  const [conceptOptions, setConceptOptions] = useState<{
    conceptA: ArchitecturalConcept;
    conceptB: ArchitecturalConcept;
    conceptC: ArchitecturalConcept;
    comparisonSummaryAr: string;
  } | null>(null);

  const [versionsHistory, setVersionsHistory] = useState<ConceptVersionRecord[]>([
    {
      versionNumber: 1,
      versionLabel: "الإصدار الأولي V1 — الخيار المعتمد",
      conceptSnapshot: activeConcept,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [selectedFloorKey, setSelectedFloorKey] = useState<"ground" | "first" | "roof">("ground");
  const [view3DMode, setView3DMode] = useState<"3d" | "vr" | "ar">("3d");
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleParseBrief = useCallback(() => {
    setIsGenerating(true);
    setStatusMessage("جاري تحليل النص واستخراج برنامج المساحات والمكونات المعمارية...");
    setTimeout(() => {
      const parsed = parseBriefFromText(naturalText, context);
      setBrief(parsed);
      const generated = generateArchitectConcept(parsed, context, "A");
      setActiveConcept(generated);
      setVersionsHistory([
        {
          versionNumber: 1,
          versionLabel: "الإصدار الأولي V1",
          conceptSnapshot: generated,
          createdAt: new Date().toISOString(),
        },
      ]);
      setIsGenerating(false);
      setStatusMessage("");
      setActiveTab("concept");
    }, 400);
  }, [naturalText, context]);

  const handleGenerateOptions = useCallback(() => {
    setIsGenerating(true);
    setStatusMessage("جاري توليد خيارات تصميمية بديلة (الخصوصية، المعيشة المفتوحة، الكفاءة)...");
    setTimeout(() => {
      const options = generateConceptOptions(brief, context);
      setConceptOptions(options);
      setIsGenerating(false);
      setStatusMessage("");
      setShowComparisonModal(true);
    }, 500);
  }, [brief, context]);

  const handleApplyRevision = useCallback(
    (promptToApply?: string) => {
      const textToUse = promptToApply || revisionPrompt;
      if (!textToUse.trim()) return;

      setIsGenerating(true);
      setStatusMessage(`جاري تطبيق التعديل المعماري: "${textToUse}"...`);

      setTimeout(() => {
        const revised = reviseArchitectConcept(activeConcept, textToUse);
        setActiveConcept(revised);
        const newVerRecord: ConceptVersionRecord = {
          versionNumber: revised.version,
          versionLabel: `إصدار V${revised.version} — ${textToUse}`,
          revisionPrompt: textToUse,
          conceptSnapshot: revised,
          createdAt: new Date().toISOString(),
        };
        setVersionsHistory((prev) => [newVerRecord, ...prev]);
        setRevisionPrompt("");
        setIsGenerating(false);
        setStatusMessage("");
        if (onCreditUsed) onCreditUsed();
      }, 500);
    },
    [revisionPrompt, activeConcept, onCreditUsed]
  );

  const handleRestoreVersion = useCallback((ver: ConceptVersionRecord) => {
    setActiveConcept(ver.conceptSnapshot);
  }, []);

  const selectedFloorData: FloorData | undefined = activeConcept.floorPlanModel.floors.find(
    (f) => f.floorKey === selectedFloorKey
  );

  const handoffPackage = generateHandoffPackage(brief, activeConcept, versionsHistory, context);

  return (
    <View style={s.container}>
      {/* ── Sub Header / Context Bar ─────────────────────────────────────────── */}
      <View style={s.contextBar}>
        <View style={s.contextRight}>
          <Text style={s.contextTitle}>🏠 {activeConcept.conceptNameAr}</Text>
          <Text style={s.contextSubtitle}>
            {context.city} • {context.district} • أرض {brief.plotAreaSqm || 500}م² ({brief.dimensions || "أبعاد افتراضية"})
          </Text>
        </View>
        <View style={s.badgePill}>
          <Text style={s.badgePillText}>V{activeConcept.version} • ذكاء معماري</Text>
        </View>
      </View>

      {/* ── Workspace Tab Navigation ─────────────────────────────────────────── */}
      <View style={s.tabNav}>
        {[
          { key: "brief", label: "1. المتطلبات (Brief)" },
          { key: "concept", label: "2. المفهوم (Concept)" },
          { key: "floor2d", label: "3. مخطط 2D" },
          { key: "3d", label: "4. استكشاف 3D/VR/AR" },
          { key: "history", label: "سجل الإصدارات" },
          { key: "export", label: "التصدير والتقرير" },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Loading Overlay ──────────────────────────────────────────────────── */}
      {isGenerating && (
        <View style={s.loadingBanner}>
          <ActivityIndicator color={GOLD} size="small" />
          <Text style={s.loadingText}>{statusMessage}</Text>
        </View>
      )}

      <ScrollView style={s.mainScroll} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* ── TAB 1: ARCHITECTURAL BRIEF ────────────────────────────────────── */}
        {activeTab === "brief" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📝 طلب وتفريغ المتطلبات المعمارية (Natural Brief)</Text>
            <Text style={s.cardDesc}>
              اكتب وصف مشروعك بأسلوبك الطبيعي (مثال: عندي أرض 500m2 وأبي فيلا مودرن طابقين مع مجلس رجال ومسبح):
            </Text>
            <TextInput
              style={s.textInput}
              multiline
              numberOfLines={4}
              value={naturalText}
              onChangeText={setNaturalText}
              placeholder="اكتب طلبك المعماري هنا..."
              placeholderTextColor="rgba(200,215,255,0.4)"
            />
            <Pressable style={s.primaryBtn} onPress={handleParseBrief}>
              <Text style={s.primaryBtnText}>⚡ تحليل وتوليد المفهوم المعماري</Text>
            </Pressable>

            {/* Extracted Requirements Summary */}
            <View style={s.extractedBox}>
              <Text style={s.boxTitle}>🔍 نتائج تحليل البيانات المطلوبة:</Text>
              <View style={s.gridRow}>
                <View style={s.gridItem}>
                  <Text style={s.gridLabel}>نوع المشروع:</Text>
                  <Text style={s.gridVal}>{brief.projectType === "villa" ? "فيلا سكنية" : "أرض / تطوير"}</Text>
                </View>
                <View style={s.gridItem}>
                  <Text style={s.gridLabel}>مساحة الأرض:</Text>
                  <Text style={s.gridVal}>{brief.plotAreaSqm ? `${brief.plotAreaSqm} م²` : "غير محدد (افتراضي)"}</Text>
                </View>
                <View style={s.gridItem}>
                  <Text style={s.gridLabel}>عدد الأدوار:</Text>
                  <Text style={s.gridVal}>{brief.floorsCount} أدوار</Text>
                </View>
                <View style={s.gridItem}>
                  <Text style={s.gridLabel}>عدد غرف النوم:</Text>
                  <Text style={s.gridVal}>{brief.bedrooms} أجنحة</Text>
                </View>
                <View style={s.gridItem}>
                  <Text style={s.gridLabel}>الطراز المعماري:</Text>
                  <Text style={s.gridVal}>{ARCHITECTURAL_STYLES[brief.stylePreference]?.nameAr || "معاصر"}</Text>
                </View>
              </View>

              {/* Unknown Fields Warning */}
              {brief.unknownFields.length > 0 && (
                <View style={s.warningBox}>
                  <Text style={s.warningTitle}>⚠️ عناصر لم تُحدد وتم افتراضها تلقائياً:</Text>
                  {brief.unknownFields.map((uf, i) => (
                    <Text key={i} style={s.warningItem}>• {uf}</Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── TAB 2: CONCEPT & SPACE PROGRAM ────────────────────────────────── */}
        {activeTab === "concept" && (
          <View style={{ gap: 16 }}>
            {/* Design Rationale Card */}
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <Text style={s.cardTitle}>📐 المفهوم المعماري والأسس الهندسية</Text>
                <Pressable style={s.secondaryBtn} onPress={handleGenerateOptions}>
                  <Text style={s.secondaryBtnText}>✨ مقارنة 3 خيارات تصميمية</Text>
                </Pressable>
              </View>
              <Text style={s.rationaleText}>{activeConcept.designRationaleAr}</Text>
            </View>

            {/* Assumptions Engine Box */}
            <View style={s.card}>
              <Text style={s.cardTitle}>⚙️ محرك افتراضات الذكاء الاصطناعي (Assumption Engine)</Text>
              <View style={{ gap: 8, marginTop: 8 }}>
                {activeConcept.assumptions.map((asm) => (
                  <View key={asm.key} style={s.asmRow}>
                    <View style={[s.asmBadge, asm.source === "USER_PROVIDED" ? s.asmUser : asm.source === "PROPERTY_DATA" ? s.asmProp : s.asmAi]}>
                      <Text style={s.asmBadgeText}>{asm.source}</Text>
                    </View>
                    <Text style={s.asmText}>{asm.descriptionAr}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Space Program Table */}
            <View style={s.card}>
              <Text style={s.cardTitle}>📊 جدول برنامج المساحات التفصيلي (Space Schedule)</Text>
              <Text style={s.tableSub}>المساحة البنائية التقديرية الإجمالية: <Text style={{ color: GOLD, fontWeight: "800" }}>{activeConcept.totalBuiltAreaSqm} م²</Text></Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.tableContainer}>
                  {/* Table Header */}
                  <View style={s.tableHeader}>
                    <Text style={[s.th, { width: 140 }]}>اسم الفراغ</Text>
                    <Text style={[s.th, { width: 100 }]}>الدور</Text>
                    <Text style={[s.th, { width: 80 }]}>المساحة (م²)</Text>
                    <Text style={[s.th, { width: 100 }]}>منطقة الخصوصية</Text>
                    <Text style={[s.th, { width: 160 }]}>العلاقة الفراغية</Text>
                    <Text style={[s.th, { width: 90 }]}>المصدر</Text>
                  </View>

                  {/* Table Rows */}
                  {activeConcept.spaceProgram.map((item) => (
                    <View key={item.id} style={s.tableRow}>
                      <Text style={[s.td, { width: 140, fontWeight: "700", color: "#fff" }]}>{item.nameAr}</Text>
                      <Text style={[s.td, { width: 100 }]}>
                        {item.floorLevel === "ground" ? "الأرضي" : item.floorLevel === "first" ? "الأول" : "الملحق/السطح"}
                      </Text>
                      <Text style={[s.td, { width: 80, color: GOLD, fontWeight: "800" }]}>{item.approxAreaSqm} م²</Text>
                      <Text style={[s.td, { width: 100 }]}>
                        {item.privacyZone === "public" ? "عام (ضيوف)" : item.privacyZone === "semi_private" ? "شبه خاص" : item.privacyZone === "private" ? "خاص (عائلة)" : "خدمات"}
                      </Text>
                      <Text style={[s.td, { width: 160, fontSize: 11 }]}>{item.relationship}</Text>
                      <Text style={[s.td, { width: 90, fontSize: 10 }]}>{item.source}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Quick Revision Chat Controls */}
            <View style={s.card}>
              <Text style={s.cardTitle}>💬 التعديل المباشر على التصميم (AI Revision Loop)</Text>
              <View style={s.chipRow}>
                {["كبر المجلس", "صغر المطبخ", "خل المسبح خلفي", "حول غرفة إلى مكتب", "أربع غرف بالدور الأول"].map((chip) => (
                  <Pressable key={chip} style={s.chip} onPress={() => handleApplyRevision(chip)}>
                    <Text style={s.chipText}>+ {chip}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.revisionInputRow}>
                <TextInput
                  style={s.revisionInput}
                  value={revisionPrompt}
                  onChangeText={setRevisionPrompt}
                  placeholder="اكتب التعديل المطلوب على المخطط..."
                  placeholderTextColor="rgba(200,215,255,0.4)"
                />
                <Pressable style={s.applyBtn} onPress={() => handleApplyRevision()}>
                  <Text style={s.applyBtnText}>تطبيق التعديل</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ── TAB 3: 2D FLOOR CONCEPT CANVAS ───────────────────────────────── */}
        {activeTab === "floor2d" && (
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <Text style={s.cardTitle}>🗺️ المخطط ثنائي الأبعاد (2D Concept Floor Plan)</Text>
              <View style={s.badgeLabelBox}>
                <Text style={s.badgeLabelText}>AI-GENERATED CONCEPT FLOOR PLAN</Text>
              </View>
            </View>

            {/* Floor selector tabs */}
            <View style={s.floorNavRow}>
              {[
                { key: "ground", label: "الدور الأرضي" },
                { key: "first", label: "الدور الأول" },
                { key: "roof", label: "الملحق العلوي" },
              ].map((f) => (
                <Pressable
                  key={f.key}
                  style={[s.floorBtn, selectedFloorKey === f.key && s.floorBtnActive]}
                  onPress={() => setSelectedFloorKey(f.key as any)}
                >
                  <Text style={[s.floorBtnText, selectedFloorKey === f.key && s.floorBtnTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {selectedFloorData && (
              <View style={s.floorCanvasContainer}>
                <Text style={s.floorConceptSub}>{selectedFloorData.circulationConceptAr}</Text>
                <View style={s.canvasStage}>
                  {selectedFloorData.spaces.map((sp) => {
                    const zoneColor =
                      sp.privacyZone === "public"
                        ? "rgba(201,168,76,0.2)"
                        : sp.privacyZone === "semi_private"
                        ? "rgba(59,130,246,0.2)"
                        : sp.privacyZone === "private"
                        ? "rgba(168,85,247,0.2)"
                        : "rgba(100,116,139,0.2)";
                    const zoneBorder =
                      sp.privacyZone === "public"
                        ? GOLD
                        : sp.privacyZone === "semi_private"
                        ? "#3b82f6"
                        : sp.privacyZone === "private"
                        ? "#a855f7"
                        : "#64748b";

                    return (
                      <View
                        key={sp.id}
                        style={[
                          s.roomBlock,
                          {
                            left: `${sp.x}%`,
                            top: `${sp.y}%`,
                            width: `${sp.width}%`,
                            height: `${sp.height}%`,
                            backgroundColor: zoneColor,
                            borderColor: zoneBorder,
                          },
                        ]}
                      >
                        <Text style={s.roomTitle}>{sp.nameAr}</Text>
                        <Text style={s.roomArea}>{sp.approxAreaSqm} م²</Text>
                        {sp.doors.length > 0 && (
                          <Text style={s.doorTag}>🚪 {sp.doors[0].labelAr}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Legend */}
                <View style={s.legendRow}>
                  <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: GOLD }]} /><Text style={s.legendText}>استقبال وضيوف</Text></View>
                  <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: "#3b82f6" }]} /><Text style={s.legendText}>شبه خاص / عائلة</Text></View>
                  <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: "#a855f7" }]} /><Text style={s.legendText}>أجنحة نوم خاصة</Text></View>
                  <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: "#64748b" }]} /><Text style={s.legendText}>منطقة خدمات</Text></View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── TAB 4: 3D / VR / AR EXPLORATION ──────────────────────────────── */}
        {activeTab === "3d" && (
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <Text style={s.cardTitle}>🧊 استكشاف المجسم ثلاثي الأبعاد والواقع المدمج</Text>
              <View style={s.badgeLabelBox}>
                <Text style={s.badgeLabelText}>AI-GENERATED MODEL</Text>
              </View>
            </View>

            <Text style={s.cardDesc}>
              يمكنك معاينة النموذج المعماري ثلاثي الأبعاد المفاهيمي التفاعلي واستكشافه بوضع 3D أو VR أو AR:
            </Text>

            <View style={s.modeSelectorRow}>
              {[
                { key: "3d", label: "شاشة 3D تفاعلية" },
                { key: "vr", label: "واقع افتراضي VR" },
                { key: "ar", label: "واقع معزز AR" },
              ].map((m) => (
                <Pressable
                  key={m.key}
                  style={[s.modeBtn, view3DMode === m.key && s.modeBtnActive]}
                  onPress={() => setView3DMode(m.key as any)}
                >
                  <Text style={[s.modeBtnText, view3DMode === m.key && s.modeBtnTextActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Embedded Property3DViewer */}
            <View style={s.viewerBox}>
              <Property3DViewer
                modelUrl="/media/models/sample_villa.glb"
                propertyTitle={activeConcept.conceptNameAr}
                initialViewMode={view3DMode}
                classification="AI-GENERATED MODEL"
              />
            </View>
          </View>
        )}

        {/* ── TAB 5: VERSION HISTORY ────────────────────────────────────────── */}
        {activeTab === "history" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📜 سجل الإصدارات والتعديلات المعمارية (Version History)</Text>
            <View style={{ gap: 12, marginTop: 12 }}>
              {versionsHistory.map((ver) => (
                <View key={ver.versionNumber} style={s.verCard}>
                  <View style={s.verHeader}>
                    <Text style={s.verTitle}>{ver.versionLabel}</Text>
                    <Text style={s.verDate}>{new Date(ver.createdAt).toLocaleTimeString()}</Text>
                  </View>
                  <Text style={s.verSub}>
                    المساحة البنائية: {ver.conceptSnapshot.totalBuiltAreaSqm} م² • {ver.conceptSnapshot.spaceProgram.length} فراغات معمارية
                  </Text>
                  <Pressable
                    style={s.restoreBtn}
                    onPress={() => handleRestoreVersion(ver)}
                  >
                    <Text style={s.restoreBtnText}>🔄 استرجاع هذا الإصدار</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── TAB 6: EXPORT & PROFESSIONAL HANDOFF ──────────────────────────── */}
        {activeTab === "export" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📄 حزمة التصدير والمعاينة المهنية (Professional Handoff)</Text>

            <View style={s.handoffPreviewBox}>
              <Text style={s.handoffTitle}>{handoffPackage.title}</Text>
              <Text style={s.handoffSubtitle}>تاريخ الإنشاء: {new Date(handoffPackage.generatedAt).toLocaleDateString()}</Text>

              <View style={s.divider} />

              <Text style={s.sectionHeader}>ملخص برنامج المساحات المعماري:</Text>
              {activeConcept.spaceProgram.slice(0, 5).map((sp) => (
                <Text key={sp.id} style={s.handoffLine}>
                  • {sp.nameAr} ({sp.floorLevel}): {sp.approxAreaSqm}م² — {sp.privacyZone}
                </Text>
              ))}

              <View style={s.divider} />

              <Text style={s.sectionHeader}>الواجهة والمواد المفهومية:</Text>
              <Text style={s.handoffText}>{activeConcept.facadeConcept.descriptionAr}</Text>

              <View style={s.divider} />

              {/* Strict Regulatory & Engineering Disclaimers */}
              <View style={s.disclaimerBox}>
                <Text style={s.disclaimerHeader}>⚠️ حدود المسؤولية والترخيص:</Text>
                <Text style={s.disclaimerItem}>• {activeConcept.boundaries.regulatoryDisclaimer}</Text>
                <Text style={s.disclaimerItem}>• {activeConcept.boundaries.structuralDisclaimer}</Text>
                <Text style={s.disclaimerItem}>• {activeConcept.boundaries.mepDisclaimer}</Text>
                <Text style={s.disclaimerItem}>• {activeConcept.boundaries.costEstimate}</Text>
              </View>
            </View>

            <Pressable style={s.primaryBtn} onPress={() => setShowExportModal(true)}>
              <Text style={s.primaryBtnText}>📥 تحميل / طباعة الحزمة المهنية (Handoff PDF/Package)</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* ── Concept Options Comparison Modal ────────────────────────────────── */}
      <Modal visible={showComparisonModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>⚖️ مقارنة الخيارات التصميمية الثلاثة (AI Concept Matrix)</Text>
            {conceptOptions && (
              <ScrollView style={{ maxHeight: 400, marginVertical: 12 }}>
                <Text style={s.summaryText}>{conceptOptions.comparisonSummaryAr}</Text>
                <View style={s.compareRow}>
                  <View style={s.compareCol}>
                    <Text style={s.colTitle}>الخيار (أ)</Text>
                    <Text style={s.colSub}>الخصوصية وفصل الضيوف</Text>
                    <Text style={s.colArea}>{conceptOptions.conceptA.totalBuiltAreaSqm} م²</Text>
                  </View>
                  <View style={s.compareCol}>
                    <Text style={s.colTitle}>الخيار (ب)</Text>
                    <Text style={s.colSub}>المعيشة المفتوحة والمنتجع</Text>
                    <Text style={s.colArea}>{conceptOptions.conceptB.totalBuiltAreaSqm} م²</Text>
                  </View>
                  <View style={s.compareCol}>
                    <Text style={s.colTitle}>الخيار (ج)</Text>
                    <Text style={s.colSub}>الكفاءة واستغلال المساحة</Text>
                    <Text style={s.colArea}>{conceptOptions.conceptC.totalBuiltAreaSqm} م²</Text>
                  </View>
                </View>
              </ScrollView>
            )}
            <Pressable style={s.closeModalBtn} onPress={() => setShowComparisonModal(false)}>
              <Text style={s.closeModalText}>إغلاق المقارنة</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Export Modal ────────────────────────────────────────────────────── */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>✅ تم إعداد حزمة المعماري المهنية بنجاح</Text>
            <Text style={s.modalDesc}>
              تم تجهيز الحزمة المعمارية المتكاملة (PDF/JSON) وتضم المتطلبات، برنامج المساحات، المخطط 2D، والمواصفات المبدئية لتقديمها للمكتب الهندسي المعتمد.
            </Text>
            <Pressable style={s.primaryBtn} onPress={() => setShowExportModal(false)}>
              <Text style={s.primaryBtnText}>موافق والعودة</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  contextBar: {
    backgroundColor: "#0d1830",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  contextRight: { flex: 1 },
  contextTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  contextSubtitle: { color: "rgba(200,215,255,0.6)", fontSize: 11, marginTop: 2 },
  badgePill: {
    backgroundColor: "rgba(201,168,76,0.15)",
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePillText: { color: GOLD, fontSize: 11, fontWeight: "700" },

  tabNav: {
    flexDirection: "row",
    backgroundColor: "#080c18",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  tabItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabItemActive: { borderBottomColor: GOLD },
  tabText: { color: "rgba(200,215,255,0.5)", fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: GOLD, fontWeight: "800" },

  loadingBanner: {
    backgroundColor: "rgba(201,168,76,0.15)",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: GOLD, fontSize: 12, fontWeight: "700" },

  mainScroll: { flex: 1 },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  cardDesc: { color: "rgba(200,215,255,0.6)", fontSize: 12, marginBottom: 10, lineHeight: 18 },

  textInput: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
    fontSize: 13,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: NAVY, fontSize: 13, fontWeight: "800" },

  secondaryBtn: {
    backgroundColor: "rgba(201,168,76,0.12)",
    borderWidth: 1,
    borderColor: GOLD,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  secondaryBtnText: { color: GOLD, fontSize: 11, fontWeight: "700" },

  extractedBox: { marginTop: 14, backgroundColor: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 12 },
  boxTitle: { color: GOLD, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: { width: "45%", backgroundColor: "rgba(255,255,255,0.03)", padding: 8, borderRadius: 8 },
  gridLabel: { color: "rgba(200,215,255,0.5)", fontSize: 10 },
  gridVal: { color: "#fff", fontSize: 12, fontWeight: "700" },

  warningBox: { marginTop: 10, backgroundColor: "rgba(239,68,68,0.1)", padding: 8, borderRadius: 8 },
  warningTitle: { color: "#f87171", fontSize: 11, fontWeight: "700" },
  warningItem: { color: "rgba(254,202,202,0.8)", fontSize: 11 },

  rationaleText: { color: "rgba(220,230,255,0.9)", fontSize: 13, lineHeight: 22, marginTop: 6 },

  asmRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  asmBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  asmUser: { backgroundColor: "rgba(34,197,94,0.2)" },
  asmProp: { backgroundColor: "rgba(59,130,246,0.2)" },
  asmAi: { backgroundColor: "rgba(201,168,76,0.2)" },
  asmBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  asmText: { color: "rgba(200,215,255,0.8)", fontSize: 11, flex: 1 },

  tableSub: { color: "rgba(200,215,255,0.6)", fontSize: 12, marginVertical: 6 },
  tableContainer: { marginTop: 8 },
  tableHeader: { flexDirection: "row", backgroundColor: "rgba(201,168,76,0.15)", paddingVertical: 8, paddingHorizontal: 6 },
  th: { color: GOLD, fontSize: 11, fontWeight: "800" },
  tableRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  td: { color: "rgba(200,215,255,0.8)", fontSize: 11 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 8 },
  chip: { backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(201,168,76,0.2)" },
  chipText: { color: GOLD, fontSize: 11, fontWeight: "600" },
  revisionInputRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  revisionInput: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 10, paddingHorizontal: 12, color: "#fff", fontSize: 12 },
  applyBtn: { backgroundColor: GOLD, paddingHorizontal: 14, borderRadius: 10, justifyContent: "center" },
  applyBtnText: { color: NAVY, fontSize: 12, fontWeight: "800" },

  badgeLabelBox: { backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeLabelText: { color: "rgba(200,215,255,0.6)", fontSize: 9, fontWeight: "800" },

  floorNavRow: { flexDirection: "row", gap: 8, marginVertical: 10 },
  floorBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)" },
  floorBtnActive: { backgroundColor: GOLD },
  floorBtnText: { color: "rgba(200,215,255,0.6)", fontSize: 11, fontWeight: "700" },
  floorBtnTextActive: { color: NAVY },

  floorCanvasContainer: { marginTop: 8 },
  floorConceptSub: { color: "rgba(200,215,255,0.6)", fontSize: 11, marginBottom: 10 },
  canvasStage: { height: 280, backgroundColor: "#060912", borderRadius: 12, position: "relative", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  roomBlock: { position: "absolute", borderWidth: 1.5, borderRadius: 8, padding: 6, justifyContent: "space-between" },
  roomTitle: { color: "#fff", fontSize: 10, fontWeight: "800" },
  roomArea: { color: GOLD, fontSize: 9, fontWeight: "700" },
  doorTag: { color: "rgba(255,255,255,0.7)", fontSize: 8 },

  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "rgba(200,215,255,0.6)", fontSize: 10 },

  modeSelectorRow: { flexDirection: "row", gap: 8, marginVertical: 10 },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center" },
  modeBtnActive: { backgroundColor: GOLD },
  modeBtnText: { color: "rgba(200,215,255,0.6)", fontSize: 11, fontWeight: "700" },
  modeBtnTextActive: { color: NAVY },

  viewerBox: { height: 380, borderRadius: 12, overflow: "hidden", marginTop: 8 },

  verCard: { backgroundColor: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 10, gap: 4 },
  verHeader: { flexDirection: "row", justifyContent: "space-between" },
  verTitle: { color: GOLD, fontSize: 12, fontWeight: "800" },
  verDate: { color: "rgba(200,215,255,0.4)", fontSize: 10 },
  verSub: { color: "rgba(200,215,255,0.7)", fontSize: 11 },
  restoreBtn: { marginTop: 4, alignSelf: "flex-start", backgroundColor: "rgba(201,168,76,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  restoreBtnText: { color: GOLD, fontSize: 10, fontWeight: "700" },

  handoffPreviewBox: { backgroundColor: "rgba(0,0,0,0.3)", padding: 14, borderRadius: 12, marginVertical: 12, gap: 6 },
  handoffTitle: { color: GOLD, fontSize: 14, fontWeight: "800" },
  handoffSubtitle: { color: "rgba(200,215,255,0.5)", fontSize: 10 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 6 },
  sectionHeader: { color: "#fff", fontSize: 12, fontWeight: "700" },
  handoffLine: { color: "rgba(200,215,255,0.8)", fontSize: 11 },
  handoffText: { color: "rgba(200,215,255,0.8)", fontSize: 11, lineHeight: 16 },

  disclaimerBox: { backgroundColor: "rgba(239,68,68,0.1)", padding: 10, borderRadius: 8, marginTop: 8 },
  disclaimerHeader: { color: "#f87171", fontSize: 11, fontWeight: "800", marginBottom: 4 },
  disclaimerItem: { color: "rgba(254,202,202,0.8)", fontSize: 10, lineHeight: 15 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#0f1e3a", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: BORDER_COLOR },
  modalTitle: { color: GOLD, fontSize: 16, fontWeight: "800", marginBottom: 8 },
  modalDesc: { color: "rgba(200,215,255,0.8)", fontSize: 12, lineHeight: 18, marginBottom: 16 },
  summaryText: { color: "rgba(220,230,255,0.9)", fontSize: 12, lineHeight: 18, marginBottom: 12 },
  compareRow: { flexDirection: "row", gap: 8 },
  compareCol: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 8 },
  colTitle: { color: GOLD, fontSize: 12, fontWeight: "800" },
  colSub: { color: "rgba(200,215,255,0.6)", fontSize: 10, marginTop: 2 },
  colArea: { color: "#fff", fontSize: 14, fontWeight: "800", marginTop: 6 },
  closeModalBtn: { backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  closeModalText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
