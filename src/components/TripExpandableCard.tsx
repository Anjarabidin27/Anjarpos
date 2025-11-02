import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, Trash2, Calendar, MapPin, Bus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { TripPriceNoteDialog } from "./TripPriceNoteDialog";
import { TripDestinationNoteDialog } from "./TripDestinationNoteDialog";

interface PriceNote {
  id: string;
  keterangan: string;
  jumlah: number;
}

interface DestinationNote {
  destinasi_1: string;
  destinasi_2: string | null;
  destinasi_3: string | null;
  destinasi_4: string | null;
  destinasi_5: string | null;
  destinasi_6: string | null;
}

interface Trip {
  id: string;
  nama_trip: string;
  tanggal: string;
  tujuan: string;
  nama_kendaraan?: string;
  jumlah_penumpang?: number;
  catatan?: string;
}

interface TripExpandableCardProps {
  trip: Trip;
  onClick: () => void;
}

export const TripExpandableCard = ({ trip, onClick }: TripExpandableCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [priceNotes, setPriceNotes] = useState<PriceNote[]>([]);
  const [destinationNote, setDestinationNote] = useState<DestinationNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [destDialogOpen, setDestDialogOpen] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadNotes();
    }
  }, [isExpanded, trip.id]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load price notes
      const { data: priceData, error: priceError } = await supabase
        .from("trip_price_notes")
        .select("*")
        .eq("trip_id", trip.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (priceError) throw priceError;
      setPriceNotes(priceData || []);

      // Load destination note
      const { data: destData, error: destError } = await supabase
        .from("trip_destination_notes")
        .select("*")
        .eq("trip_id", trip.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (destError) throw destError;
      setDestinationNote(destData);
    } catch (error: any) {
      console.error("Error loading notes:", error);
      toast.error("Gagal memuat catatan");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePriceNote = async (id: string) => {
    if (!confirm("Hapus catatan ini?")) return;

    try {
      const { error } = await supabase
        .from("trip_price_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Catatan berhasil dihapus");
      loadNotes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus catatan");
    }
  };

  const totalPriceNotes = priceNotes.reduce((sum, note) => sum + Number(note.jumlah), 0);

  const destinationList = destinationNote
    ? [
        destinationNote.destinasi_1,
        destinationNote.destinasi_2,
        destinationNote.destinasi_3,
        destinationNote.destinasi_4,
        destinationNote.destinasi_5,
        destinationNote.destinasi_6,
      ].filter(Boolean)
    : [];

  return (
    <>
      <Card className="overflow-hidden animate-slide-up">
        <div
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={(e) => {
            // Only expand/collapse if not clicking on buttons
            const target = e.target as HTMLElement;
            if (!target.closest('button')) {
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1" onClick={onClick}>
              <h3 className="font-semibold text-lg mb-2">{trip.nama_trip}</h3>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <Calendar className="w-4 h-4 mr-2" />
                {format(new Date(trip.tanggal), "dd MMMM yyyy", { locale: id })}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2" />
                {trip.tujuan}
              </div>
              {trip.nama_kendaraan && (
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Bus className="w-4 h-4 mr-2" />
                  {trip.nama_kendaraan}
                  {trip.jumlah_penumpang && ` (${trip.jumlah_penumpang} penumpang)`}
                </div>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t px-4 pb-4">
            {/* Catatan Destinasi Section */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Catatan Destinasi</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDestDialogOpen(true)}
                  className="h-7 text-xs"
                >
                  {destinationNote ? "Edit" : "Tambah"}
                </Button>
              </div>
              {destinationList.length > 0 ? (
                <div className="space-y-1">
                  {destinationList.map((dest, idx) => (
                    <div key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground">{idx + 1}.</span>
                      <span>{dest}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Belum ada catatan destinasi</p>
              )}
            </div>

            {/* Catatan Harga Section */}
            <div className="pt-4 mt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Catatan Harga</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPriceDialogOpen(true)}
                  className="h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Tambah
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                </div>
              ) : priceNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada catatan harga</p>
              ) : (
                <div className="space-y-2">
                  {priceNotes.map((note) => (
                    <div key={note.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{note.keterangan}</p>
                        <p className="text-primary font-semibold">{formatRupiah(Number(note.jumlah))}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeletePriceNote(note.id)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="pt-2 border-t flex justify-between font-semibold text-sm">
                    <span>Total:</span>
                    <span className="text-primary">{formatRupiah(totalPriceNotes)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <TripPriceNoteDialog
        open={priceDialogOpen}
        onOpenChange={setPriceDialogOpen}
        tripId={trip.id}
        onSuccess={loadNotes}
      />

      <TripDestinationNoteDialog
        open={destDialogOpen}
        onOpenChange={setDestDialogOpen}
        tripId={trip.id}
        onSuccess={loadNotes}
      />
    </>
  );
};
