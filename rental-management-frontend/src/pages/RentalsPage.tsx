import React, { useState, useMemo, useEffect } from "react";
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
import { Plus, Search, ChevronLeft, ChevronRight, ReceiptText, Download, CalendarPlus, Eye, X, Trash2, Pencil } from "lucide-react";
import api from "../api";
import { calculateDefaultDeposit } from "../lib/rentalUtils";
import { calculateMonthsRented } from "../lib/billingUtils";

const downloadFile = async (endpoint: string, fallbackFilename: string) => {
  try {
    const response = await api.get(endpoint, {
      responseType: 'blob',
    });

    let filename = fallbackFilename;
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
    toast.error(`Failed to download file`);
  }
};

const RentalRow = React.memo(function RentalRow({ rental, onReturn, onExtend, onView, onEdit }: { rental: any; onReturn: (id: number) => void; onExtend: (id: number, currentEndDate: string) => void; onView: (rental: any) => void; onEdit: (rental: any) => void }) {
  const handleDownloadEstimation = () => {
    downloadFile(`/rentals/${rental.id}/estimation`, `estimation-${rental.id}.pdf`);
  };

  const totalQty = rental.RentalItems && rental.RentalItems.length > 0
    ? rental.RentalItems.reduce((acc: number, ri: any) => acc + ri.quantity, 0)
    : rental.quantity;

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{rental.id}</TableCell>
      <TableCell>
        {rental.Customer
          ? `${rental.Customer.firstName ?? ""} ${rental.Customer.lastName ?? ""}`.trim() || rental.Customer.email
          : rental.customerId}
      </TableCell>
      <TableCell className="whitespace-nowrap">{new Date(rental.startDate).toLocaleDateString()}</TableCell>
      <TableCell>{totalQty}</TableCell>
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
          <Button size="icon-xs" variant="ghost" className="text-blue-600" title="View Details" onClick={() => onView(rental)}>
            <Eye className="size-3" />
          </Button>
          <Button size="icon-xs" variant="ghost" className="text-blue-600" title="Edit Rental" onClick={() => onEdit(rental)}>
            <Pencil className="size-3" />
          </Button>
          <Button size="icon-xs" variant="ghost" className="text-blue-600" title="Download Estimation" onClick={handleDownloadEstimation}>
            <Download className="size-3" />
          </Button>
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
  const [newCustomerId, setNewCustomerId] = useState<number | "">("");
  const [newItems, setNewItems] = useState<{ itemId: number | ""; quantity: number }[]>([
    { itemId: "", quantity: 1 }
  ]);
  const [newStartDate, setNewStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newEndDate, setNewEndDate] = useState<string>(
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().slice(0, 10);
    })()
  );
  const [newDepositAmount, setNewDepositAmount] = useState<string>("");
  const [isNewDepositOverridden, setIsNewDepositOverridden] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRentalId, setEditRentalId] = useState<number | null>(null);
  const [editItems, setEditItems] = useState<{ itemId: number | ""; quantity: number }[]>([]);
  const [editEndDate, setEditEndDate] = useState<string>("");
  const [editDepositAmount, setEditDepositAmount] = useState<string>("");
  const [isEditDepositOverridden, setIsEditDepositOverridden] = useState(false);

  // Auto-calculate deposit for new rental
  useEffect(() => {
    if (newOpen && !isNewDepositOverridden) {
      let total = 0;
      newItems.forEach(item => {
        if (item.itemId !== "") {
          const product = allItems.find(it => it.id === Number(item.itemId));
          if (product) {
            total += calculateDefaultDeposit(Number(product.monthlyRate), item.quantity);
          }
        }
      });
      setNewDepositAmount(total > 0 ? total.toString() : "");
    }
  }, [newItems, allItems, isNewDepositOverridden, newOpen]);

  // Auto-calculate deposit for edit rental
  useEffect(() => {
    if (editOpen && !isEditDepositOverridden) {
      let total = 0;
      editItems.forEach(item => {
        if (item.itemId !== "") {
          const product = allItems.find(it => it.id === Number(item.itemId));
          if (product) {
            total += calculateDefaultDeposit(Number(product.monthlyRate), item.quantity);
          }
        }
      });
      setEditDepositAmount(total > 0 ? total.toString() : "");
    }
  }, [editItems, allItems, isEditDepositOverridden, editOpen]);

  const [selectedRental, setSelectedRental] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [isNewlyCreated, setIsNewlyCreated] = useState(false);

  const handleView = (rental: any) => {
    setSelectedRental(rental);
    setViewOpen(true);
  };

  const [selectedReturnRentalId, setSelectedReturnRentalId] = useState<number | null>(null);
  const [returnItems, setReturnItems] = useState<{ rentalItemId: number; quantity: number }[]>([]);

  const selectedReturnRental = useMemo(
    () => allRentals.find((r) => r.id === selectedReturnRentalId) || null,
    [allRentals, selectedReturnRentalId],
  );

  const [extendOpenRentalId, setExtendOpenRentalId] = useState<number | null>(null);
  const [extendNewEndDate, setExtendNewEndDate] = useState<string>("");

  const selectedExtendRental = useMemo(
    () => allRentals.find((r) => r.id === extendOpenRentalId) || null,
    [allRentals, extendOpenRentalId],
  );

  const allowable = useMemo(() => {
    if (!selectedReturnRental) return 0;
    return selectedReturnRental.quantity - (selectedReturnRental.returnedQuantity || 0);
  }, [selectedReturnRental]);

  const handleOpenReturn = (rental: any) => {
    setSelectedReturnRentalId(rental.id);
    // Initialize with first available item
    const firstAvailableItem = rental.RentalItems?.find((ri: any) => (ri.quantity - (ri.returnedQuantity || 0)) > 0);
    if (firstAvailableItem) {
      setReturnItems([{ 
        rentalItemId: firstAvailableItem.id, 
        quantity: firstAvailableItem.quantity - (firstAvailableItem.returnedQuantity || 0) 
      }]);
    } else {
      setReturnItems([]);
    }
  };

  const handleReturn = async () => {
    if (!selectedReturnRentalId || returnItems.length === 0) return;
    try {
      const result = await returnAndBill({ 
        rentalId: selectedReturnRentalId, 
        items: returnItems 
      }).unwrap();
      setSelectedReturnRentalId(null);
      setReturnItems([]);
      toast.success("Return processed successfully!");
      if (result.billing?.id) {
        downloadFile(`/billings/${result.billing.id}/download`, `bill-${result.billing.id}.pdf`);
      }
    } catch (err) {
      toast.error("Failed to process return");
    }
  };

  const handleAddItem = () => {
    setNewItems([...newItems, { itemId: "", quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (newItems.length > 1) {
      const updated = [...newItems];
      updated.splice(index, 1);
      setNewItems(updated);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewItems(updated);
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

  const handleEdit = (rental: any) => {
    setEditRentalId(rental.id);
    setEditItems(rental.RentalItems.map((ri: any) => ({ itemId: ri.itemId, quantity: ri.quantity })));
    setEditEndDate(new Date(rental.endDate).toISOString().slice(0, 10));
    setEditDepositAmount(rental.depositAmount.toString());
    setEditOpen(true);
    setIsEditDepositOverridden(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRentalId) return;
    try {
      await updateRental({
        id: editRentalId,
        data: {
          items: editItems as any,
          endDate: editEndDate,
          depositAmount: editDepositAmount === "" ? undefined : Number(editDepositAmount),
        }
      }).unwrap();
      setEditOpen(false);
      toast.success("Rental updated successfully");
    } catch (err) {
      toast.error("Failed to update rental");
    }
  };

  const calculateTotals = (items: any[], startDate: string, endDate: string) => {
    if (!startDate || !endDate) return { rent: 0, deposit: 0, total: 0 };
    const months = calculateMonthsRented(new Date(startDate), new Date(endDate));
    let rent = 0;
    let deposit = 0;
    
    items.forEach(item => {
      const it = allItems.find(i => i.id === item.itemId);
      if (it) {
        const rate = Number(it.monthlyRate);
        rent += rate * (item.quantity || 0) * months;
        deposit += calculateDefaultDeposit(rate, item.quantity);
      }
    });
    
    return { rent, deposit, total: rent + deposit };
  };

  const newTotals = useMemo(() => calculateTotals(newItems, newStartDate, newEndDate), [newItems, newStartDate, newEndDate, allItems]);
  
  const editRentalData = useMemo(() => allRentals.find(r => r.id === editRentalId), [allRentals, editRentalId]);
  const editTotals = useMemo(() => {
    if (!editRentalData) return { rent: 0, deposit: 0, total: 0 };
    return calculateTotals(editItems, editRentalData.startDate, editEndDate);
  }, [editItems, editRentalData, editEndDate, allItems]);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const depositStr = newDepositAmount.trim();
    const parsedDeposit = depositStr === "" ? undefined : Number(depositStr);
    
    const validItems = newItems.filter(item => item.itemId !== "" && item.quantity > 0);
    
    if (!newCustomerId || validItems.length === 0) {
      return toast.warning("Please fill required fields and add at least one item");
    }
    
    try {
      const payload: any = { 
        customerId: Number(newCustomerId), 
        items: validItems.map(item => ({ itemId: Number(item.itemId), quantity: Number(item.quantity) })),
        startDate: newStartDate,
        endDate: newEndDate 
      };
      if (parsedDeposit != null) payload.depositAmount = parsedDeposit;
      
      const rental = await createRental(payload).unwrap();
      setNewOpen(false);
      setNewItems([{ itemId: "", quantity: 1 }]);
      setNewCustomerId("");
      setNewDepositAmount("");
      setIsNewDepositOverridden(false);
      setNewEndDate((() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
      })());
      toast.success("Rental created successfully");
      if (rental.id) {
        setSelectedRental(rental);
        setViewOpen(true);
        setIsNewlyCreated(true);
        downloadFile(`/rentals/${rental.id}/estimation`, `estimation-${rental.id}.pdf`);
      }
    } catch (err) {
      toast.error("Failed to create rental");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Rentals</h1>
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
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Start Date</TableHead>
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
                      onView={handleView}
                      onEdit={handleEdit}
                      onReturn={(id) => {
                        const r = allRentals.find((x) => x.id === id);
                        if (r) handleOpenReturn(r);
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
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-end">
              <div className="mr-auto text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </div>
              <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0}
                className="flex-1 sm:flex-none"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                disabled={page + 1 >= totalPages}
                className="flex-1 sm:flex-none"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedReturnRentalId}
        onOpenChange={(open) => !open && setSelectedReturnRentalId(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process the Return</DialogTitle>
            <DialogDescription>
              Select items and quantities being returned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items to Return</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const firstAvailableItem = selectedReturnRental?.RentalItems?.find((ri: any) => {
                      const alreadyInList = returnItems.some(item => item.rentalItemId === ri.id);
                      return !alreadyInList && (ri.quantity - (ri.returnedQuantity || 0)) > 0;
                    });
                    if (firstAvailableItem) {
                      setReturnItems([...returnItems, { 
                        rentalItemId: firstAvailableItem.id, 
                        quantity: firstAvailableItem.quantity - (firstAvailableItem.returnedQuantity || 0) 
                      }]);
                    } else {
                      toast.warning("No more items available to return in this rental.");
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {returnItems.map((item, index) => {
                  const rentalItem = selectedReturnRental?.RentalItems?.find((ri: any) => ri.id === item.rentalItemId);
                  const available = rentalItem ? (rentalItem.quantity - (rentalItem.returnedQuantity || 0)) : 0;
                  
                  return (
                    <div key={index} className="flex gap-3 items-end border p-3 rounded-md relative group">
                      <div className="flex-1 space-y-2">
                        <Label>Item</Label>
                        <select 
                          className="w-full p-2 border rounded-md bg-background text-sm"
                          value={item.rentalItemId}
                          onChange={(e) => {
                            const newId = Number(e.target.value);
                            const ri = selectedReturnRental?.RentalItems?.find((x: any) => x.id === newId);
                            const updated = [...returnItems];
                            updated[index] = { 
                              rentalItemId: newId, 
                              quantity: ri ? (ri.quantity - (ri.returnedQuantity || 0)) : 0 
                            };
                            setReturnItems(updated);
                          }}
                        >
                          {selectedReturnRental?.RentalItems?.filter((ri: any) => {
                            // Only include it if it's NOT already in the list OR if it's the current selection (so it stays in the dropdown)
                            const isCurrentInList = ri.id === item.rentalItemId;
                            const alreadyInList = returnItems.some((it, i) => it.rentalItemId === ri.id && i !== index);
                            const hasRemaining = (ri.quantity - (ri.returnedQuantity || 0)) > 0;
                            return (isCurrentInList || !alreadyInList) && hasRemaining;
                          }).sort((a: any, b: any) => a.id - b.id).map((ri: any) => (
                            <option key={ri.id} value={ri.id}>
                              {ri.Item?.name} (Rented: {ri.quantity}, Returned: {ri.returnedQuantity || 0})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32 space-y-2">
                        <Label>Qty to Return</Label>
                        <Input 
                          type="number" 
                          min={1} 
                          max={available}
                          value={item.quantity} 
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = [...returnItems];
                            updated[index] = { ...updated[index], quantity: val };
                            setReturnItems(updated);
                          }}
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive h-9 w-9"
                        onClick={() => {
                          const updated = [...returnItems];
                          updated.splice(index, 1);
                          setReturnItems(updated);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {returnItems.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-4">No items selected for return.</p>
                )}
              </div>
            </div>


            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedReturnRentalId(null)}>Cancel</Button>
              <Button onClick={handleReturn} disabled={isReturning || returnItems.length === 0}>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Rental</DialogTitle>
            <DialogDescription>Select items and customer to start a rental.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="xs" onClick={handleAddItem} className="gap-1">
                  <Plus className="size-3" /> Add Item
                </Button>
              </div>
              
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                {newItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end border p-3 rounded-md bg-muted/30 relative group">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground">Select Item</Label>
                      <select 
                        className="w-full p-2 border rounded-md bg-background text-sm" 
                        value={item.itemId} 
                        onChange={(e) => handleItemChange(index, 'itemId', e.target.value === "" ? "" : Number(e.target.value))}
                        required
                      >
                        <option value="">Select an item</option>
                        {allItems.map((it: any) => (
                          <option key={it.id} value={it.id}>{it.name} (Stock: {it.quantity})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24 space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground">Quantity</Label>
                      <Input 
                        type="number" 
                        min={1} 
                        value={item.quantity} 
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} 
                        required
                      />
                    </div>
                    {newItems.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive h-9 w-9" 
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start">Start Date</Label>
                <Input id="start" type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End Date</Label>
                <Input id="end" type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit">Deposit (₹)</Label>
              <Input
                id="deposit"
                type="number"
                min={0}
                step="0.01"
                placeholder={newTotals.deposit.toFixed(2)}
                value={newDepositAmount}
                onChange={(e) => {
                  setNewDepositAmount(e.target.value);
                  setIsNewDepositOverridden(true);
                }}
              />
              <p className="text-xs text-muted-foreground">Leave blank to use auto-calculated deposit of ₹{newTotals.deposit.toFixed(2)}.</p>
            </div>

            <div className="bg-muted p-3 rounded-md space-y-1">
              <div className="flex justify-between text-sm">
                <span>Estimated Rent ({calculateMonthsRented(new Date(newStartDate), new Date(newEndDate)).toFixed(1)} mo)</span>
                <span>₹{newTotals.rent.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Total Security Deposit</span>
                <span>₹{newTotals.deposit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1 border-t">
                <span>Grand Total (Rent + Deposit)</span>
                <span>₹{newTotals.total.toFixed(2)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Rental'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Rental #{editRentalId}</DialogTitle>
            <DialogDescription>Modify items, quantity, or end date for this rental.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-edit">Customer</Label>
              <Input 
                id="customer-edit" 
                value={editRentalData?.Customer ? `${editRentalData.Customer.firstName} ${editRentalData.Customer.lastName}` : ""} 
                disabled 
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="xs" onClick={() => setEditItems([...editItems, { itemId: "", quantity: 1 }])} className="gap-1">
                  <Plus className="size-3" /> Add Item
                </Button>
              </div>
              
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                {editItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end border p-3 rounded-md bg-muted/30 relative group">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground">Select Item</Label>
                      <select 
                        className="w-full p-2 border rounded-md bg-background text-sm" 
                        value={item.itemId} 
                        onChange={(e) => {
                          const updated = [...editItems];
                          updated[index] = { ...updated[index], itemId: e.target.value === "" ? "" : Number(e.target.value) };
                          setEditItems(updated);
                        }}
                        required
                      >
                        <option value="">Select an item</option>
                        {allItems.map((it: any) => (
                          <option key={it.id} value={it.id}>{it.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24 space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground">Quantity</Label>
                      <Input 
                        type="number" 
                        min={0} 
                        value={item.quantity} 
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val === 0) {
                            if (window.confirm("Setting quantity to 0 will remove this item. Continue?")) {
                              const updated = [...editItems];
                              updated.splice(index, 1);
                              setEditItems(updated);
                              return;
                            } else {
                              return;
                            }
                          }
                          const updated = [...editItems];
                          updated[index] = { ...updated[index], quantity: val };
                          setEditItems(updated);
                        }} 
                        required
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive h-9 w-9" 
                      onClick={() => {
                        if (window.confirm("Are you sure you want to remove this item?")) {
                          const updated = [...editItems];
                          updated.splice(index, 1);
                          setEditItems(updated);
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-edit">Start Date (Read-only)</Label>
                <Input id="start-edit" type="date" value={editRentalData?.startDate ? new Date(editRentalData.startDate).toISOString().slice(0,10) : ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-edit">End Date</Label>
                <Input id="end-edit" type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit-edit">Deposit (₹)</Label>
              <Input
                id="deposit-edit"
                type="number"
                min={0}
                step="0.01"
                placeholder={editTotals.deposit.toFixed(2)}
                value={editDepositAmount}
                onChange={(e) => {
                  setEditDepositAmount(e.target.value);
                  setIsEditDepositOverridden(true);
                }}
              />
              <p className="text-xs text-muted-foreground">Leave blank to use auto-calculated deposit of ₹{editTotals.deposit.toFixed(2)}.</p>
            </div>

            <div className="bg-muted p-3 rounded-md space-y-1">
              <div className="flex justify-between text-sm">
                <span>Estimated Rent ({calculateMonthsRented(new Date(editRentalData?.startDate || new Date()), new Date(editEndDate)).toFixed(1)} mo)</span>
                <span>₹{editTotals.rent.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Total Security Deposit</span>
                <span>₹{editTotals.deposit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1 border-t">
                <span>Grand Total (Rent + Deposit)</span>
                <span>₹{editTotals.total.toFixed(2)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isExtending}>{isExtending ? 'Updating...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={(open) => {
        setViewOpen(open);
        if (!open) setIsNewlyCreated(false);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rental Details - Rental #{selectedRental?.id}</DialogTitle>
            <DialogDescription>Detailed view of the rental and its items.</DialogDescription>
          </DialogHeader>
          {selectedRental && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-semibold">
                    {selectedRental.Customer 
                      ? `${selectedRental.Customer.firstName} ${selectedRental.Customer.lastName}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedRental.status === "active" 
                      ? "bg-blue-100 text-blue-800" 
                      : selectedRental.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : selectedRental.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : selectedRental.status === "pending" || selectedRental.status === "created"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                  }`}>
                    {selectedRental.status}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-semibold">{new Date(selectedRental.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-semibold">{new Date(selectedRental.endDate).toLocaleDateString()}</p>
                </div>
                {(selectedRental.status === "created" || selectedRental.status === "pending" || isNewlyCreated) && (
                  <div>
                    <p className="text-muted-foreground">Payable Deposit</p>
                    <p className="font-semibold">₹{Number(selectedRental.depositAmount).toFixed(2)}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Rented Items</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRental.RentalItems?.map((ri: any) => (
                        <TableRow key={ri.id}>
                          <TableCell>{ri.Item?.name || `Item ${ri.itemId}`}</TableCell>
                          <TableCell>{ri.quantity}</TableCell>
                        </TableRow>
                      ))}
                      {(!selectedRental.RentalItems || selectedRental.RentalItems.length === 0) && (
                        <TableRow>
                          <TableCell>{selectedRental.Item?.name || "N/A"}</TableCell>
                          <TableCell>{selectedRental.quantity}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button
              variant="outline"
              className="text-blue-600 gap-1"
              onClick={() => {
                setViewOpen(false);
                handleEdit(selectedRental);
              }}
            >
              <Pencil className="size-4" /> Edit Rental
            </Button>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
