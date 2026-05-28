import React, { useState } from "react";
import { 
  useListRooms, 
  getListRoomsQueryKey,
  useCreateRoom,
  useUpdateRoom,
  useDeleteRoom
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Search, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Room } from "@workspace/api-client-react/src/generated/api.schemas";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

const RoomStatusBadge = ({ status }: { status: string }) => {
  switch (status.toLowerCase()) {
    case 'available': 
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 dark:bg-green-900/30 dark:text-green-400">Available</Badge>;
    case 'occupied': 
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 dark:bg-blue-900/30 dark:text-blue-400">Occupied</Badge>;
    case 'maintenance': 
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-0 dark:bg-orange-900/30 dark:text-orange-400">Maintenance</Badge>;
    default: 
      return <Badge variant="outline">{status}</Badge>;
  }
};

const roomSchema = z.object({
  name: z.string().min(1, "Room name/number is required"),
  type: z.string().min(1, "Type is required"),
  pricePerNight: z.coerce.number().min(0, "Price must be positive"),
  status: z.string().min(1, "Status is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
});

export default function Rooms() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  
  const { data: rooms, isLoading } = useListRooms();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: "",
      type: "Standard",
      pricePerNight: 100,
      status: "available",
      capacity: 2,
    },
  });

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    form.reset({
      name: room.name,
      type: room.type,
      pricePerNight: room.pricePerNight,
      status: room.status,
      capacity: room.capacity || 2,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this room?")) {
      deleteRoom.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Room deleted successfully" });
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to delete room", variant: "destructive" });
        }
      });
    }
  };

  const onSubmit = (data: z.infer<typeof roomSchema>) => {
    if (editingRoom) {
      updateRoom.mutate({ id: editingRoom.id, data }, {
        onSuccess: () => {
          toast({ title: "Room updated successfully" });
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
          setIsDialogOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to update room", variant: "destructive" });
        }
      });
    } else {
      createRoom.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Room created successfully" });
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
          setIsDialogOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to create room", variant: "destructive" });
        }
      });
    }
  };

  const onOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingRoom(null);
      form.reset({
        name: "",
        type: "Standard",
        pricePerNight: 100,
        status: "available",
        capacity: 2,
      });
    }
  };

  const filteredRooms = rooms?.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Rooms</h1>
          <p className="text-muted-foreground mt-1">Manage property rooms and rates.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button className="font-semibold shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRoom ? "Edit Room" : "Add New Room"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Name / Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 101 or Presidential Suite" {...field} />
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
                        <FormLabel>Room Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Standard">Standard</SelectItem>
                            <SelectItem value="Deluxe">Deluxe</SelectItem>
                            <SelectItem value="Suite">Suite</SelectItem>
                            <SelectItem value="Presidential">Presidential</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity (Guests)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pricePerNight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Per Night ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
                        </FormControl>
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
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending}>
                    Save Room
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search rooms..."
              className="w-full pl-8 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : filteredRooms?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No rooms found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms?.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell>{room.type}</TableCell>
                    <TableCell>{room.capacity} Guests</TableCell>
                    <TableCell className="font-medium">{formatCurrency(room.pricePerNight)}<span className="text-muted-foreground text-xs font-normal">/nt</span></TableCell>
                    <TableCell>
                      <RoomStatusBadge status={room.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(room)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => handleDelete(room.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}