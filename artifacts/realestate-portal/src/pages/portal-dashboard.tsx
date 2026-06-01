import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { usePortalAuth } from '@/lib/portal-auth';
import { useGetPortalProperties, useGetPortalBookings } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, Building, Calendar, Percent, ArrowRight, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const PortalDashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = usePortalAuth();
  const [location, setLocation] = useLocation();
  const { t, isRtl } = useLanguage();

  const [page] = useState(1);
  const [propertyIdFilter, setPropertyIdFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/portal');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const { data: propertiesRes, isLoading: isLoadingProps } = useGetPortalProperties({
    params: { page: 1, limit: 50 },
    query: { enabled: isAuthenticated }
  });

  const { data: bookingsRes, isLoading: isLoadingBookings } = useGetPortalBookings({
    params: {
      page: 1,
      limit: 10,
      ...(propertyIdFilter !== 'all' ? { propertyId: parseInt(propertyIdFilter) } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter as any } : {})
    },
    query: { enabled: isAuthenticated }
  });

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-muted"><Skeleton className="h-32 w-32 rounded-full" /></div>;
  }

  const properties = propertiesRes?.data || [];
  const bookings = bookingsRes?.data || [];

  const totalProperties = properties.length;
  const totalBookings = properties.reduce((sum, p) => sum + (p.activeBookings || 0), 0);
  const avgOccupancy = totalProperties > 0 
    ? Math.round(properties.reduce((sum, p) => sum + (p.occupancyRate || 0), 0) / totalProperties)
    : 0;

  const handleLogout = async () => {
    await logout();
    setLocation('/portal');
  };

  return (
    <div className="min-h-screen bg-muted pb-12">
      {/* Top bar */}
      <header className="bg-primary text-primary-foreground py-6 shadow-md">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('portal.myPortfolio') || 'My Portfolio'}</h1>
            <p className="text-primary-foreground/70">{t('portal.welcome') || 'Welcome back,'} {user?.displayName || user?.username}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm hover:underline flex items-center gap-1">
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {t('portal.backToWebsite') || 'Website'}
            </Link>
            <Button variant="secondary" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              {t('portal.logout') || 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 mt-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-primary/10 p-4 rounded-full">
              <Building className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.totalProperties') || 'Total Properties'}</p>
              <p className="text-3xl font-bold text-primary">{totalProperties}</p>
            </div>
          </Card>
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-secondary/20 p-4 rounded-full">
              <Calendar className="h-8 w-8 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.activeBookings') || 'Active Bookings'}</p>
              <p className="text-3xl font-bold text-primary">{totalBookings}</p>
            </div>
          </Card>
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-green-100 p-4 rounded-full">
              <Percent className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.avgOccupancy') || 'Avg. Occupancy'}</p>
              <p className="text-3xl font-bold text-primary">{avgOccupancy}%</p>
            </div>
          </Card>
        </div>

        {/* Properties Section */}
        <section>
          <h2 className="text-xl font-bold text-primary mb-4">{t('portal.managedProperties') || 'Managed Properties'}</h2>
          {isLoadingProps ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map(prop => (
                <Card key={prop.id} className="p-6 border-border flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-primary">{prop.name}</h3>
                    <Badge variant={prop.status === 'active' ? 'default' : 'secondary'}>
                      {prop.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-4 space-y-1">
                    <p>{prop.type} • {prop.totalRooms} rooms</p>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-border">
                    <div className="flex justify-between text-sm mb-2">
                      <span>{t('portal.occupancy') || 'Occupancy'}</span>
                      <span className="font-medium">{prop.occupancyRate || 0}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mb-4">
                      <div className="bg-secondary h-2 rounded-full" style={{ width: `${prop.occupancyRate || 0}%` }} />
                    </div>
                    
                    {prop.linkedListingId && (
                      <Button asChild variant="outline" className="w-full justify-between">
                        <Link href={`/listings/${prop.linkedListingId}`}>
                          {t('portal.viewListing') || 'View Listing'}
                          {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                        </Link>
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Bookings Section */}
        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-xl font-bold text-primary">{t('portal.recentBookings') || 'Recent Bookings'}</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={propertyIdFilter} onValueChange={setPropertyIdFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Guest</th>
                    <th className="px-6 py-3 font-medium">Property</th>
                    <th className="px-6 py-3 font-medium">Room</th>
                    <th className="px-6 py-3 font-medium">Check In</th>
                    <th className="px-6 py-3 font-medium">Check Out</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingBookings ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center"><Skeleton className="h-8 w-1/2 mx-auto" /></td>
                    </tr>
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No bookings found.</td>
                    </tr>
                  ) : (
                    bookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-primary">{booking.guestName}</td>
                        <td className="px-6 py-4 text-muted-foreground">{booking.propertyName}</td>
                        <td className="px-6 py-4 text-muted-foreground">{booking.roomNumber}</td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(booking.checkIn).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(booking.checkOut).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <Badge variant={booking.status === 'checked_in' ? 'default' : booking.status === 'confirmed' ? 'secondary' : 'outline'}>
                            {booking.status.replace('_', ' ')}
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

      </div>
    </div>
  );
};
