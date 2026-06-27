// Redirect to home — services are replaced by the new nav structure
import { useEffect } from 'react';
import { useLocation } from 'wouter';
export function Services() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation('/'); }, [setLocation]);
  return null;
}
