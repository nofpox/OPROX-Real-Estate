import app from "./app.js";
import { logger } from "./lib/logger.js";
import { db, listingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function ensureListings(): Promise<void> {
  try {
    const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(listingsTable);
    if (cnt > 0) return;
    logger.info("Seeding listings table…");
    await db.execute(sql`
      INSERT INTO listings (tenant_id, title, description, listing_type, property_type, price, currency, area_sqm, bedrooms, bathrooms, amenities, media, address, city, district, lat, lng, status, featured, contact_email, contact_phone)
      VALUES
        (1,'فيلا فاخرة - حي النرجس','فيلا راقية بتشطيبات عالية المستوى في أرقى أحياء الرياض','sale','villa',2850000,'SAR',650,6,7,'["مسبح خاص","حديقة","مجلس","غرفة سائق","مصعد"]','[{"url":"https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800","caption":"واجهة الفيلا"}]','حي النرجس، شارع الأمير سلطان','الرياض','النرجس',24.7750,46.6523,'active',true,'sales@rozoz.sa','+966500000001'),
        (1,'شقة راقية في حي الملقا','شقة مودرن بإطلالة رائعة في قلب حي الملقا الراقي','rent','apartment',18000,'SAR',220,4,3,'["بلكونة","موقف خاص","أمن 24/7","مسبح"]','[{"url":"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800","caption":"غرفة المعيشة"}]','حي الملقا، طريق الملك فهد','الرياض','الملقا',24.8012,46.6389,'active',false,'sales@rozoz.sa','+966500000002'),
        (1,'أرض تجارية - طريق الملك فهد','أرض تجارية استثمارية بموقع استراتيجي على الطريق الرئيسي','sale','land',4200000,'SAR',1200,NULL,NULL,'["زاوية","واجهتين","قريبة من المراكز التجارية"]','[{"url":"https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800","caption":"الأرض التجارية"}]','طريق الملك فهد، حي العليا','الرياض','العليا',24.6877,46.7219,'active',false,'sales@rozoz.sa','+966500000003'),
        (1,'فيلا بإطلالة بحرية - جدة','فيلا فاخرة على ساحل البحر الأحمر بتصميم معاصر','sale','villa',5500000,'SAR',800,7,8,'["بركة سباحة","مولّد","مصعد","غرفة للخادمة"]','[{"url":"https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800","caption":"إطلالة الفيلا"}]','حي الشاطئ، جدة','جدة','الشاطئ',21.5433,39.1728,'active',true,'sales@rozoz.sa','+966500000004'),
        (1,'شقة مودرن في الدمام','شقة عصرية في قلب الدمام قريبة من جميع الخدمات','rent','apartment',12000,'SAR',180,3,2,'["كراج","مكيف مركزي","أمن"]','[{"url":"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800","caption":"غرفة النوم"}]','حي الفيصلية، الدمام','الدمام','الفيصلية',26.4367,50.1033,'active',false,'sales@rozoz.sa','+966500000005'),
        (1,'معرض تجاري - حي المربع','معرض تجاري بموقع متميز في المركز التجاري للرياض','rent','commercial',35000,'SAR',450,NULL,NULL,'["واجهة زجاجية","قريب من العملاء","موقف وفير"]','[{"url":"https://images.unsplash.com/photo-1497366216548-37526070297c?w=800","caption":"المعرض"}]','حي المربع، وسط الرياض','الرياض','المربع',24.6508,46.7741,'active',false,'sales@rozoz.sa','+966500000006'),
        (1,'فندق بوتيك - وسط الرياض','فندق بوتيك فاخر مرخص في قلب العاصمة الرياض','sale','hotel',22000000,'SAR',3200,NULL,NULL,'["50 غرفة","مطعم","صالة اجتماعات","موقف"]','[{"url":"https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800","caption":"لوبي الفندق"}]','حي العليا، الرياض','الرياض','العليا',24.7136,46.6753,'active',true,'sales@rozoz.sa','+966500000007'),
        (1,'مجمع سكني - المدينة المنورة','مجمع سكني هادئ قريب من المسجد النبوي الشريف','rent','compound',8500,'SAR',140,2,2,'["أمن","موقف","صيانة"]','[{"url":"https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800","caption":"المجمع"}]','حي العزيزية، المدينة المنورة','المدينة المنورة','العزيزية',24.4686,39.6142,'active',false,'sales@rozoz.sa','+966500000008')
      ON CONFLICT DO NOTHING
    `);
    logger.info("Listings seeded successfully");
  } catch (err) {
    logger.error({ err }, "ensureListings failed — continuing without seed");
  }
}

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

ensureListings().then(() => {
  app.listen(port, (err) => {
    if (err) { logger.error({ err }, "Error listening on port"); process.exit(1); }
    logger.info({ port }, "Real Estate API server listening");
  });
});
