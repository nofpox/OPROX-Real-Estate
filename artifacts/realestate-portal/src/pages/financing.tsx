import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Calculator, DollarSign, TrendingUp, Building2, ChevronDown } from 'lucide-react';

// ── Murabaha / Ijara calculator ───────────────────────────────────────────────

function calcMurabaha(principal: number, annualRate: number, years: number) {
  const monthly = annualRate / 100 / 12;
  const n = years * 12;
  if (monthly === 0) return { monthlyPayment: principal / n, totalCost: principal, bankProfit: 0 };
  const monthly_payment = principal * monthly * Math.pow(1 + monthly, n) / (Math.pow(1 + monthly, n) - 1);
  const totalCost = monthly_payment * n;
  return { monthlyPayment: monthly_payment, totalCost, bankProfit: totalCost - principal };
}

// ── Banks data ─────────────────────────────────────────────────────────────────
const BANKS = [
  { nameAr: 'بنك الراجحي', nameEn: 'Al Rajhi Bank', rate: 3.5, maxYears: 30, minDown: 15 },
  { nameAr: 'البنك الأهلي', nameEn: 'Saudi National Bank', rate: 3.75, maxYears: 25, minDown: 20 },
  { nameAr: 'بنك الرياض', nameEn: 'Riyad Bank', rate: 4.0, maxYears: 25, minDown: 20 },
  { nameAr: 'البنك العربي', nameEn: 'Arab National Bank', rate: 4.25, maxYears: 20, minDown: 25 },
  { nameAr: 'بنك البلاد', nameEn: 'Bank AlBilad', rate: 3.9, maxYears: 25, minDown: 20 },
];

function formatSAR(n: number, isRtl: boolean) {
  return `${Math.round(n).toLocaleString()} ${isRtl ? 'ر.س' : 'SAR'}`;
}

export function Financing() {
  const { t, isRtl } = useLanguage();

  const [propPrice, setPropPrice] = useState(1500000);
  const [downPct, setDownPct] = useState(20);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(3.75);

  const downAmount = propPrice * (downPct / 100);
  const loanAmount = propPrice - downAmount;
  const { monthlyPayment, totalCost, bankProfit } = calcMurabaha(loanAmount, rate, years);

  // Affordability
  const [income, setIncome] = useState(20000);
  const affordableMonthly = income * 0.33;
  const affordableTotal = affordableMonthly * years * 12 * (1 - 0.15) + downAmount;

  const ResultCard = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
    <div className={`rounded-xl p-4 border ${highlight ? 'bg-[#0f2040] border-[#0f2040] text-white' : 'bg-gray-50 border-gray-100'}`}>
      <div className={`text-xs mb-1 ${highlight ? 'text-white/70' : 'text-gray-500'}`}>{label}</div>
      <div className={`text-xl font-bold ${highlight ? 'text-[#c9a84c]' : 'text-[#0f2040]'}`}>{value}</div>
    </div>
  );

  return (
    <div className="font-sans">
      {/* Header */}
      <div className="bg-[#0f2040] py-12 text-center">
        <Calculator className="w-10 h-10 text-[#c9a84c] mx-auto mb-3" />
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('financing.title')}</h1>
        <p className="text-white/70 text-sm max-w-md mx-auto">{t('financing.subtitle')}</p>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-10">
          {/* ── Calculator inputs ──────────────────────────────────────────── */}
          <div>
            <h2 className="text-xl font-bold text-[#0f2040] mb-6">{isRtl ? 'حاسبة التمويل' : 'Financing Calculator'}</h2>

            {/* Property price */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('financing.propPrice')}: <span className="text-[#c9a84c] font-bold">{propPrice.toLocaleString()}</span></label>
              <input type="range" min={200000} max={10000000} step={50000} value={propPrice} onChange={e => setPropPrice(Number(e.target.value))} className="w-full accent-[#c9a84c]" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>200K</span><span>10M</span></div>
            </div>

            {/* Down payment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('financing.downPayment')}: <span className="text-[#c9a84c] font-bold">{downPct}% ({formatSAR(downAmount, isRtl)})</span></label>
              <input type="range" min={10} max={50} step={5} value={downPct} onChange={e => setDownPct(Number(e.target.value))} className="w-full accent-[#c9a84c]" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>10%</span><span>50%</span></div>
            </div>

            {/* Years */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('financing.years')}: <span className="text-[#c9a84c] font-bold">{t('financing.years.label', { n: years })}</span></label>
              <input type="range" min={5} max={30} step={5} value={years} onChange={e => setYears(Number(e.target.value))} className="w-full accent-[#c9a84c]" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5</span><span>30</span></div>
            </div>

            {/* Rate */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('financing.rate')}: <span className="text-[#c9a84c] font-bold">{rate}%</span></label>
              <input type="range" min={2} max={8} step={0.25} value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full accent-[#c9a84c]" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>2%</span><span>8%</span></div>
            </div>

            {/* Custom inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{isRtl ? 'سعر دقيق' : 'Exact Price'}</label>
                <input type="number" value={propPrice} onChange={e => setPropPrice(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{isRtl ? 'نسبة الربح' : 'Profit Rate'}</label>
                <input type="number" step="0.25" value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c]" />
              </div>
            </div>
          </div>

          {/* ── Results ────────────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xl font-bold text-[#0f2040] mb-6">{isRtl ? 'نتائج التمويل' : 'Financing Results'}</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <ResultCard label={t('financing.monthlyPayment')} value={formatSAR(monthlyPayment, isRtl)} highlight />
              <ResultCard label={t('financing.loanAmt')} value={formatSAR(loanAmount, isRtl)} />
              <ResultCard label={t('financing.totalCost')} value={formatSAR(totalCost, isRtl)} />
              <ResultCard label={t('financing.bankProfit')} value={formatSAR(bankProfit, isRtl)} />
              <ResultCard label={t('financing.downAmt')} value={formatSAR(downAmount, isRtl)} />
              <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
                <div className="text-xs text-gray-500 mb-2">{isRtl ? 'توزيع التمويل' : 'Split'}</div>
                <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-[#c9a84c] rounded-full" style={{ width: `${downPct}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-[#c9a84c] font-semibold">{downPct}% {isRtl ? 'دفعة أولى' : 'Down'}</span>
                  <span className="text-gray-500">{100 - downPct}% {isRtl ? 'تمويل' : 'Financed'}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-6">{t('financing.disclaimer')}</p>

            {/* Affordability section */}
            <div className="bg-[#0f2040]/5 border border-[#c9a84c]/20 rounded-xl p-5">
              <h3 className="font-bold text-[#0f2040] mb-3">{t('financing.affordTitle')}</h3>
              <p className="text-sm text-gray-500 mb-4">{t('financing.affordSubtitle')}</p>
              <div className="flex gap-3 mb-4">
                <input type="number" value={income} onChange={e => setIncome(Number(e.target.value))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c]" placeholder={t('financing.monthlyIncome')} />
              </div>
              <div className="bg-white rounded-lg p-3 border border-[#c9a84c]/20">
                <div className="text-xs text-gray-500 mb-1">{t('financing.affordResult', { amt: Math.round(affordableTotal).toLocaleString() })}</div>
                <div className="text-lg font-bold text-[#0f2040]">{formatSAR(affordableTotal, isRtl)}</div>
                <div className="text-xs text-gray-400 mt-1">{isRtl ? 'بناءً على 33% من الدخل الشهري' : 'Based on 33% of monthly income'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Banks comparison ──────────────────────────────────────────────── */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-[#0f2040] mb-6">{t('financing.banks.title')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <thead>
                <tr className="bg-[#0f2040] text-white">
                  {[isRtl ? 'البنك' : 'Bank', isRtl ? 'نسبة الربح' : 'Rate', isRtl ? 'القسط الشهري' : 'Monthly', isRtl ? 'الحد الأقصى للسنوات' : 'Max Years', isRtl ? 'الدفعة الأولى' : 'Min Down'].map(h => (
                    <th key={h} className="px-4 py-3 text-sm font-semibold text-start">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BANKS.map((bank, i) => {
                  const { monthlyPayment: mp } = calcMurabaha(loanAmount, bank.rate, Math.min(years, bank.maxYears));
                  return (
                    <tr key={bank.nameEn} className={`border-t border-gray-50 ${i === 0 ? 'bg-[#c9a84c]/5' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-[#0f2040]">{isRtl ? bank.nameAr : bank.nameEn}</div>
                        {i === 0 && <div className="text-xs text-[#c9a84c] font-semibold">{isRtl ? 'الأفضل' : 'Best Rate'}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-[#c9a84c]">{bank.rate}%</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#0f2040]">{formatSAR(mp, isRtl)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{bank.maxYears} {isRtl ? 'سنة' : 'yrs'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{bank.minDown}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
