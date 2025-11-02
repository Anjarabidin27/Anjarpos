import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DestinationNote {
  destinasi1: string;
  destinasi2?: string;
  destinasi3?: string;
  destinasi4?: string;
  destinasi5?: string;
  destinasi6?: string;
}

interface TripDestinationsCardProps {
  tripId: string;
  tripName: string;
}

export const TripDestinationsCard = ({ tripId, tripName }: TripDestinationsCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [note, setNote] = useState<DestinationNote>({ destinasi1: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<DestinationNote>({ destinasi1: "" });

  useEffect(() => {
    if (isExpanded) {
      loadNote();
    }
  }, [isExpanded, tripId]);

  const loadNote = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trip_destination_notes")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setNote({
          destinasi1: data.destinasi1 || "",
          destinasi2: data.destinasi2 || "",
          destinasi3: data.destinasi3 || "",
          destinasi4: data.destinasi4 || "",
          destinasi5: data.destinasi5 || "",
          destinasi6: data.destinasi6 || "",
        });
        setFormData({
          destinasi1: data.destinasi1 || "",
          destinasi2: data.destinasi2 || "",
          destinasi3: data.destinasi3 || "",
          destinasi4: data.destinasi4 || "",
          destinasi5: data.destinasi5 || "",
          destinasi6: data.destinasi6 || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading note:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: existing } = await supabase
        .from("trip_destination_notes")
        .select("id")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("trip_destination_notes")
          .update({
            destinasi1: formData.destinasi1,
            destinasi2: formData.destinasi2 || null,
            destinasi3: formData.destinasi3 || null,
            destinasi4: formData.destinasi4 || null,
            destinasi5: formData.destinasi5 || null,
            destinasi6: formData.destinasi6 || null,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("trip_destination_notes").insert({
          trip_id: tripId,
          user_id: user.id,
          destinasi1: formData.destinasi1,
          destinasi2: formData.destinasi2 || null,
          destinasi3: formData.destinasi3 || null,
          destinasi4: formData.destinasi4 || null,
          destinasi5: formData.destinasi5 || null,
          destinasi6: formData.destinasi6 || null,
        });

        if (error) throw error;
      }

      toast.success("Catatan destinasi berhasil disimpan");
      setDialogOpen(false);
      loadNote();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menyimpan catatan destinasi");
    }
  };

  const destinasiArray = [
    note.destinasi1,
    note.destinasi2,
    note.destinasi3,
    note.destinasi4,
    note.destinasi5,
    note.destinasi6,
  ].filter(Boolean);

  return (
    <Card className="p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="font-semibold">Catatan Destinasi</h3>
          <p className="text-sm text-muted-foreground">
            {destinasiArray.length > 0
              ? `${destinasiArray.length} destinasi tercatat`
              : "Belum ada catatan destinasi"}
          </p>
        </div>
        {isExpanded ? <ChevronUp /> : <ChevronDown />}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Daftar Destinasi</h4>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Catatan Destinasi</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Label>Destinasi 1 (Wajib)</Label>
                    <Input
                      value={formData.destinasi1}
                      onChange={(e) =>
                        setFormData({ ...formData, destinasi1: e.target.value })
                      }
                      placeholder="Nama destinasi"
                      required
                    />
                  </div>

                  {[2, 3, 4, 5, 6].map((num) => (
                    <div key={num}>
                      <Label>Destinasi {num} (Opsional)</Label>
                      <Input
                        value={formData[`destinasi${num}` as keyof DestinationNote] || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [`destinasi${num}`]: e.target.value,
                          })
                        }
                        placeholder="Nama destinasi"
                      />
                    </div>
                  ))}

                  <Button type="submit" className="w-full gradient-primary text-white">
                    Simpan
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
            </div>
          ) : destinasiArray.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada destinasi tercatat
            </p>
          ) : (
            <div className="space-y-2">
              {destinasiArray.map((dest, idx) => (
                <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                  <span className="text-xs text-muted-foreground">
                    Destinasi {idx + 1}
                  </span>
                  <p className="text-sm font-medium mt-1">{dest}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
