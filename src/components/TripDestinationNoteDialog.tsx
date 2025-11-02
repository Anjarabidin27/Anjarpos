import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TripDestinationNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  onSuccess?: () => void;
}

export const TripDestinationNoteDialog = ({ open, onOpenChange, tripId, onSuccess }: TripDestinationNoteDialogProps) => {
  const [destinations, setDestinations] = useState({
    destinasi_1: "",
    destinasi_2: "",
    destinasi_3: "",
    destinasi_4: "",
    destinasi_5: "",
    destinasi_6: "",
  });
  const [loading, setLoading] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadExistingNote();
    }
  }, [open, tripId]);

  const loadExistingNote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trip_destination_notes")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setNoteId(data.id);
        setDestinations({
          destinasi_1: data.destinasi_1 || "",
          destinasi_2: data.destinasi_2 || "",
          destinasi_3: data.destinasi_3 || "",
          destinasi_4: data.destinasi_4 || "",
          destinasi_5: data.destinasi_5 || "",
          destinasi_6: data.destinasi_6 || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading note:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (noteId) {
        // Update existing
        const { error } = await supabase
          .from("trip_destination_notes")
          .update(destinations)
          .eq("id", noteId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("trip_destination_notes").insert({
          trip_id: tripId,
          user_id: user.id,
          ...destinations,
        });

        if (error) throw error;
      }

      toast.success("Catatan destinasi berhasil disimpan");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menyimpan catatan destinasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catatan Destinasi</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="dest1">Destinasi 1 *</Label>
            <Input
              id="dest1"
              value={destinations.destinasi_1}
              onChange={(e) => setDestinations({ ...destinations, destinasi_1: e.target.value })}
              placeholder="Wajib diisi"
              required
            />
          </div>
          
          {[2, 3, 4, 5, 6].map((num) => (
            <div key={num}>
              <Label htmlFor={`dest${num}`}>Destinasi {num} (Opsional)</Label>
              <Input
                id={`dest${num}`}
                value={destinations[`destinasi_${num}` as keyof typeof destinations]}
                onChange={(e) => setDestinations({ ...destinations, [`destinasi_${num}`]: e.target.value })}
                placeholder="Opsional"
              />
            </div>
          ))}

          <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
