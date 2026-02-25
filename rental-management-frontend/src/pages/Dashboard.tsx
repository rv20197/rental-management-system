import { useMemo } from "react";
import { useGetBillingsQuery } from "../api/billingApi";
import { useGetRentalsQuery } from "../api/rentalApi";
import { useGetCustomersQuery } from "../api/customerApi";
import { useGetItemsQuery } from "../api/itemApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Key, Users, Package, ReceiptText, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { data: billings = [], isLoading: isBillingsLoading } = useGetBillingsQuery();
  const { data: rentals = [] } = useGetRentalsQuery();
  const { data: customers = [] } = useGetCustomersQuery();
  const { data: items = [] } = useGetItemsQuery();

  const stats = useMemo(() => [
    { 
      label: "Active Rentals", 
      value: rentals.filter(r => r.status === "active").length, 
      icon: Key,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30"
    },
    { 
      label: "Total Customers", 
      value: customers.length, 
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/30"
    },
    { 
      label: "Items in Stock", 
      value: items.reduce((acc, item) => acc + item.quantity, 0), 
      icon: Package,
      color: "text-orange-600",
      bg: "bg-orange-100 dark:bg-orange-900/30"
    },
    { 
      label: "Pending Bills", 
      value: billings.filter(b => b.status === "pending").length, 
      icon: ReceiptText,
      color: "text-yellow-600",
      bg: "bg-yellow-100 dark:bg-yellow-900/30"
    },
  ], [rentals, customers, items, billings]);

  const totalRevenue = useMemo(() => 
    billings.filter(b => b.status === "paid").reduce((acc, b) => acc + Number(b.amount), 0)
  , [billings]);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back to your rental management overview.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <div className={`${stat.bg} p-2 rounded-md`}>
                  <Icon className={`size-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Billings</CardTitle>
          </CardHeader>
          <CardContent>
            {isBillingsLoading ? (
              <p className="text-sm text-muted-foreground">Loading bills...</p>
            ) : billings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bills yet.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rental ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billings.slice(0, 5).map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-mono text-xs">{bill.rentalId}</TableCell>
                        <TableCell className="font-semibold">₹{Number(bill.amount)?.toFixed(2)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              bill.status === "paid"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : bill.status === "overdue"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            }`}
                          >
                            {bill.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-green-600" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">₹{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">Combined revenue from all paid bills.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
