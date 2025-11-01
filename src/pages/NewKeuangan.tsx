import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RupiahInput } from "@/components/RupiahInput";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Trip {
  id: string;
  nama_trip: string;
}

const NewKeuangan = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [formData, setFormData] = useState({
    trip_id: "",
    jenis: "",
    jumlah: "",
    keterangan: "",
  });

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trips")
        .select("id, nama_trip")
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error: any) {
      console.error("Error loading trips:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Convert formatted rupiah to number
      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };

      const { error } = await supabase.from("keuangan").insert({
        trip_id: formData.trip_id,
        user_id: user.id,
        jenis: formData.jenis,
        jumlah: unformatRupiah(formData.jumlah),
        keterangan: formData.keterangan || null,
      });

      if (error) throw error;

      toast.success("Transaksi berhasil ditambahkan!");
      navigate("/keuangan");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menambahkan transaksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-lg mx-auto p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/keuangan")}
            className="mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <h1 className="text-2xl font-bold mb-6">Tambah Transaksi</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="ios-card p-5">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="trip_id">Trip</Label>
                  <Select value={formData.trip_id} onValueChange={(value) => setFormData({ ...formData, trip_id: value })} required>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih trip" />
                    </SelectTrigger>
                    <SelectContent>
                      {trips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id}>
                          {trip.nama_trip}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="jenis">Jenis</Label>
                  <Select value={formData.jenis} onValueChange={(value) => setFormData({ ...formData, jenis: value })} required>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pemasukan">Pemasukan</SelectItem>
                      <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <RupiahInput
                  id="jumlah"
                  label="Jumlah"
                  value={formData.jumlah}
                  onChange={(value) => setFormData({ ...formData, jumlah: value })}
                  placeholder="0"
                  required
                />

                <div>
                  <Label htmlFor="keterangan">Keterangan (Opsional)</Label>
                  <Textarea
                    id="keterangan"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    placeholder="Tambahkan keterangan..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-white font-semibold"
              disabled={loading}
            >
              {loading ? "Menyimpan..." : "Simpan Transaksi"}
            </Button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
};

export default NewKeuangan;
