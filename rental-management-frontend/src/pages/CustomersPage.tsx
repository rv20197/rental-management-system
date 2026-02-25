import React, { useState, useMemo } from "react";
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useDeleteCustomerMutation,
  useUpdateCustomerMutation,
} from "../api/customerApi";
import type { Customer } from "../api/customerApi";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";

// memoized row to avoid re-rendering unchanged rows
interface CustomerRowProps {
  customer: Customer;
  onDelete: (id: number) => void;
  onEdit: (customer: Customer) => void;
}
const CustomerRow = React.memo(function CustomerRow({ customer, onDelete, onEdit }: CustomerRowProps) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{customer.id}</TableCell>
      <TableCell className="font-medium">{customer.firstName} {customer.lastName}</TableCell>
      <TableCell>{customer.email}</TableCell>
      <TableCell>{customer.phone || "N/A"}</TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button size="icon-xs" variant="ghost" onClick={() => onEdit(customer)}>
            <Pencil className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-xs" className="text-destructive" onClick={() => onDelete(customer.id)}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const pageSize = 10;
  const [page, setPage] = useState(0);

  const { data: allCustomers = [], isLoading } = useGetCustomersQuery();

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allCustomers, searchTerm]);

  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(page * pageSize, (page + 1) * pageSize);
  }, [filteredCustomers, page, pageSize]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);

  const [createCustomer] = useCreateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCustomer({ firstName, lastName, email, phone }).unwrap();
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setAddOpen(false);
      toast.success("Customer added successfully");
    } catch (err) {
      toast.error("Failed to add customer");
    }
  };

  const handleEdit = async () => {
    if (!editingCustomer) return;
    try {
      await updateCustomer({ id: editingCustomer.id, data: { phone: editPhone, address: editAddress } }).unwrap();
      setEditOpen(false);
      setEditingCustomer(null);
      toast.success("Customer updated successfully");
    } catch (err) {
      toast.error("Failed to update customer");
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database and contact information.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
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
            <div className="py-10 text-center text-muted-foreground">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No customers found.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.map((c) => (
                    <CustomerRow
                      key={c.id}
                      customer={c}
                      onDelete={deleteCustomer}
                      onEdit={(cust) => {
                        setEditingCustomer(cust);
                        setEditPhone(cust.phone || "");
                        setEditAddress(cust.address || "");
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

      {/* Add Customer Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit">Create Customer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone</Label>
              <Input id="editPhone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAddress">Address</Label>
              <Input id="editAddress" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
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
