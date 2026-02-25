import React, { useState, useMemo } from "react";
import {
  useGetItemsQuery,
  useCreateItemMutation,
  useDeleteItemMutation,
  useUpdateItemMutation,
} from "../api/itemApi";
import type { Item } from "../api/itemApi";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "../components/ui/dialog";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";

const ItemRow = React.memo(function ItemRow({ item, onDelete, onEdit }: { item: Item; onDelete: (id: number) => void; onEdit: (item: Item) => void }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{item.id}</TableCell>
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell>₹{Number(item.monthlyRate).toFixed(2)}</TableCell>
      <TableCell>{item.quantity}</TableCell>
      <TableCell>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          item.status === "available" 
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
            : item.status === "rented"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        }`}>
          {item.status}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button size="icon-xs" variant="ghost" onClick={() => onEdit(item)}>
            <Pencil className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-xs" className="text-destructive" onClick={() => onDelete(item.id)}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export default function ItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const pageSize = 10;
  const [page, setPage] = useState(0);

  const { data: allItems = [], isLoading } = useGetItemsQuery();

  const filteredItems = useMemo(() => {
    return allItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allItems, searchTerm]);

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(page * pageSize, (page + 1) * pageSize);
  }, [filteredItems, page, pageSize]);

  const totalPages = Math.ceil(filteredItems.length / pageSize);

  const [createItem] = useCreateItemMutation();
  const [deleteItem] = useDeleteItemMutation();
  const [updateItem] = useUpdateItemMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editMonthlyRate, setEditMonthlyRate] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editStatus, setEditStatus] = useState<Item["status"]>("available");

  const [name, setName] = useState("");
  const [monthlyRate, setMonthlyRate] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createItem({ name, monthlyRate, quantity }).unwrap();
      setName("");
      setMonthlyRate(0);
      setQuantity(1);
      setAddOpen(false);
      toast.success("Item added successfully");
    } catch (err) {
      toast.error("Failed to add item");
    }
  };

  const handleEdit = async () => {
    if (!editingItem) return;
    try {
      await updateItem({ 
        id: editingItem.id, 
        data: { monthlyRate: editMonthlyRate, quantity: editQuantity, status: editStatus } 
      }).unwrap();
      setEditOpen(false);
      setEditingItem(null);
      toast.success("Item updated successfully");
    } catch (err) {
      toast.error("Failed to update item");
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Items</h1>
          <p className="text-muted-foreground">Manage your rental items, rates, and availability.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4 mr-2" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No items found.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Monthly Rate</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((i) => (
                    <ItemRow 
                      key={i.id} 
                      item={i} 
                      onDelete={deleteItem} 
                      onEdit={(it) => { 
                        setEditingItem(it); 
                        setEditMonthlyRate(it.monthlyRate || 0); 
                        setEditQuantity(it.quantity || 1); 
                        setEditStatus(it.status || 'available'); 
                        setEditOpen(true); 
                      }} 
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <div className="text-sm text-muted-foreground mr-auto">
                Page {page + 1} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                disabled={page + 1 >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Monthly Rate (₹)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(parseFloat(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">Initial Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit">Create Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editMonthly">Monthly Rate (₹)</Label>
                <Input 
                  id="editMonthly" 
                  type="number" 
                  step="0.01"
                  value={editMonthlyRate} 
                  onChange={(e) => setEditMonthlyRate(Number(e.target.value))} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editQty">Quantity</Label>
                <Input 
                  id="editQty" 
                  type="number" 
                  value={editQuantity} 
                  onChange={(e) => setEditQuantity(Number(e.target.value))} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editStatus">Status</Label>
              <select 
                id="editStatus" 
                value={editStatus} 
                onChange={(e) => setEditStatus(e.target.value as Item["status"])} 
                className="w-full p-2 border rounded-md bg-background text-sm"
              >
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit}>Save Changes</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
