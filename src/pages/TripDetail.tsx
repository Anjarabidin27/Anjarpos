import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { RundownAcara } from "@/components/RundownAcara";
import { TripFinancialTab } from "@/components/TripFinancialTab";
import { TripDocumentationTab } from "@/components/TripDocumentationTab";
import NoteDialog from "@/components/NoteDialog";
import { TripPriceNoteDialog } from "@/components/TripPriceNoteDialog";
import { TripDestinationNoteDialog } from "@/components/TripDestinationNoteDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, MapPin, Plus, StickyNote, Bus, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatRupiah } from "@/lib/utils";

interface Trip {
  id: string;
  nama_trip: string;
  tanggal: string;
  tanggal_selesai: string | null;
  tujuan: string;
  catatan: string | null;
  nama_kendaraan: string | null;
  jumlah_penumpang: number | null;
  nomor_polisi: string | null;
  nama_driver: string | null;
  budget_estimasi: number | null;
}

interface Note {
  id: string;
  judul: string;
  konten: string;
  created_at: string;
}

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

const TripDetail = () => {
  const { id: tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [priceNotes, setPriceNotes] = useState<PriceNote[]>([]);
  const [destinationNote, setDestinationNote] = useState<DestinationNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [priceNoteDialogOpen, setPriceNoteDialogOpen] = useState(false);
  const [destNoteDialogOpen, setDestNoteDialogOpen] = useState(false);

  useEffect(() => {
    if (tripId) {
      loadTripData();

      const channel = supabase
        .channel(`trip-${tripId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notes", filter: `trip_id=eq.${tripId}` },
          () => loadNotes()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trip_price_notes", filter: `trip_id=eq.${tripId}` },
          () => loadPriceNotes()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trip_destination_notes", filter: `trip_id=eq.${tripId}` },
          () => loadDestinationNote()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tripId]);

  const loadTripData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tripId) return;

      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .eq("user_id", user.id)
        .single();

      if (tripError) throw tripError;
      setTrip(tripData);

      await Promise.all([loadNotes(), loadPriceNotes(), loadDestinationNote()]);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal memuat data trip");
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tripId) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error("Error loading notes:", error);
    }
  };

  const loadPriceNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tripId) return;

      const { data, error } = await supabase
        .from("trip_price_notes")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPriceNotes(data || []);
    } catch (error: any) {
      console.error("Error loading price notes:", error);
    }
  };

  const loadDestinationNote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tripId) return;

      const { data, error } = await supabase
        .from("trip_destination_notes")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setDestinationNote(data);
    } catch (error: any) {
      console.error("Error loading destination note:", error);
    }
  };

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

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AuthGuard>
    );
  }

  if (!trip) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <p>Trip tidak ditemukan</p>
        </div>
      </AuthGuard>
    );
  }

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

          {/* Trip Header */}
          <div className="ios-card p-5 mb-6">
            <h1 className="text-2xl font-bold mb-4">{trip.nama_trip}</h1>

            <div className="space-y-2">
              <div className="flex items-center text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2" />
                {format(new Date(trip.tanggal), "dd MMMM yyyy", { locale: id })}
                {trip.tanggal_selesai && (
                  <> - {format(new Date(trip.tanggal_selesai), "dd MMMM yyyy", { locale: id })}</>
                )}
              </div>

              <div className="flex items-center text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2" />
                {trip.tujuan}
              </div>

              {trip.nama_kendaraan && (
                <div className="flex items-center text-muted-foreground">
                  <Bus className="w-4 h-4 mr-2" />
                  {trip.nama_kendaraan}
                  {trip.nomor_polisi && ` - ${trip.nomor_polisi}`}
                  {trip.nama_driver && ` (Driver: ${trip.nama_driver})`}
                </div>
              )}

              {trip.jumlah_penumpang && (
                <div className="flex items-center text-muted-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  {trip.jumlah_penumpang} penumpang
                </div>
              )}

              {trip.budget_estimasi && (
                <div className="flex items-center text-muted-foreground">
                  <span className="mr-2">💰</span>
                  Budget: {formatRupiah(Number(trip.budget_estimasi))}
                </div>
              )}
            </div>

            {trip.catatan && (
              <div className="pt-4 border-t mt-4">
                <p className="text-sm text-muted-foreground">{trip.catatan}</p>
              </div>
            )}
          </div>

          {/* 5 Navbar Tabs */}
          <Tabs defaultValue="acuan" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4 h-auto">
              <TabsTrigger value="acuan" className="text-xs px-1">Acuan</TabsTrigger>
              <TabsTrigger value="keuangan" className="text-xs px-1">Keuangan</TabsTrigger>
              <TabsTrigger value="rundown" className="text-xs px-1">Rundown</TabsTrigger>
              <TabsTrigger value="catatan" className="text-xs px-1">Catatan</TabsTrigger>
              <TabsTrigger value="dokumentasi" className="text-xs px-1">Dokumentasi</TabsTrigger>
            </TabsList>

            {/* Tab 1: Acuan / Catatan Sebelum Keberangkatan */}
            <TabsContent value="acuan" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Catatan Destinasi</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDestNoteDialogOpen(true)}
                  >
                    {destinationNote ? "Edit" : "Tambah"}
                  </Button>
                </div>
                {destinationList.length > 0 ? (
                  <Card className="p-4">
                    <div className="space-y-2">
                      {destinationList.map((dest, idx) => (
                        <div key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-muted-foreground font-medium">{idx + 1}.</span>
                          <span>{dest}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground text-sm">Belum ada catatan destinasi</p>
                  </Card>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Catatan Harga</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPriceNoteDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Tambah
                  </Button>
                </div>
                {priceNotes.length > 0 ? (
                  <div className="space-y-2">
                    {priceNotes.map((note) => (
                      <Card key={note.id} className="p-3">
                        <p className="text-sm mb-1">{note.keterangan}</p>
                        <p className="text-primary font-semibold">{formatRupiah(Number(note.jumlah))}</p>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground text-sm">Belum ada catatan harga</p>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Tab 2: Keuangan */}
            <TabsContent value="keuangan">
              <TripFinancialTab tripId={tripId!} />
            </TabsContent>

            {/* Tab 3: Rundown */}
            <TabsContent value="rundown">
              <h2 className="text-lg font-semibold mb-4">Rundown Acara</h2>
              <RundownAcara tripId={tripId!} />
            </TabsContent>

            {/* Tab 4: Catatan Kegiatan */}
            <TabsContent value="catatan" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Catatan Kegiatan</h2>
                <Button
                  className="gradient-primary text-white"
                  onClick={() => setNoteDialogOpen(true)}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>

              {notes.length === 0 ? (
                <Card className="p-8 text-center">
                  <StickyNote className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Belum ada catatan kegiatan</p>
                  <Button
                    onClick={() => setNoteDialogOpen(true)}
                    className="gradient-primary text-white"
                  >
                    Tambah Catatan
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <Card key={note.id} className="p-4">
                      <h3 className="font-semibold mb-2">{note.judul}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                        {note.konten}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab 5: Dokumentasi */}
            <TabsContent value="dokumentasi">
              <TripDocumentationTab tripId={tripId!} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <NoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          tripId={tripId}
          onSuccess={loadNotes}
        />

        <TripPriceNoteDialog
          open={priceNoteDialogOpen}
          onOpenChange={setPriceNoteDialogOpen}
          tripId={tripId!}
          onSuccess={loadPriceNotes}
        />

        <TripDestinationNoteDialog
          open={destNoteDialogOpen}
          onOpenChange={setDestNoteDialogOpen}
          tripId={tripId!}
          onSuccess={loadDestinationNote}
        />

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default TripDetail;
