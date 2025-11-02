import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RupiahInput } from "./RupiahInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TripPriceNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  onSuccess?: () => void;
}

export const TripPriceNoteDialog = ({ open, onOpenChange, tripId, onSuccess }: TripPriceNoteDialogProps) => {
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };

      const { error } = await supabase.from("trip_price_notes").insert({
        trip_id: tripId,
        user_id: user.id,
        keterangan,
        jumlah: unformatRupiah(jumlah),
      });

      if (error) throw error;

      toast.success("Catatan harga berhasil ditambahkan");
      setKeterangan("");
      setJumlah("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menambahkan catatan harga");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Catatan Harga</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              id="keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Kasih uang ke kepala sekolah"
              required
            />
          </div>

          <RupiahInput
            label="Jumlah"
            value={jumlah}
            onChange={setJumlah}
            required
          />

          <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
