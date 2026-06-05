import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  useListSupportTickets,
  useUpdateSupportTicket,
} from "@/lib/local-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { getListSupportTicketsQueryKey } from "@/lib/local-hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Ticket, RefreshCcw } from "lucide-react";
import type { SupportTicket } from "@/lib/local-hooks";

const STATUS_COLORS: Record<string, string> = {
  open:        "bg-blue-100 text-blue-700",
  "in-progress": "bg-amber-100 text-amber-700",
  resolved:    "bg-green-100 text-green-700",
  closed:      "bg-gray-100 text-gray-600",
};

const CATEGORY_COLORS: Record<string, string> = {
  issue:      "bg-red-100 text-red-700",
  bug:        "bg-orange-100 text-orange-700",
  suggestion: "bg-purple-100 text-purple-700",
};

export default function SupportTickets() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const params = statusFilter !== "all" ? { status: statusFilter } : {};
  const { data: tickets = [], isLoading, refetch } = useListSupportTickets(params);
  const updateTicket = useUpdateSupportTicket();

  function openDetail(ticket: SupportTicket) {
    setSelected(ticket);
    setNotes(ticket.adminNotes ?? "");
    setNewStatus(ticket.status);
  }

  async function handleUpdate() {
    if (!selected) return;
    await updateTicket.mutateAsync({
      id: selected.id,
      data: { status: newStatus, adminNotes: notes },
    });
    qc.invalidateQueries({ queryKey: getListSupportTicketsQueryKey() });
    setSelected(null);
  }

  const statusOptions = ["all", "open", "in-progress", "resolved", "closed"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2">
            <Ticket className="h-6 w-6" />
            {t("support.pageTitle")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("support.pageSubtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          {t("common.refresh")}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {(["open", "in-progress", "resolved", "closed"] as const).map((s) => {
          const count = tickets.filter((tk) => tk.status === s).length;
          return (
            <Card key={s} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setStatusFilter(s)}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground capitalize">{s.replace("-", " ")}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <span className="text-2xl font-bold">{count}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">{t("support.filterStatus")}:</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? t("common.all") : s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>
            {t("common.clearFilter")}
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">{t("common.loading")}</div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">{t("support.noTickets")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t("support.category")}</TableHead>
                  <TableHead>{t("support.titleLabel")}</TableHead>
                  <TableHead>{t("support.submittedBy")}</TableHead>
                  <TableHead>{t("support.status")}</TableHead>
                  <TableHead>{t("support.createdAt")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDetail(ticket)}>
                    <TableCell className="text-muted-foreground">{ticket.id}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${CATEGORY_COLORS[ticket.category] ?? ""}`} variant="outline">
                        {ticket.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-medium">{ticket.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ticket.submittedByName ?? "—"}
                      {ticket.submittedByRole && (
                        <span className="ml-1.5 text-xs opacity-60 capitalize">({ticket.submittedByRole})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[ticket.status] ?? ""}`} variant="outline">
                        {ticket.status.replace("-", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(ticket); }}>
                        {t("common.view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              #{selected?.id} — {selected?.title}
            </DialogTitle>
            <DialogDescription>
              {selected?.submittedByName} · {selected?.submittedByRole} ·{" "}
              {selected?.createdAt ? format(new Date(selected.createdAt), "PPP") : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge className={`text-xs ${CATEGORY_COLORS[selected?.category ?? ""] ?? ""}`} variant="outline">
                {selected?.category}
              </Badge>
              <Badge className={`text-xs ${STATUS_COLORS[selected?.status ?? ""] ?? ""}`} variant="outline">
                {selected?.status?.replace("-", " ")}
              </Badge>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-widest">{t("support.descriptionLabel")}</Label>
              <p className="mt-1.5 text-sm bg-muted rounded-md p-3 whitespace-pre-wrap">{selected?.description}</p>
            </div>

            <div className="space-y-1.5">
              <Label>{t("support.updateStatus")}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["open", "in-progress", "resolved", "closed"].map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-notes">{t("support.adminNotes")}</Label>
              <Textarea
                id="admin-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("support.adminNotesPlaceholder")}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>{t("common.cancel")}</Button>
              <Button onClick={handleUpdate} disabled={updateTicket.isPending}>
                {updateTicket.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
