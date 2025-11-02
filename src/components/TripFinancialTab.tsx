import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { RupiahInput } from "./RupiahInput";

interface FinancialItem {
  id: string;
  jenis: "pemasukan" | "pengeluaran";
  keterangan: string;
  jumlah: number;
  cashback?: number | null;
}

interface TripFinancialTabProps {
  tripId: string;
}

export const TripFinancialTab = ({ tripId }: TripFinancialTabProps) => {
  const [items, setItems] = useState<FinancialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedCashback, setExpandedCashback] = useState<string | null>(null);
  
  // Form state
  const [jenis, setJenis] = useState<"pemasukan" | "pengeluaran">("pengeluaran");
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [hasCashback, setHasCashback] = useState(false);
  const [cashback, setCashback] = useState("");

  useEffect(() => {
    loadFinancialData();

    const channel = supabase
      .channel(`keuangan-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "keuangan", filter: `trip_id=eq.${tripId}` },
        () => loadFinancialData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("keuangan")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error("Error loading financial data:", error);
      toast.error("Gagal memuat data keuangan");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };

      const { error } = await supabase.from("keuangan").insert({
        trip_id: tripId,
        user_id: user.id,
        jenis,
        jumlah: unformatRupiah(jumlah),
        keterangan,
        cashback: hasCashback ? unformatRupiah(cashback) : null,
        tanggal: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Data keuangan berhasil ditambahkan");
      resetForm();
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menambahkan data keuangan");
    }
  };

  const resetForm = () => {
    setJenis("pengeluaran");
    setKeterangan("");
    setJumlah("");
    setHasCashback(false);
    setCashback("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data ini?")) return;

    try {
      const { error } = await supabase.from("keuangan").delete().eq("id", id);
      if (error) throw error;
      toast.success("Data berhasil dihapus");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus data");
    }
  };

  const totalPemasukan = items
    .filter((i) => i.jenis === "pemasukan")
    .reduce((sum, i) => sum + Number(i.jumlah), 0);

  const totalPengeluaran = items
    .filter((i) => i.jenis === "pengeluaran")
    .reduce((sum, i) => sum + Number(i.jumlah), 0);

  const totalCashback = items.reduce((sum, i) => sum + (Number(i.cashback) || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran + totalCashback;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Keuangan</h2>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gradient-primary text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Belum ada data keuangan</p>
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Data
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((item) => {
              const subtotal = item.cashback ? Number(item.jumlah) + Number(item.cashback) : Number(item.jumlah);
              const isExpanded = expandedCashback === item.id;
              
              return (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            item.jenis === "pemasukan"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.jenis}
                        </span>
                        {item.cashback && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-blue-600"
                            onClick={() => setExpandedCashback(isExpanded ? null : item.id)}
                          >
                            {isExpanded ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                            Cashback
                          </Button>
                        )}
                      </div>
                      <p className="text-sm mb-1">{item.keterangan}</p>
                      <p className="text-sm font-semibold text-primary">{formatRupiah(Number(item.jumlah))}</p>
                      
                      {item.cashback && isExpanded && (
                        <div className="mt-2 pt-2 border-t space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cashback:</span>
                            <span className="text-blue-600 font-medium">{formatRupiah(Number(item.cashback))}</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Subtotal:</span>
                            <span className="text-primary">{formatRupiah(subtotal)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-4 bg-muted/50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Pemasukan:</span>
                <span className="font-semibold text-green-600">{formatRupiah(totalPemasukan)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Pengeluaran:</span>
                <span className="font-semibold text-red-600">{formatRupiah(totalPengeluaran)}</span>
              </div>
              {totalCashback > 0 && (
                <div className="flex justify-between">
                  <span>Total Cashback:</span>
                  <span className="font-semibold text-blue-600">{formatRupiah(totalCashback)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t text-base">
                <span>Saldo:</span>
                <span className={saldo >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatRupiah(saldo)}
                </span>
              </div>
            </div>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Data Keuangan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Jenis</Label>
              <Select value={jenis} onValueChange={(v: any) => setJenis(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pemasukan">Pemasukan</SelectItem>
                  <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Keterangan</Label>
              <Textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Tiket masuk 60 orang @ Rp50.000"
                required
              />
            </div>

            <RupiahInput label="Jumlah" value={jumlah} onChange={setJumlah} required />

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasCashback"
                checked={hasCashback}
                onChange={(e) => setHasCashback(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="hasCashback">Ada Cashback?</Label>
            </div>

            {hasCashback && (
              <RupiahInput label="Cashback" value={cashback} onChange={setCashback} />
            )}

            <Button type="submit" className="w-full gradient-primary text-white">
              Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
