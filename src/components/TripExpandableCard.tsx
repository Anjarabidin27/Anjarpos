import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Calendar, MapPin } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { TripPriceNoteDialog } from "./TripPriceNoteDialog";
import { TripDestinationNoteDialog } from "./TripDestinationNoteDialog";
import { EditTripDialog } from "./EditTripDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PriceNote {
  id: string;
  keterangan: string;
  jumlah: number;
}

interface DestinationNote {
  catatan: string;
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
  onTripUpdated?: () => void;
}

export const TripExpandableCard = ({ trip, onClick, onTripUpdated }: TripExpandableCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [priceNotes, setPriceNotes] = useState<PriceNote[]>([]);
  const [destinationNote, setDestinationNote] = useState<DestinationNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [destDialogOpen, setDestDialogOpen] = useState(false);
  const [editTripDialogOpen, setEditTripDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [editingPriceNote, setEditingPriceNote] = useState<PriceNote | undefined>();

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

  const handleDeletePriceNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Yakin ingin menghapus catatan harga ini?")) return;

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

  const handleDeleteTrip = async () => {
    try {
      const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", trip.id);

      if (error) throw error;
      toast.success("Trip berhasil dihapus");
      onTripUpdated?.();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus trip");
    }
  };

  const handleEditPriceNote = (note: PriceNote, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPriceNote(note);
    setPriceDialogOpen(true);
  };

  const handleAddPriceNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPriceNote(undefined);
    setPriceDialogOpen(true);
  };

  const destinationList = destinationNote?.catatan
    ? destinationNote.catatan.split('\n').filter(line => line.trim())
    : [];

  return (
    <>
      <Card className="overflow-hidden animate-slide-up">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 cursor-pointer" onClick={onClick}>
                <h3 className="font-semibold text-lg mb-2">{trip.nama_trip}</h3>
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(new Date(trip.tanggal), "dd MMMM yyyy", { locale: id })}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-2" />
                  {trip.tujuan}
                </div>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8"
                >
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <div className="pt-4 space-y-4">
                {/* Catatan Destinasi Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">Catatan Destinasi</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDestDialogOpen(true);
                      }}
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
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">Catatan Harga</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddPriceNote}
                      className="h-7 text-xs"
                    >
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
                        <div key={note.id} className="text-sm p-2 bg-muted/30 rounded">
                          <p className="font-medium">{note.keterangan}</p>
                          <p className="text-primary font-semibold text-xs">Rp {note.jumlah.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </Card>

      <TripPriceNoteDialog
        open={priceDialogOpen}
        onOpenChange={setPriceDialogOpen}
        tripId={trip.id}
        note={editingPriceNote}
        onSuccess={loadNotes}
      />

      <TripDestinationNoteDialog
        open={destDialogOpen}
        onOpenChange={setDestDialogOpen}
        tripId={trip.id}
        onSuccess={loadNotes}
      />

      <EditTripDialog
        open={editTripDialogOpen}
        onOpenChange={setEditTripDialogOpen}
        trip={trip}
        onSuccess={() => {
          loadNotes();
          onTripUpdated?.();
        }}
      />

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus trip "{trip.nama_trip}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTrip} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
