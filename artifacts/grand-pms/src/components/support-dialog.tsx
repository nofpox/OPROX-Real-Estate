import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { useCreateSupportTicket } from "@/lib/local-hooks";
import type { AuthUser } from "@/App";

interface SupportDialogProps { open: boolean; onOpenChange: (open: boolean) => void; authUser: AuthUser; }

export function SupportDialog({ open, onOpenChange, authUser }: SupportDialogProps) {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState("issue");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createTicket = useCreateSupportTicket();

  function reset() { setSubmitted(false); setCategory("issue"); setTitle(""); setDescription(""); }
  function handleClose(v: boolean) { if (!v) reset(); onOpenChange(v); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    await createTicket.mutateAsync({ data: { title: title.trim(), description: description.trim(), category } });
    setSubmitted(true);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("support.title","Contact Support")}</DialogTitle>
          <DialogDescription>{t("support.subtitle","Submit a bug report, suggestion, or question.")}</DialogDescription>
        </DialogHeader>
        {submitted ? (
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500"/>
            <p className="font-medium">{t("support.submitted","Ticket submitted!")}</p>
            <p className="text-sm text-muted-foreground">{t("support.submittedDesc","We'll review your request shortly.")}</p>
            <Button onClick={() => handleClose(false)}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("support.category","Category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="issue">General Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("support.subject","Subject")}</Label>
              <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Brief description…" required/>
            </div>
            <div className="space-y-1.5">
              <Label>{t("support.description","Details")}</Label>
              <Textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} placeholder="Please describe the issue in detail…" required/>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={()=>handleClose(false)}>Cancel</Button>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? "Submitting…" : t("support.submit","Submit")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
