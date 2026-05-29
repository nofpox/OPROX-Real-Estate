import React, { useState } from "react";
import { Link } from "wouter";
import {
  useListProperties, getListPropertiesQueryKey, useCreateProperty, useUpdateProperty,
  useDeleteProperty,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, MapPin, Building2, Pencil, Trash2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Property } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";

const PropertyTypeBadge = ({ type }: { type: string }) => {
  const { t } = useTranslation();
  const label = t(`propertyType.${type}`, type);
  switch (type.toLowerCase()) {
    case "hotel": return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 dark:bg-blue-900/30 dark:text-blue-400">{label}</Badge>;
    case "apartment": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 dark:bg-amber-900/30 dark:text-amber-400">{label}</Badge>;
    case "compound": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 dark:bg-green-900/30 dark:text-green-400">{label}</Badge>;
    case "furnished apartments": return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-0 dark:bg-indigo-900/30 dark:text-indigo-400">{label}</Badge>;
    default: return <Badge variant="outline">{label}</Badge>;
  }
};

const PropertyStatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  return status.toLowerCase() === "active"
    ? <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">{t("status.active")}</Badge>
    : <Badge variant="outline" className="text-gray-500">{t("status.inactive")}</Badge>;
};

const propertySchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  country: z.string().default("USA"),
  description: z.string().optional(),
  status: z.string().default("active"),
});

export default function Properties() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const { data: properties, isLoading: isLoadingProperties } = useListProperties();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof propertySchema>>({
    resolver: zodResolver(propertySchema),
    defaultValues: { name: "", type: "Hotel", address: "", city: "", country: "USA", description: "", status: "active" },
  });

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    form.reset({ name: property.name, type: property.type, address: property.address, city: property.city, country: property.country, description: property.description || "", status: property.status });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t("properties.deleteConfirm"))) {
      deleteProperty.mutate({ id }, {
        onSuccess: () => { toast({ title: t("properties.deleteSuccess") }); queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() }); },
        onError: () => { toast({ title: t("properties.deleteFailed"), variant: "destructive" }); },
      });
    }
  };

  const onSubmit = (data: z.infer<typeof propertySchema>) => {
    if (editingProperty) {
      updateProperty.mutate({ id: editingProperty.id, data }, {
        onSuccess: () => { toast({ title: t("properties.updateSuccess") }); queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() }); setIsDialogOpen(false); },
        onError: () => { toast({ title: t("properties.updateFailed"), variant: "destructive" }); },
      });
    } else {
      createProperty.mutate({ data }, {
        onSuccess: () => { toast({ title: t("properties.createSuccess") }); queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() }); setIsDialogOpen(false); },
        onError: () => { toast({ title: t("properties.createFailed"), variant: "destructive" }); },
      });
    }
  };

  const onOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) { setEditingProperty(null); form.reset({ name: "", type: "Hotel", address: "", city: "", country: "USA", description: "", status: "active" }); }
  };

  const totalProperties = properties?.length || 0;
  const activeUnits = properties?.reduce((sum, p) => sum + (p.unitCount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("properties.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("properties.subtitle")}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button className="font-semibold shadow-sm">
              <Plus className="me-2 h-4 w-4" />
              {t("properties.newProperty")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{editingProperty ? t("properties.editProperty") : t("properties.addNewProperty")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("properties.fields.name")}</FormLabel>
                    <FormControl><Input placeholder={t("properties.fields.namePlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("properties.fields.type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("properties.fields.selectType")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(["Hotel", "Apartment", "Compound", "Furnished Apartments"] as const).map((type) => (
                            <SelectItem key={type} value={type}>{t(`propertyType.${type}`, type)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("properties.fields.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("properties.fields.selectStatus")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="active">{t("status.active")}</SelectItem>
                          <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("properties.fields.address")}</FormLabel>
                    <FormControl><Input placeholder={t("properties.fields.addressPlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("properties.fields.city")}</FormLabel>
                      <FormControl><Input placeholder={t("properties.fields.cityPlaceholder")} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("properties.fields.country")}</FormLabel>
                      <FormControl><Input placeholder={t("properties.fields.countryPlaceholder")} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("properties.fields.description")}</FormLabel>
                    <FormControl><Textarea placeholder={t("properties.fields.descriptionPlaceholder")} className="resize-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createProperty.isPending || updateProperty.isPending}>
                    {t("properties.saveProperty")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { icon: Building2, label: t("properties.kpi.totalProperties"), value: totalProperties },
          { icon: null, label: t("properties.kpi.activeUnits"), value: activeUnits },
        ].map(({ label, value }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <h2 className="text-3xl font-bold mt-2">{value}</h2>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoadingProperties ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="p-6 pb-4"><Skeleton className="h-5 w-24 mb-2" /><Skeleton className="h-7 w-48" /></CardHeader>
              <CardContent className="p-6 pt-0 flex-1 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/3" />
                <div className="pt-4 mt-4 border-t flex justify-between"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></div>
              </CardContent>
            </Card>
          ))
        ) : properties?.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-lg bg-card border-dashed">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">{t("properties.noProperties")}</h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">{t("properties.noPropertiesDesc")}</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="me-2 h-4 w-4" /> {t("properties.newProperty")}
            </Button>
          </div>
        ) : (
          properties?.map((property) => {
            return (
              <Card key={property.id} className="shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                <CardHeader className="p-6 pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <PropertyTypeBadge type={property.type} />
                    <PropertyStatusBadge status={property.status} />
                  </div>
                  <CardTitle className="font-serif text-xl line-clamp-1">{property.name}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="me-1 h-3 w-3 shrink-0" />
                    <span className="line-clamp-1">{property.address}, {property.city}, {property.country}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex-1 flex flex-col">
                  <div className="mb-4">
                    <Badge variant="secondary" className="font-normal">{property.unitCount} {t("properties.units")}</Badge>
                  </div>
                </CardContent>
                <CardFooter className="p-4 bg-muted/20 border-t flex justify-between gap-2">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(property)}>
                      <Pencil className="h-4 w-4" /><span className="sr-only">{t("common.edit")}</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(property.id)}>
                      <Trash2 className="h-4 w-4" /><span className="sr-only">{t("common.delete")}</span>
                    </Button>
                  </div>
                  <Link href={`/properties/${property.id}`} className="flex-1">
                    <Button className="w-full bg-background" variant="outline">
                      {t("properties.viewDetails")}
                      <ArrowRight className="ms-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
