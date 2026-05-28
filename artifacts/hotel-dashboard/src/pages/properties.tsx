import React, { useState } from "react";
import { Link } from "wouter";
import { 
  useListProperties, 
  getListPropertiesQueryKey,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
  useGetFinanceSummary
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, MapPin, Building2, Pencil, Trash2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Property } from "@workspace/api-client-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

const PropertyTypeBadge = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case 'hotel': 
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 dark:bg-blue-900/30 dark:text-blue-400">{type}</Badge>;
    case 'apartment': 
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 dark:bg-amber-900/30 dark:text-amber-400">{type}</Badge>;
    case 'compound': 
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 dark:bg-green-900/30 dark:text-green-400">{type}</Badge>;
    default: 
      return <Badge variant="outline">{type}</Badge>;
  }
};

const PropertyStatusBadge = ({ status }: { status: string }) => {
  return status.toLowerCase() === 'active' 
    ? <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">Active</Badge>
    : <Badge variant="outline" className="text-gray-500">Inactive</Badge>;
};

const propertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().default("USA"),
  description: z.string().optional(),
  status: z.string().default("active"),
});

export default function Properties() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  
  const { data: properties, isLoading: isLoadingProperties } = useListProperties();
  const { data: financeSummaries } = useGetFinanceSummary();
  
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof propertySchema>>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "",
      type: "Hotel",
      address: "",
      city: "",
      country: "USA",
      description: "",
      status: "active",
    },
  });

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    form.reset({
      name: property.name,
      type: property.type,
      address: property.address,
      city: property.city,
      country: property.country,
      description: property.description || "",
      status: property.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this property? All associated rooms and bookings will also be removed.")) {
      deleteProperty.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Property deleted successfully" });
          queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to delete property", variant: "destructive" });
        }
      });
    }
  };

  const onSubmit = (data: z.infer<typeof propertySchema>) => {
    if (editingProperty) {
      updateProperty.mutate({ id: editingProperty.id, data }, {
        onSuccess: () => {
          toast({ title: "Property updated successfully" });
          queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
          setIsDialogOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to update property", variant: "destructive" });
        }
      });
    } else {
      createProperty.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Property created successfully" });
          queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
          setIsDialogOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to create property", variant: "destructive" });
        }
      });
    }
  };

  const onOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingProperty(null);
      form.reset({
        name: "",
        type: "Hotel",
        address: "",
        city: "",
        country: "USA",
        description: "",
        status: "active",
      });
    }
  };

  const totalProperties = properties?.length || 0;
  const activeUnits = properties?.reduce((sum, p) => sum + (p.unitCount || 0), 0) || 0;
  const totalRevenue = financeSummaries?.reduce((sum, f) => sum + f.totalRevenue, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your portfolio across all property types.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button className="font-semibold shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Property
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{editingProperty ? "Edit Property" : "Add New Property"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Grand Hotel Downtown" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Hotel">Hotel</SelectItem>
                            <SelectItem value="Apartment">Apartment</SelectItem>
                            <SelectItem value="Compound">Compound</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="USA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Property description..." className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createProperty.isPending || updateProperty.isPending}>
                    Save Property
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <h2 className="text-3xl font-bold">{totalProperties}</h2>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="9" y1="3" y2="21"/></svg>
              <p className="text-sm font-medium text-muted-foreground">Active Units</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <h2 className="text-3xl font-bold">{activeUnits}</h2>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <p className="text-sm font-medium text-muted-foreground">Total Portfolio Revenue</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <h2 className="text-3xl font-bold">{formatCurrency(totalRevenue)}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoadingProperties ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="p-6 pb-4">
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-7 w-48" />
              </CardHeader>
              <CardContent className="p-6 pt-0 flex-1 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/3" />
                <div className="pt-4 mt-4 border-t flex justify-between">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : properties?.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-lg bg-card border-dashed">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No properties found</h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">You haven't added any properties to your portfolio yet. Create one to get started.</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Property
            </Button>
          </div>
        ) : (
          properties?.map((property) => {
            const finance = financeSummaries?.find(f => f.propertyId === property.id);
            return (
              <Card key={property.id} className="shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                <CardHeader className="p-6 pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <PropertyTypeBadge type={property.type} />
                    <PropertyStatusBadge status={property.status} />
                  </div>
                  <CardTitle className="font-serif text-xl line-clamp-1">{property.name}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="line-clamp-1">{property.address}, {property.city}, {property.country}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex-1 flex flex-col">
                  <div className="mb-4">
                    <Badge variant="secondary" className="font-normal">{property.unitCount} Units</Badge>
                  </div>
                  
                  {finance && (
                    <div className="mt-auto pt-4 border-t grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Revenue</p>
                        <p className="font-medium text-foreground">{formatCurrency(finance.totalRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Net Income</p>
                        <p className={`font-medium ${finance.netIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {formatCurrency(finance.netIncome)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4 bg-muted/20 border-t flex justify-between gap-2">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(property)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(property.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                  <Link href={`/properties/${property.id}`} className="flex-1">
                    <Button className="w-full bg-background" variant="outline">
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
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