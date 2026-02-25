import React, { useState, useMemo } from "react";
import {
  useGetRentalsQuery,
  useReturnAndBillMutation,
  useCreateRentalMutation,
  useUpdateRentalMutation,
} from "../api/rentalApi";
import { useGetItemsQuery } from "../api/itemApi";
import { toast } from "sonner";
import { useGetCustomersQuery } from "../api/customerApi";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Plus, Search, ChevronLeft, ChevronRight, ReceiptText, Download, CalendarPlus } from "lucide-react";
import api from "../api";

const downloadFile = async (endpoint: string, filename: string) => {
  try {
    const response = await api.get(endpoint, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(`Failed to download ${filename.split('-')[0]}`);
  }
};

const RentalRow = React.memo(function RentalRow({ rental, onReturn, onExtend }: { rental: any; onReturn: (id: number) => void; onExtend: (id: number, currentEndDate: string) => void }) {
  const handleDownloadEstimation = () => {
    downloadFile(`/rentals/${rental.id}/estimation`, `estimation-${rental.id}.pdf`);
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{rental.id}</TableCell>
      <TableCell className="font-medium">{rental.Item?.name ?? rental.itemId}</TableCell>
      <TableCell>
        {rental.Customer
          ? `${rental.Customer.firstName ?? ""} ${rental.Customer.lastName ?? ""}`.trim() || rental.Customer.email
          : rental.customerId}
      </TableCell>
      <TableCell>{rental.quantity}</TableCell>
      <TableCell>{rental.depositAmount != null ? `₹${Number(rental.depositAmount).toFixed(2)}` : "-"}</TableCell>
      <TableCell>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          rental.status === "active" 
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
            : rental.status === "completed"
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        }`}>
          {rental.status}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="xs"
            disabled={rental.status !== "active"}
            onClick={() => onExtend(rental.id, rental.endDate)}
            className="gap-1"
          >
            <CalendarPlus className="size-3" />
            Extend
          </Button>
          <Button
            variant="outline"
            size="xs"
            disabled={rental.status !== "active"}
            onClick={() => onReturn(rental.id)}
            className="gap-1"
          >
            <ReceiptText className="size-3" />
            Return
          </Button>
          <Button size="icon-xs" variant="ghost" className="text-blue-600" title="Download Estimation" onClick={handleDownloadEstimation}>
            <Download className="size-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export default function RentalsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const pageSize = 10;
  const [page, setPage] = useState(0);

  const { data: allRentals = [], isLoading } = useGetRentalsQuery();

  const filteredRentals = useMemo(() => {
    return allRentals.filter(r => 
      (r.Item?.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.Customer?.firstName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.Customer?.lastName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.Customer?.email ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allRentals, searchTerm]);

  const paginatedRentals = useMemo(() => {
    return filteredRentals.slice(page * pageSize, (page + 1) * pageSize);
  }, [filteredRentals, page, pageSize]);

  const totalPages = Math.ceil(filteredRentals.length / pageSize);

  const [returnAndBill, { isLoading: isReturning }] = useReturnAndBillMutation();
  const [createRental, { isLoading: isCreating }] = useCreateRentalMutation();
  const [updateRental, { isLoading: isExtending }] = useUpdateRentalMutation();

  const { data: allItems = [] } = useGetItemsQuery();
  const { data: allCustomers = [] } = useGetCustomersQuery();

  const [newOpen, setNewOpen] = useState(false);
  const [newItemId, setNewItemId] = useState<number | "">("");
  const [newCustomerId, setNewCustomerId] = useState<number | "">("");
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [newStartDate, setNewStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newEndDate, setNewEndDate] = useState<string>(
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().slice(0, 10);
    })()
  );
  const [newDepositAmount, setNewDepositAmount] = useState<string>("");

  const [selectedRentalId, setSelectedRentalId] = useState<number | null>(null);
  const [returnQty, setReturnQty] = useState<number>(0);

  const selectedRental = useMemo(
    () => allRentals.find((r) => r.id === selectedRentalId) || null,
    [allRentals, selectedRentalId],
  );

  const [extendOpenRentalId, setExtendOpenRentalId] = useState<number | null>(null);
  const [extendNewEndDate, setExtendNewEndDate] = useState<string>("");

  const selectedExtendRental = useMemo(
    () => allRentals.find((r) => r.id === extendOpenRentalId) || null,
    [allRentals, extendOpenRentalId],
  );

  const allowable = useMemo(() => {
    if (!selectedRental) return 0;
    return selectedRental.quantity - (selectedRental.returnedQuantity || 0);
  }, [selectedRental]);

  const handleReturn = async () => {
    if (!selectedRentalId || returnQty <= 0) return;
    try {
      const result = await returnAndBill({ rentalId: selectedRentalId, returnedQuantity: returnQty }).unwrap();
      setSelectedRentalId(null);
      setReturnQty(0);
      toast.success("Return processed successfully!");
      if (result.billing?.id) {
        downloadFile(`/billings/${result.billing.id}/download`, `bill-${result.billing.id}.pdf`);
      }
    } catch (err) {
      toast.error("Failed to process return");
    }
  };

  const handleExtend = async () => {
    if (!extendOpenRentalId) return;
    try {
      const r = allRentals.find((x) => x.id === extendOpenRentalId);
      const currentEnd = r?.endDate ? new Date(r.endDate) : null;
      const newEnd = new Date(extendNewEndDate);
      if (!currentEnd || isNaN(newEnd.getTime())) {
        return toast.warning("Please select a valid date");
      }
      if (newEnd <= currentEnd) {
        return toast.warning("New end date must be after current end date");
      }
      await updateRental({ id: extendOpenRentalId, data: { endDate: extendNewEndDate } }).unwrap();
      const id = extendOpenRentalId;
      setExtendOpenRentalId(null);
      toast.success("Rental extended successfully");
      downloadFile(`/rentals/${id}/estimation`, `estimation-${id}.pdf`);
    } catch (err) {
      toast.error("Failed to extend rental");
    }
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const depositStr = newDepositAmount.trim();
    const parsedDeposit = depositStr === "" ? undefined : Number(depositStr);
    if (!newItemId || !newCustomerId || newQuantity <= 0) {
      return toast.warning("Please fill required fields");
    }
    try {
      const payload: any = { 
        itemId: Number(newItemId), 
        customerId: Number(newCustomerId), 
        quantity: newQuantity, 
        startDate: newStartDate,
        endDate: newEndDate 
      };
      if (parsedDeposit != null) payload.depositAmount = parsedDeposit;
      const rental = await createRental(payload).unwrap();
      setNewOpen(false);
      setNewItemId("");
      setNewCustomerId("");
      setNewQuantity(1);
      setNewDepositAmount("");
      setNewEndDate((() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
      })());
      toast.success("Rental created successfully");
      if (rental.id) {
        downloadFile(`/rentals/${rental.id}/estimation`, `estimation-${rental.id}.pdf`);
      }
    } catch (err) {
      toast.error("Failed to create rental");
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rentals</h1>
          <p className="text-muted-foreground">Manage ongoing and past equipment rentals.</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4 mr-2" />
          New Rental
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rentals by item or customer..."
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
            <div className="py-10 text-center text-muted-foreground">Loading rentals...</div>
          ) : filteredRentals.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No rentals found.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Deposit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRentals.map((rental) => (
                    <RentalRow
                      key={rental.id}
                      rental={rental}
                      onReturn={(id) => {
                        setSelectedRentalId(id);
                        const r = allRentals.find((x) => x.id === id);
                        if (!r) return setReturnQty(0);
                        const remaining = (r.quantity ?? 0) - (r.returnedQuantity || 0);
                        setReturnQty(Math.max(1, remaining || 0));
                      }}
                      onExtend={(id, currentEnd) => {
                        setExtendOpenRentalId(id);
                        const base = new Date(currentEnd || new Date().toISOString().slice(0, 10));
                        base.setDate(base.getDate() + 30);
                        setExtendNewEndDate(base.toISOString().slice(0, 10));
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

      <Dialog
        open={!!selectedRentalId}
        onOpenChange={(open) => !open && setSelectedRentalId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process the Return</DialogTitle>
            <DialogDescription>
              Confirm quantity for <strong>{selectedRental?.Item?.name}</strong> to calculate billing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qty">Return Quantity</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={allowable || undefined}
                value={returnQty}
                onChange={(e) => setReturnQty(Number(e.target.value))}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRentalId(null)}>Cancel</Button>
              <Button onClick={handleReturn} disabled={isReturning}>
                {isReturning ? 'Processing...' : 'Confirm Return'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!extendOpenRentalId}
        onOpenChange={(open) => !open && setExtendOpenRentalId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Rental</DialogTitle>
            <DialogDescription>
              Choose a new end date for <strong>{selectedExtendRental?.Item?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extendEnd">New End Date</Label>
              <Input
                id="extendEnd"
                type="date"
                value={extendNewEndDate}
                min={selectedExtendRental?.endDate ? new Date(new Date(selectedExtendRental.endDate).getTime() + 24*3600*1000).toISOString().slice(0,10) : undefined}
                onChange={(e) => setExtendNewEndDate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExtendOpenRentalId(null)}>Cancel</Button>
              <Button onClick={handleExtend} disabled={isExtending}>
                {isExtending ? 'Extending...' : 'Confirm Extension'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Rental</DialogTitle>
            <DialogDescription>Select item and customer to start a rental.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item">Item</Label>
              <select 
                id="item" 
                className="w-full p-2 border rounded-md bg-background text-sm" 
                value={newItemId} 
                onChange={(e) => setNewItemId(e.target.value === "" ? "" : Number(e.target.value))} 
                required
              >
                <option value="">Select an item</option>
                {allItems.map((it: any) => (
                  <option key={it.id} value={it.id}>{it.name} (Stock: {it.quantity})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <select 
                id="customer" 
                className="w-full p-2 border rounded-md bg-background text-sm" 
                value={newCustomerId} 
                onChange={(e) => setNewCustomerId(e.target.value === "" ? "" : Number(e.target.value))} 
                required
              >
                <option value="">Select a customer</option>
                {allCustomers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity</Label>
                <Input id="qty" type="number" min={1} value={newQuantity} onChange={(e) => setNewQuantity(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start">Start Date</Label>
                <Input id="start" type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="end">End Date</Label>
                <Input id="end" type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit">Deposit (₹)</Label>
              <Input
                id="deposit"
                type="number"
                min={0}
                step="0.01"
                placeholder="Leave blank to auto-calculate"
                value={newDepositAmount}
                onChange={(e) => setNewDepositAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave blank to auto-calculate based on item rate.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Rental'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
