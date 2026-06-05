export interface AIReport {
  summary: string;
  insights: string[];
  actions: string[];
  score: number;
}

interface PropertyData {
  type: string;
  city: string;
  price: number;
  area?: number;
  bedrooms?: number;
  status: string;
  views: number;
  leads: number;
  publishedAt?: string;
}

export function generateLocalReport(properties: PropertyData[], isAr: boolean): AIReport {
  const published = properties.filter((p) => p.status === "published");
  const totalViews = properties.reduce((a, p) => a + p.views, 0);
  const totalLeads = properties.reduce((a, p) => a + p.leads, 0);
  const publishRate = properties.length > 0 ? published.length / properties.length : 0;

  const score = Math.min(100, Math.round(
    publishRate * 40 +
    Math.min(35, totalViews / 15) +
    Math.min(25, totalLeads * 3)
  ));

  if (isAr) {
    const summary =
      properties.length === 0
        ? "محفظتك فارغة. أضف عقاراتك الآن لتبدأ في تحقيق مشاهدات واستفسارات."
        : score >= 75
        ? `محفظتك في حالة ممتازة! ${published.length} عقار منشور مع ${totalViews.toLocaleString("ar-SA")} مشاهدة و${totalLeads} مستفسر. استمر على هذا المستوى.`
        : score >= 45
        ? `أداء جيد بشكل عام. ${published.length} من ${properties.length} عقارات منشورة. هناك فرص للتحسين.`
        : `يمكن تحسين أداء محفظتك. فقط ${published.length} عقار منشور حالياً.`;

    const insights: string[] = [];
    if (publishRate < 1) insights.push(`${properties.length - published.length} عقار لم يُنشر بعد — فرصة مشاهدات ضائعة`);
    if (totalViews > 0) insights.push(`متوسط ${Math.round(totalViews / Math.max(published.length, 1)).toLocaleString("ar-SA")} مشاهدة لكل عقار منشور`);
    if (totalLeads > 0) insights.push(`معدل تحويل المشاهدات إلى استفسارات: ${totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : 0}%`);
    if (insights.length === 0) insights.push("أضف عقاراتك الأولى للحصول على تحليل مفصّل");

    const actions: string[] = [];
    if (publishRate < 1) actions.push("انشر العقارات غير المفعّلة لزيادة المشاهدات فوراً");
    if (totalViews < 100) actions.push("أضف صوراً احترافية لرفع معدل النقر على قوائمك");
    if (totalLeads === 0) actions.push("أعد صياغة العناوين بذكر المميزات والموقع بوضوح");
    if (actions.length === 0) actions.push("استمر في تحديث القوائم كل أسبوعين للحفاظ على التصدر");

    return { summary, insights, actions, score };
  }

  const summary =
    properties.length === 0
      ? "Your portfolio is empty. Add your properties now to start getting views and leads."
      : score >= 75
      ? `Your portfolio is performing excellently! ${published.length} properties published with ${totalViews.toLocaleString()} views and ${totalLeads} leads.`
      : score >= 45
      ? `Good overall performance. ${published.length} of ${properties.length} properties published. There is room for improvement.`
      : `Your portfolio performance can be improved. Only ${published.length} properties are currently published.`;

  const insights: string[] = [];
  if (publishRate < 1) insights.push(`${properties.length - published.length} properties not yet published — missed views`);
  if (totalViews > 0) insights.push(`Average ${Math.round(totalViews / Math.max(published.length, 1)).toLocaleString()} views per published property`);
  if (totalLeads > 0) insights.push(`View-to-lead conversion rate: ${totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : 0}%`);
  if (insights.length === 0) insights.push("Add your first properties to get a detailed analysis");

  const actions: string[] = [];
  if (publishRate < 1) actions.push("Publish inactive properties to immediately increase visibility");
  if (totalViews < 100) actions.push("Add professional photos to boost click-through rates");
  if (totalLeads === 0) actions.push("Rewrite titles to clearly mention key features and location");
  if (actions.length === 0) actions.push("Keep refreshing listings every two weeks to maintain top placement");

  return { summary, insights, actions, score };
}
