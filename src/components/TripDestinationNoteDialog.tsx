import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TripDestinationNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  onSuccess?: () => void;
}

export const TripDestinationNoteDialog = ({ open, onOpenChange, tripId, onSuccess }: TripDestinationNoteDialogProps) => {
  const [catatan, setCatatan] = useState("");
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
        setCatatan(data.catatan || "");
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
        const { error } = await supabase
          .from("trip_destination_notes")
          .update({ catatan })
          .eq("id", noteId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("trip_destination_notes").insert({
          trip_id: tripId,
          user_id: user.id,
          catatan,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catatan Destinasi</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="catatan">Catatan Destinasi</Label>
            <Textarea
              id="catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Masukkan destinasi yang akan dikunjungi (pisahkan dengan enter)"
              required
              rows={6}
            />
          </div>

          <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
