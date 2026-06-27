import { useEffect } from 'react';
import { useLocation } from 'wouter';
export function ServiceDetail() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation('/'); }, [setLocation]);
  return null;
}
