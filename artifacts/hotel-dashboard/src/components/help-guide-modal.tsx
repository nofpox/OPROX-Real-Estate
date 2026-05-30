import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HardHat, UserCog, ShieldCheck, CheckCircle2, HelpCircle,
} from "lucide-react";

interface StepProps {
  number: number;
  text: string;
}

function Step({ number, text }: StepProps) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
        {number}
      </span>
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );
}

interface RoleSectionProps {
  steps: string[];
}

function RoleSection({ steps }: RoleSectionProps) {
  return (
    <div className="space-y-3 pt-2">
      {steps.map((step, i) => (
        <Step key={i} number={i + 1} text={step} />
      ))}
    </div>
  );
}

interface HelpGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpGuideModal({ open, onOpenChange }: HelpGuideModalProps) {
  const { t } = useTranslation();

  const workerSteps: string[] = [
    t("help.worker.step1"),
    t("help.worker.step2"),
    t("help.worker.step3"),
    t("help.worker.step4"),
  ];

  const supervisorSteps: string[] = [
    t("help.supervisor.step1"),
    t("help.supervisor.step2"),
  ];

  const managerSteps: string[] = [
    t("help.manager.step1"),
    t("help.manager.step2"),
    t("help.manager.step3"),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t("help.title")}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t("help.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="worker" className="mt-1">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="worker" className="gap-1.5 text-xs">
              <HardHat className="h-3.5 w-3.5" />
              {t("help.worker.title")}
            </TabsTrigger>
            <TabsTrigger value="supervisor" className="gap-1.5 text-xs">
              <UserCog className="h-3.5 w-3.5" />
              {t("help.supervisor.title")}
            </TabsTrigger>
            <TabsTrigger value="manager" className="gap-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("help.manager.title")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="worker" className="mt-4">
            <div className="rounded-lg bg-muted/50 border p-4">
              <div className="flex items-center gap-2 mb-3">
                <HardHat className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {t("help.worker.title")}
                </span>
              </div>
              <RoleSection steps={workerSteps} />
            </div>
          </TabsContent>

          <TabsContent value="supervisor" className="mt-4">
            <div className="rounded-lg bg-muted/50 border p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserCog className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  {t("help.supervisor.title")}
                </span>
              </div>
              <RoleSection steps={supervisorSteps} />
            </div>
          </TabsContent>

          <TabsContent value="manager" className="mt-4">
            <div className="rounded-lg bg-muted/50 border p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {t("help.manager.title")}
                </span>
              </div>
              <RoleSection steps={managerSteps} />
              <div className="mt-4 pt-3 border-t flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{t("help.manager.note")}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Standalone trigger button (used in Dashboard header) ─────────────────────
export function HelpGuideButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-4 w-4" />
        {t("help.openButton")}
      </Button>
      <HelpGuideModal open={open} onOpenChange={setOpen} />
    </>
  );
}
