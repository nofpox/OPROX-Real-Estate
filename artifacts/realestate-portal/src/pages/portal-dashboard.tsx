import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { usePortalAuth } from '@/lib/portal-auth';
import {
  useGetPortalProperties,
  useGetPortalBookings,
  useGetPortalFinancials,
  useGetPortalPropertyUnits,
  useCreatePortalProperty,
  useUpdatePortalProperty,
  useDeletePortalProperty,
  useCreatePortalUnit,
  useUpdatePortalUnit,
  useDeletePortalUnit,
  getGetPortalPropertiesQueryKey,
  getGetPortalPropertyUnitsQueryKey,
} from '@workspace/api-client-react';
import type {
  PortalProperty,
  PortalUnit,
  PortalPropertyInput,
  PortalUnitInput,
} from '@workspace/api-client-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  LogOut, Building, Calendar, Percent, ArrowRight, ArrowLeft,
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  Plus, Pencil, Trash2, Home, ChevronRight, Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const fmtSAR = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

const PROPERTY_TYPES = ['hotel', 'compound', 'apartment', 'villa', 'office', 'commercial', 'warehouse'];
const PROPERTY_STATUSES = ['active', 'inactive'];
const UNIT_TYPES = ['studio', '1br', '2br', '3br', '4br', 'penthouse', 'duplex', 'apartment', 'villa', 'office', 'commercial'];
const UNIT_STATUSES = ['available', 'occupied', 'maintenance'];

// ── Property Form ──────────────────────────────────────────────────────────────
interface PropFormState {
  name: string;
  type: string;
  address: string;
  city: string;
  country: string;
  description: string;
  status: string;
}

const emptyPropForm = (): PropFormState => ({
  name: '', type: 'apartment', address: '', city: '', country: 'SA',
  description: '', status: 'active',
});

// ── Unit Form ──────────────────────────────────────────────────────────────────
interface UnitFormState {
  unitNumber: string;
  floor: string;
  type: string;
  area: string;
  bedroomCount: string;
  bathroomCount: string;
  status: string;
  monthlyRent: string;
  notes: string;
}

const emptyUnitForm = (): UnitFormState => ({
  unitNumber: '', floor: '', type: 'apartment', area: '',
  bedroomCount: '0', bathroomCount: '1', status: 'available',
  monthlyRent: '', notes: '',
});

// ── Units sub-panel ────────────────────────────────────────────────────────────
interface UnitsPanelProps {
  property: PortalProperty;
  onBack: () => void;
  t: (k: string) => string;
  isRtl: boolean;
}

const UnitsPanel: React.FC<UnitsPanelProps> = ({ property, onBack, t, isRtl }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]       = useState(false);
  const [editUnit, setEditUnit]       = useState<PortalUnit | null>(null);
  const [deleteId, setDeleteId]       = useState<number | null>(null);
  const [form, setForm]               = useState<UnitFormState>(emptyUnitForm());

  const { data: unitsRes, isLoading } = useGetPortalPropertyUnits(
    property.id,
    { page: 1, limit: 100 },
    { query: { enabled: true } } as any,
  );
  const units = (unitsRes as any)?.data ?? [];

  const createMut = useCreatePortalUnit();
  const updateMut = useUpdatePortalUnit();
  const deleteMut = useDeletePortalUnit();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetPortalPropertyUnitsQueryKey(property.id) as any });
    queryClient.invalidateQueries({ queryKey: getGetPortalPropertiesQueryKey() as any });
  };

  const openAdd = () => { setForm(emptyUnitForm()); setEditUnit(null); setShowForm(true); };
  const openEdit = (u: PortalUnit) => {
    setForm({
      unitNumber:   u.unitNumber,
      floor:        u.floor != null ? String(u.floor) : '',
      type:         u.type,
      area:         u.area != null ? String(u.area) : '',
      bedroomCount: String(u.bedroomCount ?? 0),
      bathroomCount:String(u.bathroomCount ?? 1),
      status:       u.status,
      monthlyRent:  u.monthlyRent != null ? String(u.monthlyRent) : '',
      notes:        u.notes ?? '',
    });
    setEditUnit(u);
    setShowForm(true);
  };

  const buildPayload = (): PortalUnitInput => ({
    portalPropertyId: property.id,
    unitNumber:   form.unitNumber.trim(),
    floor:        form.floor ? parseInt(form.floor) : undefined,
    type:         form.type,
    area:         form.area ? parseFloat(form.area) : undefined,
    bedroomCount: parseInt(form.bedroomCount) || 0,
    bathroomCount:parseInt(form.bathroomCount) || 1,
    status:       form.status,
    monthlyRent:  form.monthlyRent ? parseFloat(form.monthlyRent) : undefined,
    notes:        form.notes.trim() || undefined,
    tenantId:     1,
  } as any);

  const handleSave = () => {
    if (!form.unitNumber.trim()) return;
    const payload = buildPayload();
    if (editUnit) {
      updateMut.mutate({ id: editUnit.id, data: payload } as any, {
        onSuccess: () => { invalidate(); setShowForm(false); },
      });
    } else {
      createMut.mutate({ data: payload }, {
        onSuccess: () => { invalidate(); setShowForm(false); },
      });
    }
  };

  const handleDelete = () => {
    if (deleteId == null) return;
    deleteMut.mutate({ id: deleteId } as any, {
      onSuccess: () => { invalidate(); setDeleteId(null); },
    });
  };

  const isBusy = createMut.isPending || updateMut.isPending;

  const statusColor = (s: string) =>
    s === 'available' ? 'default' : s === 'occupied' ? 'secondary' : 'outline';

  const unitTypeLabel = (type: string) => {
    const key = `portal.type.${type}`;
    const tr = t(key);
    return tr !== key ? tr : type;
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-1 text-muted-foreground">
          {isRtl ? <ChevronRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {t('portal.backToProperties')}
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold text-primary">{property.name}</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-primary">{t('portal.units')}</h3>
        <Button onClick={openAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('portal.addUnit')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : units.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed border-2">
          <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t('portal.noUnits')}</p>
          <Button onClick={openAdd} variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            {t('portal.addUnit')}
          </Button>
        </Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitNumber')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitType')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitArea')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitBedrooms')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitBathrooms')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitStatus')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitRent')}</th>
                  <th className="px-4 py-3 font-medium text-end">{t('portal.col.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {units.map((u: PortalUnit) => (
                  <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-primary">{u.unitNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{unitTypeLabel(u.type)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.area != null ? `${u.area} م²` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">{u.bedroomCount ?? 0}</td>
                    <td className="px-4 py-3 text-center">{u.bathroomCount ?? 1}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColor(u.status)}>
                        {t(`portal.status.${u.status}`) !== `portal.status.${u.status}` ? t(`portal.status.${u.status}`) : u.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.monthlyRent != null ? fmtSAR(u.monthlyRent) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-2 justify-end`}>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openEdit(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit Unit Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editUnit ? t('portal.editUnit') : t('portal.addUnit')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.unitNumber')} *</Label>
              <Input value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} placeholder="A-101" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitType')}</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {t(`portal.type.${tp}`) !== `portal.type.${tp}` ? t(`portal.type.${tp}`) : tp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitStatus')}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`portal.status.${s}`) !== `portal.status.${s}` ? t(`portal.status.${s}`) : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitFloor')}</Label>
              <Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitArea')}</Label>
              <Input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="75" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitBedrooms')}</Label>
              <Input type="number" min="0" value={form.bedroomCount} onChange={(e) => setForm({ ...form, bedroomCount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitBathrooms')}</Label>
              <Input type="number" min="1" value={form.bathroomCount} onChange={(e) => setForm({ ...form, bathroomCount: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.unitRent')}</Label>
              <Input type="number" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} placeholder="3500" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.unitNotes')}</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('portal.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form.unitNumber.trim() || isBusy}>
              {isBusy ? t('portal.saving') : t('portal.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Unit Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('portal.deleteUnit')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('portal.confirmDeleteUnit')}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t('portal.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? t('portal.deleting') : t('portal.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export const PortalDashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = usePortalAuth();
  const [, setLocation] = useLocation();
  const { t, isRtl, language } = useLanguage();
  const queryClient = useQueryClient();

  const [propertyIdFilter, setPropertyIdFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter]         = useState<string>('all');
  const [months, setMonths]                     = useState<string>('6');

  // Property management state
  const [selectedProp, setSelectedProp]   = useState<PortalProperty | null>(null);
  const [showPropForm, setShowPropForm]   = useState(false);
  const [editProp, setEditProp]           = useState<PortalProperty | null>(null);
  const [deletePropId, setDeletePropId]   = useState<number | null>(null);
  const [propForm, setPropForm]           = useState<PropFormState>(emptyPropForm());

  useEffect(() => {
    if (!isLoading && !isAuthenticated) setLocation('/portal');
  }, [isLoading, isAuthenticated, setLocation]);

  const { data: propertiesRes, isLoading: isLoadingProps } = useGetPortalProperties(
    { page: 1, limit: 50 },
    { query: { enabled: isAuthenticated } } as any,
  );

  const { data: bookingsRes, isLoading: isLoadingBookings } = useGetPortalBookings(
    {
      page: 1,
      limit: 20,
      ...(propertyIdFilter !== 'all' ? { propertyId: parseInt(propertyIdFilter) } : {}),
      ...(statusFilter !== 'all'     ? { status: statusFilter }                  : {}),
    },
    { query: { enabled: isAuthenticated } } as any,
  );

  const { data: financialsRes, isLoading: isLoadingFin } = useGetPortalFinancials(
    {
      months:     parseInt(months),
      ...(propertyIdFilter !== 'all' ? { propertyId: parseInt(propertyIdFilter) } : {}),
    },
    { query: { enabled: isAuthenticated } } as any,
  );

  const createPropMut = useCreatePortalProperty();
  const updatePropMut = useUpdatePortalProperty();
  const deletePropMut = useDeletePortalProperty();

  const invalidateProps = () =>
    queryClient.invalidateQueries({ queryKey: getGetPortalPropertiesQueryKey() as any });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Skeleton className="h-32 w-32 rounded-full" />
      </div>
    );
  }

  const properties  = (propertiesRes as any)?.data  ?? [];
  const bookings    = (bookingsRes as any)?.data     ?? [];
  const financials  = (financialsRes as any)?.data;

  const totalProperties = properties.length;
  const totalUnits      = properties.reduce((s: number, p: PortalProperty) => s + ((p as any).unitCount ?? 0), 0);

  const handleLogout = async () => { await logout(); setLocation('/portal'); };

  const propTypeLabel = (type: string | undefined): string => {
    if (!type) return '';
    const key = `portal.type.${type.toLowerCase()}`;
    const tr = t(key);
    return tr !== key ? tr : type;
  };

  const statusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      active:      t('portal.status.active'),
      inactive:    t('portal.status.inactive'),
      confirmed:   t('portal.status.confirmed'),
      checked_in:  t('portal.status.checkedIn'),
      checked_out: t('portal.status.checkedOut'),
      cancelled:   t('portal.status.cancelled'),
      pending:     t('portal.status.pending'),
    };
    return statusMap[status] ?? status.replace(/_/g, ' ');
  };

  const lastMonths = (n: string) =>
    isRtl ? `آخر ${n} أشهر` : `Last ${n} months`;

  const fmtMonth = (v: string) => {
    const [y, m] = v.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' });
  };

  const fmtMonthFull = (v: string) =>
    new Date(v + '-01T00:00:00').toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' });

  // ── Property form helpers ──────────────────────────────────────────────────
  const openAddProp = () => {
    setPropForm(emptyPropForm());
    setEditProp(null);
    setShowPropForm(true);
  };

  const openEditProp = (p: PortalProperty) => {
    setPropForm({
      name:        p.name,
      type:        p.type,
      address:     p.address,
      city:        p.city,
      country:     p.country,
      description: (p as any).description ?? '',
      status:      p.status,
    });
    setEditProp(p);
    setShowPropForm(true);
  };

  const handleSaveProp = () => {
    if (!propForm.name.trim() || !propForm.address.trim() || !propForm.city.trim()) return;
    const payload: PortalPropertyInput = {
      name:        propForm.name.trim(),
      type:        propForm.type,
      address:     propForm.address.trim(),
      city:        propForm.city.trim(),
      country:     propForm.country.trim() || 'SA',
      description: propForm.description.trim() || undefined,
      status:      propForm.status,
    } as any;

    if (editProp) {
      updatePropMut.mutate({ id: editProp.id, data: payload } as any, {
        onSuccess: () => { invalidateProps(); setShowPropForm(false); },
      });
    } else {
      createPropMut.mutate({ data: payload }, {
        onSuccess: () => { invalidateProps(); setShowPropForm(false); },
      });
    }
  };

  const handleDeleteProp = () => {
    if (deletePropId == null) return;
    deletePropMut.mutate({ id: deletePropId } as any, {
      onSuccess: () => { invalidateProps(); setDeletePropId(null); },
    });
  };

  const isPropBusy = createPropMut.isPending || updatePropMut.isPending;

  return (
    <div className="min-h-screen bg-muted pb-12">
      <Helmet>
        <title>{isRtl ? 'محفظتي' : 'My Portfolio'} | ركز للحلول الذكية</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 shadow-md">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('portal.myPortfolio')}</h1>
            <p className="text-primary-foreground/70">
              {t('portal.welcome')} {((user as unknown as Record<string,unknown>)?.displayName as string) || ((user as unknown as Record<string,unknown>)?.username as string)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm hover:underline flex items-center gap-1">
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {t('portal.backToWebsite')}
            </Link>
            <Button variant="secondary" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              {t('portal.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 mt-8 space-y-8">

        {/* Top KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-primary/10 p-4 rounded-full">
              <Building className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.totalProperties')}</p>
              <p className="text-3xl font-bold text-primary">{totalProperties}</p>
            </div>
          </Card>
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-secondary/20 p-4 rounded-full">
              <Layers className="h-8 w-8 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.totalUnits')}</p>
              <p className="text-3xl font-bold text-primary">{totalUnits}</p>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="h-10 mb-6">
            <TabsTrigger value="manage"    className="px-6">{t('portal.manage')}</TabsTrigger>
            <TabsTrigger value="overview"  className="px-6">{t('portal.overview')}</TabsTrigger>
            <TabsTrigger value="financials" className="px-6">{t('portal.financials')}</TabsTrigger>
          </TabsList>

          {/* ── My Properties (CRUD) tab ── */}
          <TabsContent value="manage" className="mt-0">
            {selectedProp ? (
              <UnitsPanel
                property={selectedProp}
                onBack={() => setSelectedProp(null)}
                t={t}
                isRtl={isRtl}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-primary">{t('portal.manage')}</h2>
                  <Button onClick={openAddProp} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {t('portal.addProperty')}
                  </Button>
                </div>

                {isLoadingProps ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}
                  </div>
                ) : properties.length === 0 ? (
                  <Card className="p-16 text-center text-muted-foreground border-dashed border-2">
                    <Home className="h-14 w-14 mx-auto mb-4 opacity-30" />
                    <p className="mb-4">{t('portal.noProperties')}</p>
                    <Button onClick={openAddProp} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('portal.addProperty')}
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((prop: PortalProperty) => (
                      <Card key={prop.id} className="p-5 border-border flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-base text-primary leading-tight">{prop.name}</h3>
                          <Badge variant={prop.status === 'active' ? 'default' : 'secondary'}>
                            {statusLabel(prop.status ?? '')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {propTypeLabel(prop.type)}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1 truncate">{prop.address}</p>
                        <p className="text-xs text-muted-foreground mb-3">{prop.city}{prop.country ? `, ${prop.country}` : ''}</p>

                        <div className="mt-auto pt-3 border-t border-border">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-muted-foreground">{t('portal.units')}</span>
                            <span className="font-bold text-primary">
                              {(prop as any).unitCount ?? 0} {t('portal.unitsCount')}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="col-span-1 flex items-center gap-1.5"
                              onClick={() => setSelectedProp(prop)}
                            >
                              <Layers className="h-3.5 w-3.5" />
                              {t('portal.units')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1.5"
                              onClick={() => openEditProp(prop)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t('portal.editProperty')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1.5 text-destructive hover:text-destructive"
                              onClick={() => setDeletePropId(prop.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t('portal.delete')}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Overview tab ── */}
          <TabsContent value="overview" className="space-y-8 mt-0">
            {/* Shared property filter */}
            <div className="flex gap-2 flex-wrap">
              <Select value={propertyIdFilter} onValueChange={setPropertyIdFilter}>
                <SelectTrigger className="w-[180px] bg-card">
                  <SelectValue placeholder={t('portal.allProperties')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('portal.allProperties')}</SelectItem>
                  {properties.map((p: PortalProperty) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Properties overview grid */}
            <section>
              <h2 className="text-xl font-bold text-primary mb-4">{t('portal.managedProperties')}</h2>
              {isLoadingProps ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
                </div>
              ) : properties.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground border-dashed">
                  <p>{t('portal.noProperties')}</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((prop: PortalProperty) => (
                    <Card key={prop.id} className="p-5 border-border flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-base text-primary">{prop.name}</h3>
                        <Badge variant={prop.status === 'active' ? 'default' : 'secondary'}>
                          {statusLabel(prop.status ?? '')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {propTypeLabel(prop.type)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{prop.address}, {prop.city}</p>
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('portal.units')}</span>
                        <span className="font-bold text-primary">{(prop as any).unitCount ?? 0}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Bookings table */}
            <section>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold text-primary">{t('portal.recentBookings')}</h2>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] bg-card">
                    <SelectValue placeholder={t('portal.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('portal.allStatuses')}</SelectItem>
                    <SelectItem value="confirmed">{t('portal.status.confirmed')}</SelectItem>
                    <SelectItem value="checked_in">{t('portal.status.checkedIn')}</SelectItem>
                    <SelectItem value="checked_out">{t('portal.status.checkedOut')}</SelectItem>
                    <SelectItem value="cancelled">{t('portal.status.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card className="border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 font-medium">{t('portal.col.guest')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.property')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.room')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.checkIn')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.checkOut')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoadingBookings ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center">
                            <Skeleton className="h-8 w-1/2 mx-auto" />
                          </td>
                        </tr>
                      ) : bookings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                            {t('portal.noBookings')}
                          </td>
                        </tr>
                      ) : (
                        bookings.map((b: any) => (
                          <tr key={b.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-primary">{b.guestName}</td>
                            <td className="px-6 py-4 text-muted-foreground">{b.propertyName}</td>
                            <td className="px-6 py-4 text-muted-foreground">{b.roomNumber}</td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(b.checkIn + 'T00:00:00').toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(b.checkOut + 'T00:00:00').toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')}
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant={
                                  b.status === 'checked_in'  ? 'default'   :
                                  b.status === 'confirmed'   ? 'secondary' : 'outline'
                                }
                              >
                                {statusLabel(b.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          </TabsContent>

          {/* ── Financials tab ── */}
          <TabsContent value="financials" className="space-y-8 mt-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{t('portal.period')}:</span>
              {['3', '6', '12'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    months === m
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border hover:border-primary text-muted-foreground'
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>

            {isLoadingFin ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-green-100 p-2.5 rounded-full">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.revenue')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{fmtSAR(financials?.totalRevenue ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{lastMonths(months)}</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-red-100 p-2.5 rounded-full">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.expenses')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{fmtSAR(financials?.totalExpenses ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{lastMonths(months)}</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-secondary/20 p-2.5 rounded-full">
                      <TrendingUp className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.netProfit')}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${(financials?.netProfit ?? 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {fmtSAR(financials?.netProfit ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('portal.revenueMinusExpenses')}</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2.5 rounded-full">
                      <BarChart2 className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.margin')}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${(financials?.profitMargin ?? 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {financials?.profitMargin ?? 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('portal.profitMargin')}</p>
                </Card>
              </div>
            )}

            <Card className="p-6 border-border">
              <h3 className="text-lg font-bold text-primary mb-6">{t('portal.monthlyCashFlow')}</h3>
              {isLoadingFin ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (financials?.monthly ?? []).length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  {t('portal.noFinancialData')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={financials?.monthly ?? []} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={fmtMonth} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                    <Tooltip formatter={(value: number, name: string) => [fmtSAR(value), name]} />
                    <Legend />
                    <Bar dataKey="revenue"  name={t('portal.revenue')}  fill="hsl(var(--secondary))"       radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" name={t('portal.expenses')} fill="hsl(var(--destructive)/0.6)" radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="netIncome" name={t('portal.netIncome')} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Card>

            {!isLoadingFin && (financials?.monthly ?? []).length > 0 && (
              <Card className="border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 font-medium">{t('portal.col.month')}</th>
                        <th className="px-6 py-3 font-medium text-right">{t('portal.revenue')}</th>
                        <th className="px-6 py-3 font-medium text-right">{t('portal.expenses')}</th>
                        <th className="px-6 py-3 font-medium text-right">{t('portal.netIncome')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...(financials?.monthly ?? [])].reverse().map((row: any) => (
                        <tr key={row.month} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-3 font-medium text-primary">{fmtMonthFull(row.month)}</td>
                          <td className="px-6 py-3 text-right text-green-700">{fmtSAR(row.revenue)}</td>
                          <td className="px-6 py-3 text-right text-red-600">{fmtSAR(row.expenses)}</td>
                          <td className={`px-6 py-3 text-right font-semibold ${row.netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {fmtSAR(row.netIncome)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Add/Edit Property Dialog ───────────────────────────────────────────── */}
      <Dialog open={showPropForm} onOpenChange={(v) => { if (!v) setShowPropForm(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProp ? t('portal.editProperty') : t('portal.addProperty')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.propertyName')} *</Label>
              <Input
                value={propForm.name}
                onChange={(e) => setPropForm({ ...propForm, name: e.target.value })}
                placeholder={isRtl ? 'برج الرياض' : 'Riyadh Tower'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.propertyType')}</Label>
              <Select value={propForm.type} onValueChange={(v) => setPropForm({ ...propForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {propTypeLabel(tp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.propertyStatus')}</Label>
              <Select value={propForm.status} onValueChange={(v) => setPropForm({ ...propForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.propertyAddress')} *</Label>
              <Input
                value={propForm.address}
                onChange={(e) => setPropForm({ ...propForm, address: e.target.value })}
                placeholder={isRtl ? 'شارع الملك فهد' : 'King Fahd Road'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.propertyCity')} *</Label>
              <Input
                value={propForm.city}
                onChange={(e) => setPropForm({ ...propForm, city: e.target.value })}
                placeholder={isRtl ? 'الرياض' : 'Riyadh'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.propertyCountry')}</Label>
              <Input
                value={propForm.country}
                onChange={(e) => setPropForm({ ...propForm, country: e.target.value })}
                placeholder="SA"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.propertyDescription')}</Label>
              <Textarea
                rows={3}
                value={propForm.description}
                onChange={(e) => setPropForm({ ...propForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPropForm(false)}>{t('portal.cancel')}</Button>
            <Button
              onClick={handleSaveProp}
              disabled={!propForm.name.trim() || !propForm.address.trim() || !propForm.city.trim() || isPropBusy}
            >
              {isPropBusy ? t('portal.saving') : t('portal.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Property Confirm ────────────────────────────────────────────── */}
      <Dialog open={deletePropId !== null} onOpenChange={(v) => { if (!v) setDeletePropId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('portal.deleteProperty')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('portal.confirmDelete')}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletePropId(null)}>{t('portal.cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteProp} disabled={deletePropMut.isPending}>
              {deletePropMut.isPending ? t('portal.deleting') : t('portal.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
