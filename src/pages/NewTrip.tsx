import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const NewTrip = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama_trip: "",
    tanggal: "",
    tanggal_selesai: "",
    tujuan: "",
    catatan: "",
    nama_kendaraan: "",
    jumlah_penumpang: "",
    budget_estimasi: "",
    nomor_polisi: "",
    nama_driver: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("trips")
        .insert({
          nama_trip: formData.nama_trip,
          tanggal: formData.tanggal,
          tanggal_selesai: formData.tanggal_selesai || null,
          tujuan: formData.tujuan,
          catatan: formData.catatan || null,
          nama_kendaraan: formData.nama_kendaraan || null,
          jumlah_penumpang: formData.jumlah_penumpang ? parseInt(formData.jumlah_penumpang) : null,
          budget_estimasi: formData.budget_estimasi ? parseFloat(formData.budget_estimasi) : null,
          nomor_polisi: formData.nomor_polisi || null,
          nama_driver: formData.nama_driver || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Trip berhasil ditambahkan!");
      
      // Navigate to select destinations page
      navigate("/destinations/select", { state: { tripId: data.id } });
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menambahkan trip");
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
            onClick={() => navigate("/trips")}
            className="mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <h1 className="text-2xl font-bold mb-6">Tambah Trip Baru</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="ios-card p-5">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nama_trip">Nama Trip</Label>
                  <Input
                    id="nama_trip"
                    value={formData.nama_trip}
                    onChange={(e) => setFormData({ ...formData, nama_trip: e.target.value })}
                    placeholder="Contoh: Trip Jakarta - Bandung"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tanggal">Tanggal Mulai</Label>
                  <Input
                    id="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tanggal_selesai">Tanggal Selesai (Opsional)</Label>
                  <Input
                    id="tanggal_selesai"
                    type="date"
                    value={formData.tanggal_selesai}
                    onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                    min={formData.tanggal}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tujuan">Tujuan</Label>
                  <Input
                    id="tujuan"
                    value={formData.tujuan}
                    onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
                    placeholder="Contoh: Bandung"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="nama_kendaraan">Nama Kendaraan/Bus</Label>
                  <Input
                    id="nama_kendaraan"
                    value={formData.nama_kendaraan}
                    onChange={(e) => setFormData({ ...formData, nama_kendaraan: e.target.value })}
                    placeholder="Contoh: Bus Pariwisata Eka"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="nomor_polisi">Nomor Polisi (Opsional)</Label>
                  <Input
                    id="nomor_polisi"
                    value={formData.nomor_polisi}
                    onChange={(e) => setFormData({ ...formData, nomor_polisi: e.target.value })}
                    placeholder="Contoh: B 1234 ABC"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="nama_driver">Nama Driver (Opsional)</Label>
                  <Input
                    id="nama_driver"
                    value={formData.nama_driver}
                    onChange={(e) => setFormData({ ...formData, nama_driver: e.target.value })}
                    placeholder="Contoh: Budi Santoso"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="jumlah_penumpang">Jumlah Penumpang (Opsional)</Label>
                  <Input
                    id="jumlah_penumpang"
                    type="number"
                    value={formData.jumlah_penumpang}
                    onChange={(e) => setFormData({ ...formData, jumlah_penumpang: e.target.value })}
                    placeholder="Contoh: 40"
                    min="1"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="budget_estimasi">Budget Estimasi (Opsional)</Label>
                  <Input
                    id="budget_estimasi"
                    type="number"
                    value={formData.budget_estimasi}
                    onChange={(e) => setFormData({ ...formData, budget_estimasi: e.target.value })}
                    placeholder="Contoh: 5000000"
                    min="0"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="catatan">Catatan (Opsional)</Label>
                  <Textarea
                    id="catatan"
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    placeholder="Tambahkan catatan trip..."
                    rows={4}
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
              {loading ? "Menyimpan..." : "Simpan Trip"}
            </Button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
};

export default NewTrip;
