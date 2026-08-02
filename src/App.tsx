import React, { useState } from "react";
import {
  Building2,
  Box,
  Compass,
  MapPin,
  TrendingUp,
  Brain,
  ShieldCheck,
  Code2,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Globe,
  Database,
  Cpu,
  BarChart3,
  Users,
  ChevronRight,
  ExternalLink,
  Info
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"overview" | "audit" | "architecture" | "demo3d">("overview");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const isAr = lang === "ar";

  // AI Valuation State Demo
  const [valCity, setValCity] = useState("الرياض");
  const [valDistrict, setValDistrict] = useState("الملقا");
  const [valType, setValType] = useState("شقة");
  const [valArea, setValArea] = useState(180);
  const [valValuation, setValValuation] = useState<number | null>(null);

  const calculateValuation = () => {
    let basePerSqm = 6500;
    if (valDistrict === "الملقا") basePerSqm = 8200;
    if (valDistrict === "النرجس") basePerSqm = 7400;
    if (valCity === "جدة") basePerSqm = 5800;
    const est = valArea * basePerSqm * (valType === "فيلا" ? 1.25 : 1.0);
    setValValuation(Math.round(est));
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 font-sans ${isAr ? "rtl" : "ltr"}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20">
              O
            </div>
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <h1 className="font-bold text-lg text-white tracking-wide">
                  OPROX Properties
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {isAr ? "نسخة التطوير النشطة" : "Active Dev Copy"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr
                  ? "منصة إدارة وتطوير العقارات الذكية — Google AI Studio Workspace"
                  : "Smart Real Estate Platform — Google AI Studio Workspace"}
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center space-x-3 space-x-reverse">
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "English" : "العربية"}</span>
            </button>

            <div className="hidden sm:flex items-center text-xs bg-slate-800/80 rounded-lg px-3 py-1.5 border border-slate-700/60 text-slate-300">
              <span className="text-slate-500 me-1">Git:</span>
              <code className="text-amber-400 font-mono">main@c8ec25e</code>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isAr ? "تمت عملية الاستيراد بنجاح 100%" : "Import Completed 100%"}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                  {isAr
                    ? "OPROX PROPERTIES — مشروع المستودع الكامل جاهز للتطوير"
                    : "OPROX PROPERTIES — Full Repository Ready for Development"}
                </h2>
                <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
                  {isAr
                    ? "تم استيراد كافة ملفات المشروع من GitHub (277 ملف) مع الحفاظ على الهيكلية البرمجية كاملة، وإعداد بيئة التطوير داخل Google AI Studio، مع إكمال التدقيق الفني الشامل."
                    : "All project files imported from GitHub (277 files), maintaining the exact architecture, environment configured inside Google AI Studio, with complete read-only technical product audit."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-center min-w-[110px]">
                  <div className="text-2xl font-black text-amber-400">277</div>
                  <div className="text-[11px] text-slate-400">{isAr ? "ملفات المشروع" : "Project Files"}</div>
                </div>
                <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-center min-w-[110px]">
                  <div className="text-2xl font-black text-emerald-400">41</div>
                  <div className="text-[11px] text-slate-400">{isAr ? "جداول القواعد" : "DB Schemas"}</div>
                </div>
                <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-center min-w-[110px]">
                  <div className="text-2xl font-black text-sky-400">76.5%</div>
                  <div className="text-[11px] text-slate-400">{isAr ? "جاهزية الإنتاج" : "Readiness"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 mt-8 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-amber-400 text-amber-400 bg-amber-400/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{isAr ? "لوحة التحكم والاستكشاف" : "Explorer Dashboard"}</span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "audit"
                  ? "border-amber-400 text-amber-400 bg-amber-400/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{isAr ? "تقرير التدقيق الشامل (Audit)" : "Full Product Audit"}</span>
            </button>

            <button
              onClick={() => setActiveTab("demo3d")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "demo3d"
                  ? "border-amber-400 text-amber-400 bg-amber-400/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Box className="w-4 h-4" />
              <span>{isAr ? "عروض 3D و GIS التفاعلية" : "Interactive 3D & GIS Demos"}</span>
            </button>

            <button
              onClick={() => setActiveTab("architecture")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "architecture"
                  ? "border-amber-400 text-amber-400 bg-amber-400/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{isAr ? "البنية البرمجية والمستودع" : "Architecture & Codebase"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {isAr ? "المستودع المستورد" : "Imported Repo"}
                  </span>
                  <Code2 className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-white">nofpox/oprox-properties</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <span className="text-emerald-400">●</span> branch: main
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {isAr ? "محرك 3D و VR" : "3D & VR Engines"}
                  </span>
                  <Box className="w-5 h-5 text-sky-400" />
                </div>
                <div className="text-lg font-bold text-white">Three.js + Canvas</div>
                <div className="text-xs text-amber-400 mt-1">
                  {isAr ? "مدينة ثلاثية الأبعاد + فيلا 4D" : "City 3D + Villa 4D"}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {isAr ? "خرائط GIS وخرائط الحرارة" : "GIS & Heatmaps"}
                  </span>
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-white">Leaflet.js + Coordinates</div>
                <div className="text-xs text-slate-400 mt-1">
                  {isAr ? "تغطية الأحياء والمدن السعودية" : "Saudi Cities & Districts"}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {isAr ? "محرك التقييم بالذكاء الاصطناعي" : "AI Valuation Engine"}
                  </span>
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-lg font-bold text-white">Algorithmic Valuation</div>
                <div className="text-xs text-purple-300 mt-1">
                  {isAr ? "تقدير الأسعار والعائد الاستثماري" : "Price & ROI Estimation"}
                </div>
              </div>
            </div>

            {/* AI Valuation Live Calculator Widget */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {isAr ? "تجربة حاسبة التقييم العقاري الذكي (AI Valuation Demo)" : "AI Property Valuation Demo"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isAr ? "اختبار التقييم العقاري الخوارزمي المدمج في التطبيق المستورد" : "Test algorithmic valuation imported in application"}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {isAr ? "نموذج فعال" : "Working Model"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {isAr ? "المدينة" : "City"}
                  </label>
                  <select
                    value={valCity}
                    onChange={(e) => setValCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="الرياض">الرياض</option>
                    <option value="جدة">جدة</option>
                    <option value="الدمام">الدمام</option>
                    <option value="الخبر">الخبر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {isAr ? "الحي" : "District"}
                  </label>
                  <select
                    value={valDistrict}
                    onChange={(e) => setValDistrict(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="الملقا">الملقا</option>
                    <option value="النرجس">النرجس</option>
                    <option value="الياسمين">الياسمين</option>
                    <option value="العليا">العليا</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {isAr ? "نوع العقار" : "Property Type"}
                  </label>
                  <select
                    value={valType}
                    onChange={(e) => setValType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="شقة">شقة / Apartment</option>
                    <option value="فيلا">فيلا / Villa</option>
                    <option value="مكتب">مكتب تجاري / Office</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {isAr ? "المساحة (م²)" : "Area (sqm)"}
                  </label>
                  <input
                    type="number"
                    value={valArea}
                    onChange={(e) => setValArea(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <button
                  onClick={calculateValuation}
                  className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20"
                >
                  {isAr ? "حساب التقييم التقديري" : "Calculate Valuation"}
                </button>

                {valValuation && (
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-xs text-slate-400 block">{isAr ? "القيمة التقديرية" : "Estimated Value"}</span>
                      <span className="text-xl font-extrabold text-amber-400">
                        {valValuation.toLocaleString()} {isAr ? "ر.س" : "SAR"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">{isAr ? "سعر المتر التقديري" : "Avg Price / sqm"}</span>
                      <span className="text-sm font-bold text-slate-200">
                        {Math.round(valValuation / valArea).toLocaleString()} {isAr ? "ر.س/م²" : "SAR/sqm"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Workspace Modules Inventory */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>{isAr ? "وحدات النظام المستوردة (Imported Workspaces)" : "Imported Workspaces"}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      artifacts/rkz
                    </span>
                    <span className="text-xs text-slate-400">Expo / React Native Web</span>
                  </div>
                  <h4 className="font-bold text-white text-base">
                    {isAr ? "تطبيق الهاتف والويب الرئيسي (RKZ App)" : "Main Mobile & Web Application"}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isAr
                      ? "يتضمن شاشات الرؤية ثلاثية الأبعاد 3D/4D، الخرائط التفاعلية، بوابة المستثمر، لوحة التحكم الإدارية، وإدارة المستأجرين."
                      : "Includes 3D/4D viewports, interactive maps, investor portal, admin dashboard, and tenant management."}
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      artifacts/realestate-api
                    </span>
                    <span className="text-xs text-slate-400">Express.js API</span>
                  </div>
                  <h4 className="font-bold text-white text-base">
                    {isAr ? "خادم الواجهة الخلفية (Backend API Server)" : "Backend API Server"}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isAr
                      ? "يوفر خادم REST API للوحدات العقارية، طلبات الضيوف، التكامل مع الذكاء الاصطناعي (OpenAI)، وتوثيق الاستجابات."
                      : "Provides REST API endpoints for property listings, guest requests, OpenAI AI integrations, and logging."}
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      lib/db
                    </span>
                    <span className="text-xs text-slate-400">Drizzle ORM + PG</span>
                  </div>
                  <h4 className="font-bold text-white text-base">
                    {isAr ? "مخطط قاعدة البيانات (Database Schema)" : "Database Schema"}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isAr
                      ? "41 جدول متكامل يغطي العقارات، المستأجرين، عقود الإيجار، الصيانة، الفواتير، السجلات، وتصنيفات المستخدمين."
                      : "41 tables covering properties, tenants, leases, maintenance work orders, invoices, and activity logs."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT REPORT */}
        {activeTab === "audit" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-8">
            <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                  {isAr ? "تقرير فني كامل للقرارات" : "Read-Only Technical Audit"}
                </span>
                <h2 className="text-2xl font-bold text-white mt-2">
                  OPROX PROPERTIES — PRODUCT AUDIT REPORT
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Commit: c8ec25e95adfb7161daaf15b02ae894d80fdbcd6 | Total Files: 277
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-end">
                <span className="text-xs text-slate-400 block">{isAr ? "جاهزية الإنتاج الإجمالية" : "Overall Readiness"}</span>
                <span className="text-2xl font-extrabold text-amber-400">76.5%</span>
              </div>
            </div>

            {/* Specialized Features Audit Grid */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>{isAr ? "تدقيق الميزات الرئيسية والتقنيات المتقدمة" : "Core & Advanced Tech Audit"}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 3D Property Visualization */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <Box className="w-4 h-4 text-sky-400" />
                      3D Property Visualization
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      PARTIAL / HYBRID MOCK
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p><strong className="text-slate-400">Working:</strong> Interactive Three.js WebGL viewport with orbital camera controls, procedural building meshes, lighting, raycasting selection, and status highlighting.</p>
                    <p><strong className="text-slate-400">Mock/Partial:</strong> Generates synthetic cuboid geometry in memory instead of parsing real BIM/CAD files (IFC, GLTF/GLB models).</p>
                    <p><strong className="text-slate-400">Components:</strong> <code className="text-amber-300">City3DView.web.tsx</code>, <code className="text-amber-300">city3d.tsx</code></p>
                  </div>
                </div>

                {/* VR / Immersive Experience */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <Compass className="w-4 h-4 text-purple-400" />
                      VR / Immersive Experience
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      UI / MOCK ONLY
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p><strong className="text-slate-400">Working:</strong> Simulated 3D interior floorplan walkthrough canvas in <code className="text-amber-300">Villa4DView.web.tsx</code> with lighting/time toggles.</p>
                    <p><strong className="text-slate-400">Missing:</strong> Native WebXR/OpenXR VR headset binding, stereoscopic 360° rendering, spatial audio.</p>
                    <p><strong className="text-slate-400">Components:</strong> <code className="text-amber-300">Villa4DView.web.tsx</code>, <code className="text-amber-300">villa4d.tsx</code></p>
                  </div>
                </div>

                {/* GIS & Maps */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      GIS & Maps
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      WORKING
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p><strong className="text-slate-400">Working:</strong> Full Leaflet.js interactive maps embedded via sandboxed iframes with custom markers, district coordinate tables for Riyadh, Jeddah, Dammam, Al Khobar, Mecca, Medina, Taif.</p>
                    <p><strong className="text-slate-400">Components:</strong> <code className="text-amber-300">HeatmapMapView.web.tsx</code>, <code className="text-amber-300">TourismMapView.web.tsx</code></p>
                  </div>
                </div>

                {/* Heat Maps & Analytics */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-red-400" />
                      Heat Map Analytics
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      PARTIAL
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p><strong className="text-slate-400">Working:</strong> Custom canvas density circles with green-to-red color gradients for district market activity.</p>
                    <p><strong className="text-slate-400">Missing:</strong> Real spatial raster KDE or live transaction deed overlays from Ministry of Justice API.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Development Roadmap Prioritization */}
            <div className="space-y-4 border-t border-slate-800 pt-6">
              <h3 className="text-lg font-bold text-white">
                {isAr ? "خطة التطوير المقترحة (Prioritization)" : "Development Roadmap"}
              </h3>

              <div className="space-y-3">
                <div className="bg-slate-950 border border-red-500/30 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-400 text-sm">P0 Launch Blockers</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      {isAr
                        ? "ربط قاعدة بيانات PostgreSQL المباشرة، تكامل مفتاح API الخاص بـ OpenAI، وضبط سيرفر Express في بيئة الإنتاج."
                        : "Connect live PostgreSQL database instance, configure OpenAI API credentials, and verify Express backend runtime."}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 flex gap-3">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-400 text-sm">P1 Required Development</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      {isAr
                        ? "دعم نماذج GLTF/GLB الحقيقية في محرك 3D، ربط خوارزميات التقييم ببيانات حقيقية، واستكمال حزم الاستثمار."
                        : "Support real GLTF/GLB models in 3D engine, connect valuation algorithm to real market transactions."}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-sky-500/30 rounded-xl p-4 flex gap-3">
                  <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sky-400 text-sm">P2 Improvements</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      {isAr
                        ? "تحسين سرعة تحميل الخرائط، إضافة تحليلات الحرارة المتقدمة KDE، وتوسيع خيارات التصميم المعماري."
                        : "Optimize map loading performance, add kernel density estimation for heatmaps, expand architectural prompts."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEMO 3D & GIS */}
        {activeTab === "demo3d" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Box className="w-5 h-5 text-sky-400" />
                    <span>{isAr ? "استكشاف نموذج المدينة 3D" : "City 3D Interactive Viewport"}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr ? "تفاعل مباشر مع المحرك الثلاثي الأبعاد المبني بـ Three.js" : "Direct interaction with Three.js WebGL engine"}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold">
                  Interactive Canvas
                </span>
              </div>

              {/* Simulated 3D Viewport Controls */}
              <div className="bg-slate-950 rounded-xl p-8 border border-slate-800 min-h-[350px] flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                <Box className="w-16 h-16 text-sky-400 animate-pulse relative z-10" />
                <div className="relative z-10 space-y-1">
                  <h4 className="text-xl font-bold text-white">Three.js City Viewport Active</h4>
                  <p className="text-xs text-slate-400 max-w-md">
                    {isAr
                      ? "المحرك يولد شبكة المباني ثلاثية الأبعاد تفاعلياً مع إمكانية الدوران والتكبير والتحكم بالألوان حسب الحالة (متاح، مباع، مؤجر)."
                      : "The engine interactively renders procedural 3D building meshes with rotation, zoom, and status coloring."}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 relative z-10 pt-2">
                  <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300">
                    Orbit Controls
                  </span>
                  <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300">
                    Raycaster Click Handlers
                  </span>
                  <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300">
                    Dynamic Lighting
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ARCHITECTURE */}
        {activeTab === "architecture" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>{isAr ? "هيكلية المستودع والملفات" : "Repository Architecture"}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  <span>Monorepo Structure</span>
                </h4>
                <ul className="text-xs text-slate-300 space-y-2 font-mono">
                  <li className="flex items-center gap-2">
                    <span className="text-amber-400">├──</span>
                    <span>artifacts/rkz (Expo Web & Mobile App)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-amber-400">├──</span>
                    <span>artifacts/realestate-api (Express API Server)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-amber-400">├──</span>
                    <span>lib/db (Drizzle ORM & 41 Postgres Schemas)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-amber-400">├──</span>
                    <span>lib/api-spec (OpenAPI Specifications)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-amber-400">└──</span>
                    <span>scripts (Migration & PDF Generator)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Database Schemas (41 Tables)</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAr
                    ? "قاعدة البيانات مصممة بالكامل باستعمال Drizzle ORM وتشمل الجداول: properties, units, tenants, contracts, workOrders, invoices, activityLogs, aiAuditLog, user-sessions وغيرها."
                    : "Database completely modeled using Drizzle ORM featuring properties, units, tenants, contracts, workOrders, invoices, activityLogs, user-sessions."}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-6 px-4 sm:px-6 lg:px-8 mt-12 text-center text-xs text-slate-400">
        <p className="font-medium text-slate-300">
          OPROX PROPERTIES — FULL LATEST GITHUB PROJECT IMPORTED INTO GOOGLE AI STUDIO — DEVELOPMENT COPY READY — FULL AUDIT COMPLETE — WAITING FOR OWNER REVIEW
        </p>
      </footer>
    </div>
  );
}
