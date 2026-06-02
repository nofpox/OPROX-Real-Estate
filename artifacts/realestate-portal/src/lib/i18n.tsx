import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Language = 'en' | 'ar';

const STORAGE_KEY = 'rakez-re-lang';

function getSavedLang(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    // ignore
  }
  return 'ar';
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const translations = {
  en: {
    // ── Navigation ──────────────────────────────────────────────────────────
    'nav.home':     'Home',
    'nav.listings': 'Properties',
    'nav.services': 'Services',
    'nav.contact':  'Contact Us',
    'nav.portal':   'Client Portal',

    // ── Hero ────────────────────────────────────────────────────────────────
    'hero.title':    'Premium Property Management in Saudi Arabia',
    'hero.subtitle': 'Discover exclusive hotels, compounds, and corporate facilities managed with focus and precision.',
    'hero.cta':      'Explore Properties',

    // ── General ─────────────────────────────────────────────────────────────
    'featured.title':   'Featured Properties',
    'services.title':   'Our Operational Services',
    'footer.description': 'Rakez Smart Solutions — Focused and precise property management across Saudi Arabia.',
    'contact.title':    'Get in Touch',
    'search.placeholder': 'Search properties...',

    // ── CTA labels ──────────────────────────────────────────────────────────
    'cta.sale':        'Inquire to Purchase',
    'cta.rent':        'Book a Viewing',
    'cta.operational': 'Inquire for Management',

    // ── Listing detail ───────────────────────────────────────────────────────
    'detail.operationalHeading':       'Under Rakez Management',
    'detail.operationalText':          'This property is actively managed by Rakez Smart Solutions. Our team handles operations, staffing, maintenance, and reporting.',
    'detail.inquiry.saleHeading':      'Purchase Inquiry',
    'detail.inquiry.saleBtn':          'Send Purchase Inquiry',
    'detail.inquiry.rentHeading':      'Rental Inquiry',
    'detail.inquiry.rentBtn':          'Book a Viewing',
    'detail.inquiry.operationalHeading': 'Inquire for Management',
    'detail.inquiry.operationalBtn':   'Send Management Inquiry',
    'detail.portalPrompt':             'Already a Rakez client?',
    'detail.portalLink':               'Sign in to your portal →',

    // ── Portal auth ──────────────────────────────────────────────────────────
    'portal.loginTitle':              'Client Portal Login',
    'portal.loginSubtitle':           'Access your managed properties and reports',
    'portal.organizationId':          'Organization ID',
    'portal.organizationIdPlaceholder': 'e.g. your-company',
    'portal.username':                'Username',
    'portal.password':                'Password',
    'portal.loggingIn':               'Signing in...',
    'portal.loginButton':             'Sign in',
    'portal.backToWebsite':           'Back to website',

    // ── Portal dashboard – header / KPIs ─────────────────────────────────────
    'portal.myPortfolio':     'My Portfolio',
    'portal.welcome':         'Welcome back,',
    'portal.logout':          'Logout',
    'portal.totalProperties': 'Total Properties',
    'portal.activeBookings':  'Active Bookings',
    'portal.avgOccupancy':    'Avg. Occupancy',

    // ── Portal dashboard – tabs & filters ────────────────────────────────────
    'portal.overview':      'Overview',
    'portal.financials':    'Financials',
    'portal.allProperties': 'All Properties',
    'portal.allStatuses':   'All Statuses',

    // ── Portal dashboard – property card ─────────────────────────────────────
    'portal.managedProperties': 'Managed Properties',
    'portal.occupancy':         'Occupancy',
    'portal.viewListing':       'View Listing',
    'portal.roomsUnit':         'rooms',

    // ── Portal dashboard – property types ─────────────────────────────────────
    'portal.type.hotel':       'Hotel',
    'portal.type.compound':    'Compound',
    'portal.type.apartment':   'Apartment',
    'portal.type.villa':       'Villa',
    'portal.type.office':      'Office',
    'portal.type.commercial':  'Commercial',
    'portal.type.warehouse':   'Warehouse',

    // ── Portal dashboard – status labels ─────────────────────────────────────
    'portal.status.active':     'Active',
    'portal.status.inactive':   'Inactive',
    'portal.status.confirmed':  'Confirmed',
    'portal.status.checkedIn':  'Checked In',
    'portal.status.checkedOut': 'Checked Out',
    'portal.status.cancelled':  'Cancelled',
    'portal.status.pending':    'Pending',

    // ── Portal dashboard – bookings table ─────────────────────────────────────
    'portal.recentBookings': 'Recent Bookings',
    'portal.col.guest':      'Guest',
    'portal.col.property':   'Property',
    'portal.col.room':       'Room',
    'portal.col.checkIn':    'Check In',
    'portal.col.checkOut':   'Check Out',
    'portal.col.status':     'Status',
    'portal.noBookings':     'No bookings found.',

    // ── Portal dashboard – financials tab ─────────────────────────────────────
    'portal.period':                  'Period',
    'portal.revenue':                 'Revenue',
    'portal.expenses':                'Expenses',
    'portal.netProfit':               'Net Profit',
    'portal.margin':                  'Margin',
    'portal.revenueMinusExpenses':    'Revenue − Expenses',
    'portal.profitMargin':            'Profit margin',
    'portal.monthlyCashFlow':         'Monthly Cash Flow',
    'portal.noFinancialData':         'No financial data for the selected period.',
    'portal.netIncome':               'Net Income',
    'portal.col.month':               'Month',

    // ── Portal – property management ──────────────────────────────────────────
    'portal.manage':              'My Properties',
    'portal.totalUnits':          'Total Units',
    'portal.addProperty':         'Add Property',
    'portal.editProperty':        'Edit Property',
    'portal.deleteProperty':      'Delete Property',
    'portal.propertyName':        'Property Name',
    'portal.propertyType':        'Type',
    'portal.propertyAddress':     'Address',
    'portal.propertyCity':        'City',
    'portal.propertyCountry':     'Country',
    'portal.propertyDescription': 'Description (optional)',
    'portal.propertyStatus':      'Status',
    'portal.save':                'Save',
    'portal.saving':              'Saving...',
    'portal.cancel':              'Cancel',
    'portal.delete':              'Delete',
    'portal.deleting':            'Deleting...',
    'portal.confirmDelete':       'This will permanently delete the property and all its units. Continue?',
    'portal.noProperties':        'No properties yet. Add your first property to get started.',
    'portal.unitsCount':          'units',

    // ── Portal – unit management ───────────────────────────────────────────────
    'portal.units':            'Units',
    'portal.addUnit':          'Add Unit',
    'portal.editUnit':         'Edit Unit',
    'portal.deleteUnit':       'Delete Unit',
    'portal.confirmDeleteUnit':'This will permanently delete this unit. Continue?',
    'portal.unitNumber':       'Unit Number',
    'portal.unitFloor':        'Floor',
    'portal.unitType':         'Unit Type',
    'portal.unitArea':         'Area (m²)',
    'portal.unitBedrooms':     'Bedrooms',
    'portal.unitBathrooms':    'Bathrooms',
    'portal.unitStatus':       'Status',
    'portal.unitRent':         'Monthly Rent (SAR)',
    'portal.unitNotes':        'Notes (optional)',
    'portal.noUnits':          'No units registered yet.',
    'portal.backToProperties': 'Back to Properties',
    'portal.col.unitNumber':   'Unit',
    'portal.col.unitType':     'Type',
    'portal.col.unitArea':     'Area',
    'portal.col.unitBedrooms': 'Beds',
    'portal.col.unitBathrooms':'Baths',
    'portal.col.unitStatus':   'Status',
    'portal.col.unitRent':     'Monthly Rent',
    'portal.col.actions':      'Actions',

    // ── Unit types ────────────────────────────────────────────────────────────
    'portal.type.studio':     'Studio',
    'portal.type.1br':        '1 Bedroom',
    'portal.type.2br':        '2 Bedrooms',
    'portal.type.3br':        '3 Bedrooms',
    'portal.type.4br':        '4 Bedrooms',
    'portal.type.penthouse':  'Penthouse',
    'portal.type.duplex':     'Duplex',

    // ── Unit status ───────────────────────────────────────────────────────────
    'portal.status.available':   'Available',
    'portal.status.occupied':    'Occupied',
    'portal.status.maintenance': 'Maintenance',

    // ── Operational Control ───────────────────────────────────────────────────
    'ops.tab':             'Role Permissions',
    'ops.title':           'Delegation Chain',
    'ops.subtitle':        'Configure operational permissions for each role. Higher roles can only delegate permissions they hold to roles below them.',
    // Chain UI
    'ops.chainTitle':          'DELEGATION CHAIN',
    'ops.sovereigntyTitle':    'Owner Sovereignty — Complete Control',
    'ops.sovereigntyDesc':     'Every role is fully configurable. Grant permissions down the chain, then save. Each role can only delegate what it owns.',
    'ops.grantAll':            'Grant All',
    'ops.clearAll':            'Clear All',
    'ops.saveRolePerms':       'Save Changes',
    'ops.rolePermsSaved':      'Saved',
    'ops.rolePermsSaving':     'Saving...',
    'ops.ownerAllPerms':       'All 8 permissions — always active',
    'ops.readonlyForTier':     'View only — you cannot edit this role level',
    'ops.teamForRole':         'Team Members',
    'ops.noTeamForRole':       'No members assigned to this role.',
    'ops.permCount':           '{count}/{total} permissions',
    // Role names in the chain
    'ops.role.owner':          'Owner',
    'ops.role.company':        'Company',
    'ops.role.manager':        'Manager',
    'ops.role.secretariat':    'Secretariat',
    'ops.role.dept_manager':   'Dept. Manager',
    'ops.role.admin_general':  'Administrator',
    'ops.role.supervisor':     'Supervisor',
    'ops.role.maintenance':    'Maintenance',
    'ops.role.worker':         'Workers',
    'ops.role.security':       'Security',
    // Legacy tier labels (kept for member badge display)
    'ops.tierAdmin':       'Admin',
    'ops.tierSupervisor':  'Manager',
    'ops.tierWorker':      'Staff',
    'ops.roleLabel':       'Role',
    'ops.activeLabel':     'Active',
    'ops.inactiveLabel':   'Inactive',
    'ops.saved':           'Saved',
    'ops.saving':          'Saving...',
    'ops.permissionsSaved':'Permissions updated',
    'ops.addMember':       'Add Team Member',
    'ops.noMembers':       'No team members found.',
    'ops.loading':         'Loading team...',
    // Groups
    'ops.group.property':  'Property Management',
    'ops.group.marketing': 'Marketing & Listings',
    'ops.group.support':   'Customer Support',
    // Permissions
    'ops.perm.property_add':          'Add Property',
    'ops.perm.property_edit':         'Edit Property',
    'ops.perm.property_delete':       'Delete Property',
    'ops.perm.property_publish':      'Publish / Unpublish',
    'ops.perm.marketing_campaigns':   'Campaigns',
    'ops.perm.marketing_listings':    'Listing Updates',
    'ops.perm.support_inquiries':     'Inquiries',
    'ops.perm.support_messages':      'Messages & Calls',
    // Mode banner
    'ops.adminMode':    'You have full authority — configure permissions for any role in the chain.',
    'ops.managerMode':  'You can delegate your own permissions to roles below yours.',
  },

  ar: {
    // ── Navigation ──────────────────────────────────────────────────────────
    'nav.home':     'الرئيسية',
    'nav.listings': 'العقارات',
    'nav.services': 'الخدمات',
    'nav.contact':  'اتصل بنا',
    'nav.portal':   'بوابة العميل',

    // ── Hero ────────────────────────────────────────────────────────────────
    'hero.title':    'إدارة عقارات متميزة في المملكة العربية السعودية',
    'hero.subtitle': 'اكتشف فنادق، مجمعات سكنية، ومرافق شركات تدار بتركيز ودقة عالية.',
    'hero.cta':      'استكشف العقارات',

    // ── General ─────────────────────────────────────────────────────────────
    'featured.title':     'عقارات مميزة',
    'services.title':     'خدماتنا التشغيلية',
    'footer.description': 'ركز للحلول الذكية — إدارة عقارات بتركيز ودقة في جميع أنحاء المملكة.',
    'contact.title':      'تواصل معنا',
    'search.placeholder': 'ابحث عن العقارات...',

    // ── CTA labels ──────────────────────────────────────────────────────────
    'cta.sale':        'استفسار للشراء',
    'cta.rent':        'حجز موعد للمعاينة',
    'cta.operational': 'استفسار عن الإدارة',

    // ── Listing detail ───────────────────────────────────────────────────────
    'detail.operationalHeading':       'تحت إدارة ركز',
    'detail.operationalText':          'يُدار هذا العقار بفعالية من قبل ركز للحلول الذكية. يتولى فريقنا العمليات، التوظيف، الصيانة، وتقديم التقارير.',
    'detail.inquiry.saleHeading':      'استفسار شراء',
    'detail.inquiry.saleBtn':          'إرسال استفسار الشراء',
    'detail.inquiry.rentHeading':      'استفسار تأجير',
    'detail.inquiry.rentBtn':          'حجز موعد معاينة',
    'detail.inquiry.operationalHeading': 'استفسار للإدارة',
    'detail.inquiry.operationalBtn':   'إرسال استفسار الإدارة',
    'detail.portalPrompt':             'هل أنت عميل لركز؟',
    'detail.portalLink':               'تسجيل الدخول إلى بوابتك ←',

    // ── Portal auth ──────────────────────────────────────────────────────────
    'portal.loginTitle':              'تسجيل الدخول لبوابة العملاء',
    'portal.loginSubtitle':           'قم بالوصول إلى عقاراتك المدارة وتقاريرك',
    'portal.organizationId':          'معرف المؤسسة',
    'portal.organizationIdPlaceholder': 'مثال: شركتك',
    'portal.username':                'اسم المستخدم',
    'portal.password':                'كلمة المرور',
    'portal.loggingIn':               'جاري تسجيل الدخول...',
    'portal.loginButton':             'تسجيل الدخول',
    'portal.backToWebsite':           'العودة للموقع',

    // ── Portal dashboard – header / KPIs ─────────────────────────────────────
    'portal.myPortfolio':     'محفظتي',
    'portal.welcome':         'مرحباً بعودتك،',
    'portal.logout':          'تسجيل الخروج',
    'portal.totalProperties': 'إجمالي العقارات',
    'portal.activeBookings':  'الحجوزات النشطة',
    'portal.avgOccupancy':    'متوسط الإشغال',

    // ── Portal dashboard – tabs & filters ────────────────────────────────────
    'portal.overview':      'نظرة عامة',
    'portal.financials':    'المالية',
    'portal.allProperties': 'جميع العقارات',
    'portal.allStatuses':   'جميع الحالات',

    // ── Portal dashboard – property card ─────────────────────────────────────
    'portal.managedProperties': 'العقارات المدارة',
    'portal.occupancy':         'الإشغال',
    'portal.viewListing':       'عرض العقار',
    'portal.roomsUnit':         'غرفة',

    // ── Portal dashboard – property types ─────────────────────────────────────
    'portal.type.hotel':       'فندق',
    'portal.type.compound':    'مجمع',
    'portal.type.apartment':   'شقة',
    'portal.type.villa':       'فيلا',
    'portal.type.office':      'مكتب',
    'portal.type.commercial':  'تجاري',
    'portal.type.warehouse':   'مستودع',

    // ── Portal dashboard – status labels ─────────────────────────────────────
    'portal.status.active':     'نشط',
    'portal.status.inactive':   'غير نشط',
    'portal.status.confirmed':  'مؤكد',
    'portal.status.checkedIn':  'تم الدخول',
    'portal.status.checkedOut': 'تم المغادرة',
    'portal.status.cancelled':  'ملغي',
    'portal.status.pending':    'قيد الانتظار',

    // ── Portal dashboard – bookings table ─────────────────────────────────────
    'portal.recentBookings': 'الحجوزات الأخيرة',
    'portal.col.guest':      'الضيف',
    'portal.col.property':   'العقار',
    'portal.col.room':       'الغرفة',
    'portal.col.checkIn':    'تاريخ الوصول',
    'portal.col.checkOut':   'تاريخ المغادرة',
    'portal.col.status':     'الحالة',
    'portal.noBookings':     'لا توجد حجوزات.',

    // ── Portal dashboard – financials tab ─────────────────────────────────────
    'portal.period':               'الفترة',
    'portal.revenue':              'الإيرادات',
    'portal.expenses':             'المصروفات',
    'portal.netProfit':            'صافي الربح',
    'portal.margin':               'الهامش',
    'portal.revenueMinusExpenses': 'الإيرادات − المصروفات',
    'portal.profitMargin':         'هامش الربح',
    'portal.monthlyCashFlow':      'التدفق النقدي الشهري',
    'portal.noFinancialData':      'لا توجد بيانات مالية للفترة المحددة.',
    'portal.netIncome':            'صافي الدخل',
    'portal.col.month':            'الشهر',

    // ── Portal – property management ──────────────────────────────────────────
    'portal.manage':              'عقاراتي',
    'portal.totalUnits':          'إجمالي الوحدات',
    'portal.addProperty':         'إضافة عقار',
    'portal.editProperty':        'تعديل العقار',
    'portal.deleteProperty':      'حذف العقار',
    'portal.propertyName':        'اسم العقار',
    'portal.propertyType':        'النوع',
    'portal.propertyAddress':     'العنوان',
    'portal.propertyCity':        'المدينة',
    'portal.propertyCountry':     'الدولة',
    'portal.propertyDescription': 'الوصف (اختياري)',
    'portal.propertyStatus':      'الحالة',
    'portal.save':                'حفظ',
    'portal.saving':              'جاري الحفظ...',
    'portal.cancel':              'إلغاء',
    'portal.delete':              'حذف',
    'portal.deleting':            'جاري الحذف...',
    'portal.confirmDelete':       'سيؤدي هذا إلى حذف العقار وجميع وحداته نهائياً. هل تريد المتابعة؟',
    'portal.noProperties':        'لا توجد عقارات بعد. أضف عقارك الأول للبدء.',
    'portal.unitsCount':          'وحدة',

    // ── Portal – unit management ───────────────────────────────────────────────
    'portal.units':            'الوحدات',
    'portal.addUnit':          'إضافة وحدة',
    'portal.editUnit':         'تعديل الوحدة',
    'portal.deleteUnit':       'حذف الوحدة',
    'portal.confirmDeleteUnit':'سيؤدي هذا إلى حذف هذه الوحدة نهائياً. هل تريد المتابعة؟',
    'portal.unitNumber':       'رقم الوحدة',
    'portal.unitFloor':        'الطابق',
    'portal.unitType':         'نوع الوحدة',
    'portal.unitArea':         'المساحة (م²)',
    'portal.unitBedrooms':     'غرف النوم',
    'portal.unitBathrooms':    'دورات المياه',
    'portal.unitStatus':       'حالة الوحدة',
    'portal.unitRent':         'الإيجار الشهري (ر.س)',
    'portal.unitNotes':        'ملاحظات (اختياري)',
    'portal.noUnits':          'لا توجد وحدات مسجلة بعد.',
    'portal.backToProperties': 'العودة إلى العقارات',
    'portal.col.unitNumber':   'الوحدة',
    'portal.col.unitType':     'النوع',
    'portal.col.unitArea':     'المساحة',
    'portal.col.unitBedrooms': 'غرف',
    'portal.col.unitBathrooms':'حمامات',
    'portal.col.unitStatus':   'الحالة',
    'portal.col.unitRent':     'الإيجار',
    'portal.col.actions':      'إجراءات',

    // ── Unit types ────────────────────────────────────────────────────────────
    'portal.type.studio':     'استديو',
    'portal.type.1br':        'غرفة نوم',
    'portal.type.2br':        'غرفتا نوم',
    'portal.type.3br':        'ثلاث غرف',
    'portal.type.4br':        'أربع غرف',
    'portal.type.penthouse':  'بنتهاوس',
    'portal.type.duplex':     'دوبلكس',

    // ── Unit status ───────────────────────────────────────────────────────────
    'portal.status.available':   'متاحة',
    'portal.status.occupied':    'مؤجرة',
    'portal.status.maintenance': 'صيانة',

    // ── Operational Control ───────────────────────────────────────────────────
    'ops.tab':             'صلاحيات الأدوار',
    'ops.title':           'سلسلة التفويض',
    'ops.subtitle':        'حدد الصلاحيات التشغيلية لكل دور. تستطيع الأدوار الأعلى تفويض ما تمتلكه فقط للأدوار أدناها.',
    // Chain UI
    'ops.chainTitle':          'سلسلة التفويض',
    'ops.sovereigntyTitle':    'صلاحية المالك — تحكم كامل',
    'ops.sovereigntyDesc':     'كل الأدوار قابلة للتهيئة. امنح الصلاحيات أسفل السلسلة ثم احفظ. كل دور يفوض ما يمتلكه فقط.',
    'ops.grantAll':            'منح الكل',
    'ops.clearAll':            'مسح الكل',
    'ops.saveRolePerms':       'حفظ التغييرات',
    'ops.rolePermsSaved':      'تم الحفظ',
    'ops.rolePermsSaving':     'جاري الحفظ...',
    'ops.ownerAllPerms':       'جميع الصلاحيات الـ 8 — نشطة دائماً',
    'ops.readonlyForTier':     'للعرض فقط — لا يمكنك تعديل هذا المستوى',
    'ops.teamForRole':         'أعضاء الفريق',
    'ops.noTeamForRole':       'لا يوجد أعضاء بهذا الدور.',
    'ops.permCount':           '{count}/{total} صلاحيات',
    // Role names in the chain
    'ops.role.owner':          'المالك',
    'ops.role.company':        'الشركة',
    'ops.role.manager':        'المدير',
    'ops.role.secretariat':    'الأمانة العامة',
    'ops.role.dept_manager':   'مدير القسم',
    'ops.role.admin_general':  'المدير العام',
    'ops.role.supervisor':     'المشرف',
    'ops.role.maintenance':    'الصيانة',
    'ops.role.worker':         'الموظفون',
    'ops.role.security':       'الأمن',
    // Legacy tier labels
    'ops.tierAdmin':       'مسؤول',
    'ops.tierSupervisor':  'مدير',
    'ops.tierWorker':      'موظف',
    'ops.roleLabel':       'الدور',
    'ops.activeLabel':     'نشط',
    'ops.inactiveLabel':   'غير نشط',
    'ops.saved':           'تم الحفظ',
    'ops.saving':          'جاري الحفظ...',
    'ops.permissionsSaved':'تم تحديث الصلاحيات',
    'ops.addMember':       'إضافة عضو',
    'ops.noMembers':       'لا يوجد أعضاء في الفريق.',
    'ops.loading':         'جاري تحميل الفريق...',
    // Groups
    'ops.group.property':  'إدارة العقارات',
    'ops.group.marketing': 'التسويق والإعلانات',
    'ops.group.support':   'خدمة العملاء',
    // Permissions
    'ops.perm.property_add':          'إضافة عقار',
    'ops.perm.property_edit':         'تعديل عقار',
    'ops.perm.property_delete':       'حذف عقار',
    'ops.perm.property_publish':      'نشر / إلغاء النشر',
    'ops.perm.marketing_campaigns':   'الحملات',
    'ops.perm.marketing_listings':    'تحديث الإعلانات',
    'ops.perm.support_inquiries':     'الاستفسارات',
    'ops.perm.support_messages':      'الرسائل والمكالمات',
    // Mode banner
    'ops.adminMode':    'لديك السلطة الكاملة — هيئ صلاحيات أي دور في السلسلة.',
    'ops.managerMode':  'يمكنك تفويض صلاحياتك للأدوار أدناك.',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: (key) => key,
  isRtl: true
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getSavedLang);

  const setLanguage = useCallback((lang: Language) => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    setLanguageState(lang);
  }, []);

  useEffect(() => {
    document.documentElement.dir  = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: string): string => {
    return (translations[language] as Record<string, string>)[key] || key;
  }, [language]);

  const contextValue = useMemo<LanguageContextType>(
    () => ({ language, setLanguage, t, isRtl: language === 'ar' }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
