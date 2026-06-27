// Redirect old /listings/:id to new /property/:id
import { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';

export function ListingDetail() {
  const [, params] = useRoute('/listings/:id');
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (params?.id) setLocation(`/property/${params.id}`);
    else setLocation('/search');
  }, [params, setLocation]);
  return null;
}
