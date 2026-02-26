
import React, { useState, useMemo } from "react";
import {
  useGetBillingsQuery,
  usePayBillingMutation,
  useDeleteBillingMutation,
  useCreateBillingMutation,
} from "../api/billingApi";
import { useGetRentalsQuery } from "../api/rentalApi";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Plus, Search, ChevronLeft, ChevronRight, CheckCircle2, Trash2, Download } from "lucide-react";
import api from "../api";

const BillingRow = React.memo(function BillingRow({ billing, onPay, onDelete }: { billing: any; onPay: (id: number) => void; onDelete: (id: number) => void }) {
  const handleDownload = async () => {
    try {
      const response = await api.get(`/billings/${billing.id}/download`, {
        responseType: 'blob',
      });
      
      let filename = `bill-${billing.id}.pdf`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download bill");
    }
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{billing.id}</TableCell>
      <TableCell className="font-mono text-xs">{billing.rentalId}</TableCell>
      <TableCell className="whitespace-nowrap">{new Date(billing.dueDate).toLocaleDateString()}</TableCell>
      <TableCell className="font-semibold">₹{Number(billing.amount).toFixed(2)}</TableCell>
      <TableCell>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          billing.status === "paid" 
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
            : billing.status === "overdue"
            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        }`}>
          {billing.status}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button size="icon-xs" variant="ghost" className="text-blue-600" onClick={handleDownload}>
            <Download className="size-3" />
          </Button>
          {billing.status !== "paid" && (
            <Button size="icon-xs" variant="ghost" className="text-green-600" onClick={() => onPay(billing.id)}>
              <CheckCircle2 className="size-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon-xs" className="text-destructive" onClick={() => onDelete(billing.id)}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export default function BillingsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const pageSize = 10;
  const [page, setPage] = useState(0);

  const { data: allBillings = [], isLoading } = useGetBillingsQuery();

  const filteredBillings = useMemo(() => {
    return allBillings.filter(b => 
      b.id.toString().includes(searchTerm) ||
      b.rentalId.toString().includes(searchTerm)
    );
  }, [allBillings, searchTerm]);

  const paginatedBillings = useMemo(() => {
    return filteredBillings.slice(page * pageSize, (page + 1) * pageSize);
  }, [filteredBillings, page, pageSize]);

  const totalPages = Math.ceil(filteredBillings.length / pageSize);

  const [payBilling] = usePayBillingMutation();
  const [deleteBilling] = useDeleteBillingMutation();
  const [createBilling, { isLoading: isCreating }] = useCreateBillingMutation();

  const { data: rentals = [] } = useGetRentalsQuery();
  const [newOpen, setNewOpen] = useState(false);
  const [newRentalId, setNewRentalId] = useState<number | "">("");
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newDueDate, setNewDueDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newRentalId || newAmount <= 0) return toast.warning('Please fill required fields');
    try {
      await createBilling({ rentalId: Number(newRentalId), amount: newAmount, dueDate: newDueDate, status: 'pending' } as any).unwrap();
      setNewOpen(false);
      setNewRentalId("");
      setNewAmount(0);
      toast.success("Billing created successfully");
    } catch (err) {
      toast.error('Failed to create billing');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billings</h1>
          <p className="text-muted-foreground">Manage invoices, payments, and billing history.</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4 mr-2" />
          New Billing
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by billing ID or rental ID..."
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
            <div className="py-10 text-center text-muted-foreground">Loading billings...</div>
          ) : filteredBillings.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No billing records found.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Rental ID</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBillings.map((b) => (
                    <BillingRow
                      key={b.id}
                      billing={b}
                      onPay={payBilling}
                      onDelete={deleteBilling}
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

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Billing</DialogTitle>
            <DialogDescription>Select rental and amount to create a billing record.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rental">Rental</Label>
              <select 
                id="rental" 
                className="w-full p-2 border rounded-md bg-background text-sm" 
                value={newRentalId} 
                onChange={(e) => setNewRentalId(e.target.value === "" ? "" : Number(e.target.value))}
                required
              >
                <option value="">Select a rental</option>
                {rentals.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.id} - {r.Item?.name ?? r.itemId}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01"
                  value={newAmount} 
                  onChange={(e) => setNewAmount(parseFloat(e.target.value))} 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due">Due Date</Label>
                <Input 
                  id="due" 
                  type="date" 
                  value={newDueDate} 
                  onChange={(e) => setNewDueDate(e.target.value)} 
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Billing'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
