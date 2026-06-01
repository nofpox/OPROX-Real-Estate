import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { usePortalAuth } from '@/lib/portal-auth';
import { useLanguage } from '@/lib/i18n';
import { Building, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export const PortalLogin: React.FC = () => {
  const { login, isAuthenticated, isLoading } = usePortalAuth();
  const [location, setLocation] = useLocation();
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');

  if (isAuthenticated) {
    setLocation('/portal/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password, tenantSlug });
      setLocation('/portal/dashboard');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('portal.loginErrorTitle') || 'Login Failed',
        description: t('portal.loginErrorDesc') || 'Invalid credentials or organization ID.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <Building className="h-10 w-10 text-secondary" />
            <span className="font-bold text-3xl tracking-tight text-primary">ركز | Rakez</span>
          </Link>
          <h2 className="mt-2 text-3xl font-extrabold text-primary">
            {t('portal.loginTitle') || 'Client Portal Login'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('portal.loginSubtitle') || 'Access your managed properties and reports'}
          </p>
        </div>

        <div className="bg-card py-8 px-6 shadow rounded-lg sm:px-10 border border-border">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-primary">
                {t('portal.organizationId') || 'Organization ID'}
              </label>
              <div className="mt-1">
                <Input
                  required
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder={t('portal.organizationIdPlaceholder') || 'e.g. your-company'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary">
                {t('portal.username') || 'Username'}
              </label>
              <div className="mt-1">
                <Input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary">
                {t('portal.password') || 'Password'}
              </label>
              <div className="mt-1">
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (t('portal.loggingIn') || 'Signing in...') : (t('portal.loginButton') || 'Sign in')}
            </Button>
          </form>
        </div>
        
        <div className="text-center mt-4">
          <Link href="/" className="text-sm font-medium text-secondary hover:text-secondary/80 inline-flex items-center gap-1">
            {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {t('portal.backToWebsite') || 'Back to website'}
          </Link>
        </div>
      </div>
    </div>
  );
};
