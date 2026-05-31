import { ShieldX, Phone, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuspendedPageProps {
  onSignOut: () => void;
}

export default function SuspendedPage({ onSignOut }: SuspendedPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md text-center space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <ShieldX className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your company's account has been temporarily suspended.
            All users under this account are currently unable to access the system.
          </p>
        </div>

        {/* Callout box */}
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-5 text-left space-y-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            To restore access, please contact support:
          </p>
          <div className="space-y-2">
            <a
              href="mailto:support@grandpms.io"
              className="flex items-center gap-2.5 text-sm text-red-700 dark:text-red-300 hover:underline"
            >
              <Mail className="h-4 w-4 shrink-0" />
              support@grandpms.io
            </a>
            <a
              href="tel:+18005550100"
              className="flex items-center gap-2.5 text-sm text-red-700 dark:text-red-300 hover:underline"
            >
              <Phone className="h-4 w-4 shrink-0" />
              +1 (800) 555-0100
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Check Again
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onSignOut}
          >
            Sign Out
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Rakz · Account status is managed by your system administrator.
        </p>
      </div>
    </div>
  );
}
