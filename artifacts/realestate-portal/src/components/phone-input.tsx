import React, { useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Country {
  iso: string;
  name: string;
  nameAr: string;
  dial: string;
}

const FLAG = (iso: string) =>
  iso.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');

const PRIORITY: Country[] = [
  { iso: 'SA', name: 'Saudi Arabia',        nameAr: 'المملكة العربية السعودية', dial: '+966' },
  { iso: 'AE', name: 'United Arab Emirates',nameAr: 'الإمارات العربية المتحدة',  dial: '+971' },
  { iso: 'KW', name: 'Kuwait',              nameAr: 'الكويت',                    dial: '+965' },
  { iso: 'QA', name: 'Qatar',               nameAr: 'قطر',                       dial: '+974' },
  { iso: 'BH', name: 'Bahrain',             nameAr: 'البحرين',                   dial: '+973' },
  { iso: 'OM', name: 'Oman',                nameAr: 'عُمان',                     dial: '+968' },
  { iso: 'EG', name: 'Egypt',               nameAr: 'مصر',                       dial: '+20'  },
  { iso: 'JO', name: 'Jordan',              nameAr: 'الأردن',                    dial: '+962' },
  { iso: 'LB', name: 'Lebanon',             nameAr: 'لبنان',                     dial: '+961' },
  { iso: 'IQ', name: 'Iraq',                nameAr: 'العراق',                    dial: '+964' },
  { iso: 'SY', name: 'Syria',               nameAr: 'سوريا',                     dial: '+963' },
  { iso: 'YE', name: 'Yemen',               nameAr: 'اليمن',                     dial: '+967' },
  { iso: 'LY', name: 'Libya',               nameAr: 'ليبيا',                     dial: '+218' },
  { iso: 'TN', name: 'Tunisia',             nameAr: 'تونس',                      dial: '+216' },
  { iso: 'DZ', name: 'Algeria',             nameAr: 'الجزائر',                   dial: '+213' },
  { iso: 'MA', name: 'Morocco',             nameAr: 'المغرب',                    dial: '+212' },
];

const REST: Country[] = [
  { iso: 'AF', name: 'Afghanistan',         nameAr: 'أفغانستان',                dial: '+93'  },
  { iso: 'AU', name: 'Australia',           nameAr: 'أستراليا',                 dial: '+61'  },
  { iso: 'BD', name: 'Bangladesh',          nameAr: 'بنغلاديش',                 dial: '+880' },
  { iso: 'BE', name: 'Belgium',             nameAr: 'بلجيكا',                   dial: '+32'  },
  { iso: 'BR', name: 'Brazil',              nameAr: 'البرازيل',                  dial: '+55'  },
  { iso: 'CA', name: 'Canada',              nameAr: 'كندا',                     dial: '+1'   },
  { iso: 'CN', name: 'China',               nameAr: 'الصين',                    dial: '+86'  },
  { iso: 'DE', name: 'Germany',             nameAr: 'ألمانيا',                  dial: '+49'  },
  { iso: 'ET', name: 'Ethiopia',            nameAr: 'إثيوبيا',                  dial: '+251' },
  { iso: 'FR', name: 'France',              nameAr: 'فرنسا',                    dial: '+33'  },
  { iso: 'GB', name: 'United Kingdom',      nameAr: 'المملكة المتحدة',           dial: '+44'  },
  { iso: 'GH', name: 'Ghana',               nameAr: 'غانا',                     dial: '+233' },
  { iso: 'ID', name: 'Indonesia',           nameAr: 'إندونيسيا',                dial: '+62'  },
  { iso: 'IN', name: 'India',               nameAr: 'الهند',                    dial: '+91'  },
  { iso: 'IR', name: 'Iran',                nameAr: 'إيران',                    dial: '+98'  },
  { iso: 'IT', name: 'Italy',               nameAr: 'إيطاليا',                  dial: '+39'  },
  { iso: 'JP', name: 'Japan',               nameAr: 'اليابان',                  dial: '+81'  },
  { iso: 'KE', name: 'Kenya',               nameAr: 'كينيا',                    dial: '+254' },
  { iso: 'KR', name: 'South Korea',         nameAr: 'كوريا الجنوبية',           dial: '+82'  },
  { iso: 'MX', name: 'Mexico',              nameAr: 'المكسيك',                  dial: '+52'  },
  { iso: 'MY', name: 'Malaysia',            nameAr: 'ماليزيا',                  dial: '+60'  },
  { iso: 'NG', name: 'Nigeria',             nameAr: 'نيجيريا',                  dial: '+234' },
  { iso: 'NL', name: 'Netherlands',         nameAr: 'هولندا',                   dial: '+31'  },
  { iso: 'NP', name: 'Nepal',               nameAr: 'نيبال',                    dial: '+977' },
  { iso: 'PH', name: 'Philippines',         nameAr: 'الفلبين',                  dial: '+63'  },
  { iso: 'PK', name: 'Pakistan',            nameAr: 'باكستان',                  dial: '+92'  },
  { iso: 'RU', name: 'Russia',              nameAr: 'روسيا',                    dial: '+7'   },
  { iso: 'SD', name: 'Sudan',               nameAr: 'السودان',                  dial: '+249' },
  { iso: 'SG', name: 'Singapore',           nameAr: 'سنغافورة',                 dial: '+65'  },
  { iso: 'SO', name: 'Somalia',             nameAr: 'الصومال',                  dial: '+252' },
  { iso: 'SS', name: 'South Sudan',         nameAr: 'جنوب السودان',             dial: '+211' },
  { iso: 'TH', name: 'Thailand',            nameAr: 'تايلاند',                  dial: '+66'  },
  { iso: 'TR', name: 'Turkey',              nameAr: 'تركيا',                    dial: '+90'  },
  { iso: 'TZ', name: 'Tanzania',            nameAr: 'تنزانيا',                  dial: '+255' },
  { iso: 'UA', name: 'Ukraine',             nameAr: 'أوكرانيا',                 dial: '+380' },
  { iso: 'US', name: 'United States',       nameAr: 'الولايات المتحدة',          dial: '+1'   },
  { iso: 'UZ', name: 'Uzbekistan',          nameAr: 'أوزبكستان',               dial: '+998' },
  { iso: 'ZA', name: 'South Africa',        nameAr: 'جنوب أفريقيا',             dial: '+27'  },
].sort((a, b) => a.name.localeCompare(b.name));

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  isRtl?: boolean;
  required?: boolean;
  className?: string;
}

export function PhoneInputWithCountry({ value, onChange, isRtl = false, required, className }: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<Country>(PRIORITY[0]);
  const [localNumber, setLocalNumber] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setOpen(false);
    const combined = localNumber ? `${c.dial}${localNumber}` : '';
    onChange(combined);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s\-()]/g, '');
    setLocalNumber(raw);
    onChange(raw ? `${country.dial}${raw}` : '');
  };

  const displayName = isRtl ? country.nameAr : country.name;

  return (
    <div className={cn('flex items-stretch gap-0', className)} dir="ltr">
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
              'bg-muted/50 hover:bg-muted text-sm font-medium shrink-0',
              'focus:z-10'
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
          placeholder={isRtl ? 'رقم الهاتف' : 'Phone number'}
          title={isRtl ? 'أدخل رقم هاتفك بدون رمز الدولة' : 'Enter your number without country code'}
          className="rounded-s-none h-10 focus:z-10"
          aria-label={isRtl ? `رقم الهاتف مع ${displayName}` : `Phone number for ${displayName}`}
        />
        {/* Hidden input carries the full value for native form validation */}
        <input
          type="hidden"
          name="phone"
          value={value}
          required={required}
        />
      </div>
    </div>
  );
}
