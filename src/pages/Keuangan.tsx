import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatRupiah } from "@/lib/utils";

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
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<string>("current");

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

      const [keuanganRes, tripsRes] = await Promise.all([
        supabase
          .from("keuangan")
          .select(`*, trips (nama_trip)`)
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false }),
        supabase
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false })
      ]);

      if (keuanganRes.error) throw keuanganRes.error;
      if (tripsRes.error) throw tripsRes.error;
      
      setKeuangan(keuanganRes.data || []);
      setTrips(tripsRes.data || []);
    } catch (error: any) {
      console.error("Error loading keuangan:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data by month
  const filteredKeuangan = keuangan.filter((k) => {
    const kDate = new Date(k.tanggal);
    const today = new Date();
    
    if (filterMonth === "current") {
      return kDate.getMonth() === today.getMonth() && kDate.getFullYear() === today.getFullYear();
    } else if (filterMonth === "last") {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return kDate.getMonth() === lastMonth.getMonth() && kDate.getFullYear() === lastMonth.getFullYear();
    }
    return true; // all
  });

  // Calculate completed vs upcoming trips
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const completedTrips = trips.filter(t => new Date(t.tanggal) < today);
  const upcomingTrips = trips.filter(t => new Date(t.tanggal) >= today);

  // Calculate profit/loss per trip (only for filtered month)
  const tripSummaries = Object.entries(
    filteredKeuangan.reduce((acc, item) => {
      if (!acc[item.trip_id]) {
        const trip = trips.find(t => t.id === item.trip_id);
        acc[item.trip_id] = {
          trip_id: item.trip_id,
          trip_name: item.trips?.nama_trip || "Trip tidak ditemukan",
          trip_date: trip?.tanggal || "",
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
    }, {} as Record<string, { trip_id: string; trip_name: string; trip_date: string; pemasukan: number; pengeluaran: number; saldo: number }>)
  ).map(([_, summary]) => summary)
   .sort((a, b) => new Date(b.trip_date).getTime() - new Date(a.trip_date).getTime());

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-4xl mx-auto p-4">
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

          {/* Month Filter */}
          <div className="mb-6">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Filter Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Bulan Ini</SelectItem>
                <SelectItem value="last">Bulan Lalu</SelectItem>
                <SelectItem value="all">Semua</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Cards - Completed vs Upcoming */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="ios-card p-5 bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="font-semibold text-sm">Trip Selesai</h3>
              </div>
              <p className="text-3xl font-bold text-green-600">{completedTrips.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total trip yang sudah dilaksanakan</p>
            </div>

            <div className="ios-card p-5 bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-sm">Trip Mendatang</h3>
              </div>
              <p className="text-3xl font-bold text-blue-600">{upcomingTrips.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Trip yang akan datang</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
            </div>
          ) : tripSummaries.length === 0 ? (
            <div className="text-center py-12 ios-card">
              <p className="text-muted-foreground mb-4">
                {filterMonth === "all" 
                  ? "Belum ada data keuangan" 
                  : "Belum ada data keuangan untuk periode ini"}
              </p>
              <Button
                onClick={() => navigate("/keuangan/new")}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Transaksi
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold mb-3">Ringkasan Per Trip</h2>
              <div className="space-y-3">
                {tripSummaries.map((summary) => (
                  <div
                    key={summary.trip_id}
                    className="ios-card p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/trips/${summary.trip_id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{summary.trip_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(summary.trip_date), "dd MMM yyyy", { locale: id })}
                        </p>
                      </div>
                      {summary.saldo >= 0 ? (
                        <div className="text-right">
                          <span className="text-xs text-green-600 font-medium">Untung</span>
                          <p className="text-lg font-bold text-green-600">{formatRupiah(summary.saldo)}</p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-xs text-red-600 font-medium">Rugi</span>
                          <p className="text-lg font-bold text-red-600">{formatRupiah(Math.abs(summary.saldo))}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t text-sm">
                      <div>
                        <span className="text-muted-foreground">Pemasukan:</span>
                        <p className="font-semibold text-green-600">{formatRupiah(summary.pemasukan)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pengeluaran:</span>
                        <p className="font-semibold text-red-600">{formatRupiah(summary.pengeluaran)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default Keuangan;
