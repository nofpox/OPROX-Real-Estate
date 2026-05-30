import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { useCreateSupportTicket } from "@workspace/api-client-react";
import type { AuthUser } from "@/App";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authUser: AuthUser;
}

export function SupportDialog({ open, onOpenChange, authUser }: SupportDialogProps) {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState("issue");
  const [title, setTitle]       = useState("");
  const [description, setDescription] = useState("");

  const createTicket = useCreateSupportTicket();

  function reset() {
    setSubmitted(false);
    setCategory("issue");
    setTitle("");
    setDescription("");
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    await createTicket.mutateAsync({
      data: { category, title: title.trim(), description: description.trim() },
    });
    setSubmitted(true);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            {t("support.dialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("support.dialogSubtitle")}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-medium text-base">{t("support.successTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("support.successBody")}</p>
            <Button variant="outline" onClick={() => handleClose(false)}>
              {t("common.close")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t("support.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="issue">{t("support.categoryIssue")}</SelectItem>
                  <SelectItem value="bug">{t("support.categoryBug")}</SelectItem>
                  <SelectItem value="suggestion">{t("support.categorySuggestion")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="support-title">{t("support.titleLabel")}</Label>
              <Input
                id="support-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("support.titlePlaceholder")}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="support-desc">{t("support.descriptionLabel")}</Label>
              <Textarea
                id="support-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("support.descriptionPlaceholder")}
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? t("common.saving") : t("support.submit")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
