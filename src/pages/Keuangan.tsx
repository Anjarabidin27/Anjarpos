import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { RingkasanPerTrip } from "@/components/RingkasanPerTrip";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Keuangan {
  id: string;
  trip_id: string;
  jenis: string;
  jumlah: number;
  keterangan: string | null;
  tanggal: string;
  trips: {
    nama_trip: string;
  };
}

const Keuangan = () => {
  const navigate = useNavigate();
  const [keuangan, setKeuangan] = useState<Keuangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"semua" | "pemasukan" | "pengeluaran">("semua");

  useEffect(() => {
    loadKeuangan();

    const channel = supabase
      .channel("keuangan-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "keuangan" },
        () => loadKeuangan()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadKeuangan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("keuangan")
        .select(`
          *,
          trips (
            nama_trip
          )
        `)
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false });

      if (error) throw error;
      setKeuangan(data || []);
    } catch (error: any) {
      console.error("Error loading keuangan:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = keuangan.filter((item) => {
    if (filter === "semua") return true;
    return item.jenis === filter;
  });

  // Group by trip and calculate summary
  const tripSummaries = Object.entries(
    keuangan.reduce((acc, item) => {
      if (!acc[item.trip_id]) {
        acc[item.trip_id] = {
          trip_id: item.trip_id,
          trip_name: item.trips?.nama_trip || "Trip tidak ditemukan",
          pemasukan: 0,
          pengeluaran: 0,
          saldo: 0,
        };
      }
      if (item.jenis === "pemasukan") {
        acc[item.trip_id].pemasukan += Number(item.jumlah);
      } else {
        acc[item.trip_id].pengeluaran += Number(item.jumlah);
      }
      acc[item.trip_id].saldo = acc[item.trip_id].pemasukan - acc[item.trip_id].pengeluaran;
      return acc;
    }, {} as Record<string, { trip_id: string; trip_name: string; pemasukan: number; pengeluaran: number; saldo: number }>)
  ).map(([_, summary]) => summary);

  const totalPemasukan = keuangan
    .filter((k) => k.jenis === "pemasukan")
    .reduce((sum, k) => sum + Number(k.jumlah), 0);

  const totalPengeluaran = keuangan
    .filter((k) => k.jenis === "pengeluaran")
    .reduce((sum, k) => sum + Number(k.jumlah), 0);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Keuangan</h1>
            <Button
              onClick={() => navigate("/keuangan/new")}
              className="gradient-primary text-white"
              size="icon"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          {/* Ringkasan Per Trip */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Ringkasan Per Trip</h2>
            <RingkasanPerTrip summaries={tripSummaries} />
          </div>

          <div className="flex gap-2 mb-4">
            {(["semua", "pemasukan", "pengeluaran"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className={filter === f ? "gradient-primary text-white" : ""}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Belum ada data keuangan</p>
              <Button
                onClick={() => navigate("/keuangan/new")}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Transaksi
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData.map((item) => (
                <div key={item.id} className="ios-card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium mb-1">{item.keterangan || "Tidak ada keterangan"}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.trips?.nama_trip || "Trip tidak ditemukan"}
                      </p>
                    </div>
                    <span
                      className={`font-bold text-lg ${
                        item.jenis === "pemasukan" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {item.jenis === "pemasukan" ? "+" : "-"}Rp{" "}
                      {Number(item.jumlah).toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(item.tanggal), "dd MMM yyyy, HH:mm", { locale: id })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default Keuangan;
