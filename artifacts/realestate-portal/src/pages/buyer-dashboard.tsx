import { useEffect } from 'react';
import { useLocation } from 'wouter';

export const BuyerDashboard: React.FC = () => {
  const [, navigate] = useLocation();
  useEffect(() => { navigate('/portal'); }, [navigate]);
  return null;
};
