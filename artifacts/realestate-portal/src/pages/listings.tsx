// Redirect to the new search page
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function ListingsBrowser() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation('/search'); }, [setLocation]);
  return null;
}
