import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, TrendingUp, TrendingDown, Download, Share2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { generateReportPDF } from "@/utils/reportPdfGenerator";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

interface ReportData {
  trips: any[];
  keuangan: any[];
  media: any[];
}

const Laporan = () => {
  const [data, setData] = useState<ReportData>({ trips: [], keuangan: [], media: [] });
  const [loading, setLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("current");

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [tripsRes, keuanganRes, mediaRes] = await Promise.all([
        supabase
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false }),
        supabase
          .from("keuangan")
          .select(`*, trips (nama_trip)`)
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false }),
        supabase
          .from("media")
          .select(`*, trips (nama_trip)`)
          .eq("user_id", user.id)
          .eq("file_type", "image"),
      ]);

      setData({
        trips: tripsRes.data || [],
        keuangan: keuanganRes.data || [],
        media: mediaRes.data || [],
      });
    } catch (error: any) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      const doc = generateReportPDF({
        trips: filteredTrips,
        keuangan: filteredKeuangan,
        media: filteredMedia,
        filterTripId: selectedTripId,
      });

      const fileName = `Laporan_Malika_Tour_${format(new Date(), "yyyyMMdd")}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handleSharePDF = async () => {
    try {
      const shareText = `*Laporan Malika Tour*\n\nTotal Trip: ${filteredTrips.length}\nPemasukan: Rp ${totalPemasukan.toLocaleString("id-ID")}\nPengeluaran: Rp ${totalPengeluaran.toLocaleString("id-ID")}\nSaldo: Rp ${(totalPemasukan - totalPengeluaran).toLocaleString("id-ID")}\n\nLaporan lengkap tersedia untuk diunduh.`;
      
      const encodedText = encodeURIComponent(shareText);
      const whatsappUrl = `whatsapp://send?text=${encodedText}`;
      const whatsappWebUrl = `https://wa.me/?text=${encodedText}`;
      
      if (Capacitor.isNativePlatform()) {
        try {
          window.location.href = whatsappUrl;
          toast.success("Membuka WhatsApp...");
        } catch {
          window.open(whatsappWebUrl, '_blank');
        }
      } else {
        window.open(whatsappWebUrl, '_blank');
        toast.success("Membuka WhatsApp Web...");
      }
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      toast.error("Gagal membuka WhatsApp");
    }
  };

  // Filter by month
  const filterDataByMonth = (data: any[], dateField: string) => {
    const today = new Date();
    
    return data.filter((item) => {
      const itemDate = new Date(item[dateField]);
      
      if (filterMonth === "current") {
        return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
      } else if (filterMonth === "last") {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear();
      }
      return true; // all
    });
  };

  // Filter data based on selected trip and month
  let filteredTrips = selectedTripId === "all" ? data.trips : data.trips.filter(t => t.id === selectedTripId);
  let filteredKeuangan = selectedTripId === "all" ? data.keuangan : data.keuangan.filter(k => k.trip_id === selectedTripId);
  const filteredMedia = selectedTripId === "all" ? data.media : data.media.filter(m => m.trip_id === selectedTripId);

  // Apply month filter
  filteredTrips = filterDataByMonth(filteredTrips, 'tanggal');
  filteredKeuangan = filterDataByMonth(filteredKeuangan, 'tanggal');

  // Only show completed trips
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  filteredTrips = filteredTrips.filter(t => new Date(t.tanggal) < today);

  const totalPemasukan = filteredKeuangan
    .filter((k) => k.jenis === "pemasukan")
    .reduce((sum, k) => sum + Number(k.jumlah), 0);

  const totalPengeluaran = filteredKeuangan
    .filter((k) => k.jenis === "pengeluaran")
    .reduce((sum, k) => sum + Number(k.jumlah), 0);
  
  const netResult = totalPemasukan - totalPengeluaran;

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from("trip-media").getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex flex-col gap-4 mb-6 print:hidden">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Laporan</h1>
              <div className="flex gap-2 flex-1">
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Bulan Ini</SelectItem>
                    <SelectItem value="last">Bulan Lalu</SelectItem>
                    <SelectItem value="all">Semua</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                  <SelectTrigger className="flex-1 md:w-[200px]">
                    <SelectValue placeholder="Semua Trip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Trip</SelectItem>
                    {data.trips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.nama_trip}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGeneratePDF} className="gradient-primary text-white flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={handleSharePDF} variant="outline" className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Bagikan
              </Button>
            </div>
          </div>

          {/* Print Header */}
          <div className="hidden print:block mb-8 text-center border-b pb-4">
            <h1 className="text-3xl font-bold text-primary mb-2">Malika Tour</h1>
            <p className="text-lg">Laporan Trip & Keuangan</p>
            <p className="text-sm text-muted-foreground">
              Dicetak pada {format(new Date(), "dd MMMM yyyy, HH:mm", { locale: id })}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="ios-card p-5">
              <h3 className="text-sm text-muted-foreground mb-1">Trip Selesai</h3>
              <p className="text-3xl font-bold text-primary">{filteredTrips.length}</p>
            </div>

            <div className="ios-card p-5 bg-green-50">
              <div className="flex items-center mb-1">
                <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
                <h3 className="text-sm text-muted-foreground">Pemasukan</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatRupiah(totalPemasukan)}
              </p>
            </div>

            <div className="ios-card p-5 bg-red-50">
              <div className="flex items-center mb-1">
                <TrendingDown className="w-4 h-4 text-red-600 mr-2" />
                <h3 className="text-sm text-muted-foreground">Pengeluaran</h3>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatRupiah(totalPengeluaran)}
              </p>
            </div>

            <div className={`ios-card p-5 ${netResult >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <h3 className="text-sm text-muted-foreground mb-1">
                {netResult >= 0 ? "Total Untung" : "Total Rugi"}
              </h3>
              <p className={`text-2xl font-bold ${netResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatRupiah(Math.abs(netResult))}
              </p>
            </div>
          </div>

          {/* Trips Report */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Riwayat Trip</h2>
            <div className="ios-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3">Nama Trip</th>
                    <th className="text-left p-3">Tanggal</th>
                    <th className="text-left p-3">Tujuan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((trip) => (
                    <tr key={trip.id} className="border-t">
                      <td className="p-3">{trip.nama_trip}</td>
                      <td className="p-3">{format(new Date(trip.tanggal), "dd MMM yyyy", { locale: id })}</td>
                      <td className="p-3">{trip.tujuan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Financial Report */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Riwayat Keuangan</h2>
            <div className="ios-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3">Tanggal</th>
                    <th className="text-left p-3">Trip</th>
                    <th className="text-left p-3">Keterangan</th>
                    <th className="text-right p-3">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeuangan.map((k) => (
                    <tr key={k.id} className="border-t">
                      <td className="p-3 text-sm">{format(new Date(k.tanggal), "dd MMM", { locale: id })}</td>
                      <td className="p-3 text-sm">{k.trips?.nama_trip}</td>
                      <td className="p-3 text-sm">{k.keterangan || "-"}</td>
                      <td className={`p-3 text-right font-semibold ${k.jenis === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
                        {k.jenis === "pemasukan" ? "+" : "-"}{formatRupiah(Number(k.jumlah))}
                      </td>
                    </tr>
                  ))}
                  <tr className={`border-t-2 border-primary font-bold ${netResult >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                    <td colSpan={3} className="p-3">{netResult >= 0 ? "Total Untung" : "Total Rugi"}</td>
                    <td className={`p-3 text-right ${netResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatRupiah(Math.abs(netResult))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Gallery */}
          {filteredMedia.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">Galeri Foto</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredMedia.map((m) => (
                  <div key={m.id} className="ios-card overflow-hidden">
                    <img
                      src={getMediaUrl(m.file_path)}
                      alt={m.file_name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-2 text-xs text-muted-foreground">
                      {m.trips?.nama_trip}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <BottomNav />
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm 1.5cm;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </AuthGuard>
  );
};

export default Laporan;
