import { useEffect } from 'react';
import { useLocation } from 'wouter';

export const Join: React.FC = () => {
  const [, navigate] = useLocation();
  useEffect(() => { navigate('/listings'); }, [navigate]);
  return null;
};
