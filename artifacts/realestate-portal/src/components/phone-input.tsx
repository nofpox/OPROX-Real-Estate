import React, { useEffect, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Country {
  iso: string;
  name: string;
  nameAr: string;
  dial: string;
  localMin: number;
  localMax: number;
}

const FLAG = (iso: string) =>
  iso.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Returns an error string if the local number (digits only, no country code) is
 * invalid for the given country, or null if it passes all checks.
 *
 * Checks performed:
 *  1. Digit-length range per country
 *  2. All-same-digit pattern  (e.g. 000000000, 555555555)
 *  3. Majority-same-digit     (≥70% of digits identical — catches 5000000000)
 *  4. Pure ascending/descending sequence (e.g. 123456789, 987654321)
 */
function validateLocal(digits: string, c: Country, isRtl: boolean): string | null {
  if (!digits) return null; // empty field is handled by `required`

  const len = digits.length;

  // 1. Length
  if (len < c.localMin || len > c.localMax) {
    const expected =
      c.localMin === c.localMax ? `${c.localMin}` : `${c.localMin}–${c.localMax}`;
    return isRtl
      ? `يجب أن يتكون رقم ${c.nameAr} من ${expected} أرقام`
      : `${c.name} numbers must be ${expected} digits`;
  }

  // 2. All same digit
  if (/^(\d)\1+$/.test(digits)) {
    return isRtl ? 'رقم الهاتف غير صالح' : 'Invalid phone number';
  }

  // 3. Majority same digit (≥ 70%)
  const freq: Record<string, number> = {};
  for (const d of digits) freq[d] = (freq[d] ?? 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  if (maxFreq / len >= 0.7) {
    return isRtl ? 'رقم الهاتف غير صالح' : 'Invalid phone number';
  }

  // 4. Pure sequential ascending or descending (e.g. 123456789, 987654321)
  const isAscending = digits.split('').every(
    (d, i, arr) => i === 0 || (parseInt(d) - parseInt(arr[i - 1]) + 10) % 10 === 1
  );
  const isDescending = digits.split('').every(
    (d, i, arr) => i === 0 || (parseInt(arr[i - 1]) - parseInt(d) + 10) % 10 === 1
  );
  if (len >= 6 && (isAscending || isDescending)) {
    return isRtl ? 'رقم الهاتف غير صالح' : 'Invalid phone number';
  }

  return null;
}

// ─── Country data ─────────────────────────────────────────────────────────────
// localMin/localMax = expected digit count AFTER the country code (digits only)

const PRIORITY: Country[] = [
  { iso: 'SA', name: 'Saudi Arabia',         nameAr: 'المملكة العربية السعودية', dial: '+966', localMin: 9,  localMax: 9  },
  { iso: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', dial: '+971', localMin: 9,  localMax: 9  },
  { iso: 'KW', name: 'Kuwait',               nameAr: 'الكويت',                   dial: '+965', localMin: 8,  localMax: 8  },
  { iso: 'QA', name: 'Qatar',                nameAr: 'قطر',                      dial: '+974', localMin: 8,  localMax: 8  },
  { iso: 'BH', name: 'Bahrain',              nameAr: 'البحرين',                  dial: '+973', localMin: 8,  localMax: 8  },
  { iso: 'OM', name: 'Oman',                 nameAr: 'عُمان',                    dial: '+968', localMin: 8,  localMax: 8  },
  { iso: 'EG', name: 'Egypt',                nameAr: 'مصر',                      dial: '+20',  localMin: 10, localMax: 10 },
  { iso: 'JO', name: 'Jordan',               nameAr: 'الأردن',                   dial: '+962', localMin: 9,  localMax: 9  },
  { iso: 'LB', name: 'Lebanon',              nameAr: 'لبنان',                    dial: '+961', localMin: 7,  localMax: 8  },
  { iso: 'IQ', name: 'Iraq',                 nameAr: 'العراق',                   dial: '+964', localMin: 10, localMax: 10 },
  { iso: 'SY', name: 'Syria',                nameAr: 'سوريا',                    dial: '+963', localMin: 9,  localMax: 9  },
  { iso: 'YE', name: 'Yemen',                nameAr: 'اليمن',                    dial: '+967', localMin: 9,  localMax: 9  },
  { iso: 'LY', name: 'Libya',                nameAr: 'ليبيا',                    dial: '+218', localMin: 9,  localMax: 9  },
  { iso: 'TN', name: 'Tunisia',              nameAr: 'تونس',                     dial: '+216', localMin: 8,  localMax: 8  },
  { iso: 'DZ', name: 'Algeria',              nameAr: 'الجزائر',                  dial: '+213', localMin: 9,  localMax: 9  },
  { iso: 'MA', name: 'Morocco',              nameAr: 'المغرب',                   dial: '+212', localMin: 9,  localMax: 9  },
];

const REST: Country[] = [
  { iso: 'AF', name: 'Afghanistan',   nameAr: 'أفغانستان',          dial: '+93',  localMin: 9,  localMax: 9  },
  { iso: 'AU', name: 'Australia',     nameAr: 'أستراليا',           dial: '+61',  localMin: 9,  localMax: 9  },
  { iso: 'BD', name: 'Bangladesh',    nameAr: 'بنغلاديش',           dial: '+880', localMin: 10, localMax: 10 },
  { iso: 'BE', name: 'Belgium',       nameAr: 'بلجيكا',             dial: '+32',  localMin: 8,  localMax: 9  },
  { iso: 'BR', name: 'Brazil',        nameAr: 'البرازيل',           dial: '+55',  localMin: 10, localMax: 11 },
  { iso: 'CA', name: 'Canada',        nameAr: 'كندا',               dial: '+1',   localMin: 10, localMax: 10 },
  { iso: 'CN', name: 'China',         nameAr: 'الصين',              dial: '+86',  localMin: 11, localMax: 11 },
  { iso: 'DE', name: 'Germany',       nameAr: 'ألمانيا',            dial: '+49',  localMin: 10, localMax: 11 },
  { iso: 'ET', name: 'Ethiopia',      nameAr: 'إثيوبيا',            dial: '+251', localMin: 9,  localMax: 9  },
  { iso: 'FR', name: 'France',        nameAr: 'فرنسا',              dial: '+33',  localMin: 9,  localMax: 9  },
  { iso: 'GB', name: 'United Kingdom',nameAr: 'المملكة المتحدة',    dial: '+44',  localMin: 10, localMax: 10 },
  { iso: 'GH', name: 'Ghana',         nameAr: 'غانا',               dial: '+233', localMin: 9,  localMax: 9  },
  { iso: 'ID', name: 'Indonesia',     nameAr: 'إندونيسيا',          dial: '+62',  localMin: 9,  localMax: 12 },
  { iso: 'IN', name: 'India',         nameAr: 'الهند',              dial: '+91',  localMin: 10, localMax: 10 },
  { iso: 'IR', name: 'Iran',          nameAr: 'إيران',              dial: '+98',  localMin: 10, localMax: 10 },
  { iso: 'IT', name: 'Italy',         nameAr: 'إيطاليا',            dial: '+39',  localMin: 9,  localMax: 10 },
  { iso: 'JP', name: 'Japan',         nameAr: 'اليابان',            dial: '+81',  localMin: 10, localMax: 11 },
  { iso: 'KE', name: 'Kenya',         nameAr: 'كينيا',              dial: '+254', localMin: 9,  localMax: 9  },
  { iso: 'KR', name: 'South Korea',   nameAr: 'كوريا الجنوبية',    dial: '+82',  localMin: 10, localMax: 11 },
  { iso: 'MX', name: 'Mexico',        nameAr: 'المكسيك',            dial: '+52',  localMin: 10, localMax: 10 },
  { iso: 'MY', name: 'Malaysia',      nameAr: 'ماليزيا',            dial: '+60',  localMin: 9,  localMax: 10 },
  { iso: 'NG', name: 'Nigeria',       nameAr: 'نيجيريا',            dial: '+234', localMin: 10, localMax: 10 },
  { iso: 'NL', name: 'Netherlands',   nameAr: 'هولندا',             dial: '+31',  localMin: 9,  localMax: 9  },
  { iso: 'NP', name: 'Nepal',         nameAr: 'نيبال',              dial: '+977', localMin: 9,  localMax: 10 },
  { iso: 'PH', name: 'Philippines',   nameAr: 'الفلبين',            dial: '+63',  localMin: 10, localMax: 10 },
  { iso: 'PK', name: 'Pakistan',      nameAr: 'باكستان',            dial: '+92',  localMin: 10, localMax: 10 },
  { iso: 'RU', name: 'Russia',        nameAr: 'روسيا',              dial: '+7',   localMin: 10, localMax: 10 },
  { iso: 'SD', name: 'Sudan',         nameAr: 'السودان',            dial: '+249', localMin: 9,  localMax: 9  },
  { iso: 'SG', name: 'Singapore',     nameAr: 'سنغافورة',           dial: '+65',  localMin: 8,  localMax: 8  },
  { iso: 'SO', name: 'Somalia',       nameAr: 'الصومال',            dial: '+252', localMin: 8,  localMax: 9  },
  { iso: 'SS', name: 'South Sudan',   nameAr: 'جنوب السودان',       dial: '+211', localMin: 9,  localMax: 9  },
  { iso: 'TH', name: 'Thailand',      nameAr: 'تايلاند',            dial: '+66',  localMin: 9,  localMax: 9  },
  { iso: 'TR', name: 'Turkey',        nameAr: 'تركيا',              dial: '+90',  localMin: 10, localMax: 10 },
  { iso: 'TZ', name: 'Tanzania',      nameAr: 'تنزانيا',            dial: '+255', localMin: 9,  localMax: 9  },
  { iso: 'UA', name: 'Ukraine',       nameAr: 'أوكرانيا',           dial: '+380', localMin: 9,  localMax: 9  },
  { iso: 'US', name: 'United States', nameAr: 'الولايات المتحدة',   dial: '+1',   localMin: 10, localMax: 10 },
  { iso: 'UZ', name: 'Uzbekistan',    nameAr: 'أوزبكستان',          dial: '+998', localMin: 9,  localMax: 9  },
  { iso: 'ZA', name: 'South Africa',  nameAr: 'جنوب أفريقيا',       dial: '+27',  localMin: 9,  localMax: 9  },
].sort((a, b) => a.name.localeCompare(b.name));

// ─── Component ────────────────────────────────────────────────────────────────

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  isRtl?: boolean;
  required?: boolean;
  className?: string;
}

export function PhoneInputWithCountry({
  value, onChange, isRtl = false, required, className
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<Country>(PRIORITY[0]);
  const [localNumber, setLocalNumber] = useState('');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Digits-only version of what the user typed (for validation)
  const digits = localNumber.replace(/\D/g, '');

  // Run validation; only show error after the field has been touched
  const errorMsg = touched ? validateLocal(digits, country, isRtl) : null;

  // Keep native form validity in sync so the browser blocks submit when invalid
  useEffect(() => {
    if (!inputRef.current) return;
    const err = digits ? (validateLocal(digits, country, isRtl) ?? '') : '';
    inputRef.current.setCustomValidity(err);
  }, [digits, country, isRtl]);

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setOpen(false);
    const combined = localNumber ? `${c.dial}${localNumber}` : '';
    onChange(combined);
    // Re-validate on country change if already touched
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s\-()]/g, '');
    setLocalNumber(raw);
    onChange(raw ? `${country.dial}${raw}` : '');
  };

  const handleBlur = () => setTouched(true);

  const displayName = isRtl ? country.nameAr : country.name;
  const isInvalid = !!errorMsg;

  const expectedDigits =
    country.localMin === country.localMax
      ? `${country.localMin}`
      : `${country.localMin}–${country.localMax}`;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-stretch gap-0" dir="ltr">
        {/* Country selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label={isRtl ? 'اختر الدولة' : 'Select country'}
              className={cn(
                'flex items-center gap-1.5 h-10 px-3 rounded-e-none border-e-0',
                'bg-muted/50 hover:bg-muted text-sm font-medium shrink-0 focus:z-10',
                isInvalid && 'border-red-400 dark:border-red-500'
              )}
            >
              <span className="text-lg leading-none">{FLAG(country.iso)}</span>
              <span className="text-muted-foreground tabular-nums">{country.dial}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput
                placeholder={isRtl ? 'ابحث عن دولة...' : 'Search country...'}
                className="h-9"
              />
              <CommandList className="max-h-64">
                <CommandEmpty>{isRtl ? 'لا توجد نتائج' : 'No results found'}</CommandEmpty>

                <CommandGroup heading={isRtl ? 'الأكثر استخداماً' : 'Most used'}>
                  {PRIORITY.map(c => (
                    <CommandItem
                      key={c.iso}
                      value={`${c.name} ${c.nameAr} ${c.dial}`}
                      onSelect={() => handleCountrySelect(c)}
                      className="flex items-center gap-2.5 cursor-pointer"
                    >
                      <span className="text-base">{FLAG(c.iso)}</span>
                      <span className="flex-1 text-sm">{isRtl ? c.nameAr : c.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{c.dial}</span>
                      {country.iso === c.iso && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading={isRtl ? 'دول أخرى' : 'Other countries'}>
                  {REST.map(c => (
                    <CommandItem
                      key={c.iso}
                      value={`${c.name} ${c.nameAr} ${c.dial}`}
                      onSelect={() => handleCountrySelect(c)}
                      className="flex items-center gap-2.5 cursor-pointer"
                    >
                      <span className="text-base">{FLAG(c.iso)}</span>
                      <span className="flex-1 text-sm">{isRtl ? c.nameAr : c.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{c.dial}</span>
                      {country.iso === c.iso && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Number input */}
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="tel"
            inputMode="tel"
            required={required}
            value={localNumber}
            onChange={handleNumberChange}
            onBlur={handleBlur}
            placeholder={
              isRtl
                ? `${expectedDigits} أرقام`
                : `${expectedDigits} digits`
            }
            title={
              isRtl
                ? `أدخل رقم هاتفك بدون رمز الدولة (${expectedDigits} أرقام)`
                : `Enter your number without country code (${expectedDigits} digits)`
            }
            aria-label={isRtl ? `رقم الهاتف مع ${displayName}` : `Phone number for ${displayName}`}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? 'phone-error' : undefined}
            className={cn(
              'rounded-s-none h-10 focus:z-10',
              isInvalid && 'border-red-400 dark:border-red-500 focus-visible:ring-red-400/30'
            )}
          />
          {/* Hidden input carries the full value for native form validation */}
          <input type="hidden" name="phone" value={value} required={required} />
        </div>
      </div>

      {/* Inline error */}
      {isInvalid && (
        <p
          id="phone-error"
          className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 ps-1"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {errorMsg}
        </p>
      )}
    </div>
  );
}
