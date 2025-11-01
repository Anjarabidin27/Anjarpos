import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import NoteDialog from "@/components/NoteDialog";
import DestinationDialog from "@/components/DestinationDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Trash2, Download, Calendar, MapPin, Plus, Pencil, StickyNote, MapPinned } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Trip {
  id: string;
  nama_trip: string;
  tanggal: string;
  tujuan: string;
  catatan: string | null;
}

interface Media {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  created_at: string;
}

interface TripDestination {
  id: string;
  hari_ke: number;
  jam_mulai: string | null;
  jam_selesai: string | null;
  urutan: number;
  catatan: string | null;
  destinations?: {
    nama_destinasi: string;
    lokasi: string;
    kategori: string;
  };
}

interface Note {
  id: string;
  judul: string;
  konten: string;
  created_at: string;
}

interface AllDestination {
  id: string;
  nama_destinasi: string;
  deskripsi: string;
  kategori: string;
  lokasi: string;
  durasi_standar: number;
  estimasi_biaya: number;
}

const TripDetail = () => {
  const { id: tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [destinations, setDestinations] = useState<TripDestination[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [allDestinations, setAllDestinations] = useState<AllDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [destinationDialogOpen, setDestinationDialogOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<AllDestination | undefined>();

  useEffect(() => {
    if (tripId) {
      loadTripData();

      const channel = supabase
        .channel(`trip-${tripId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "media", filter: `trip_id=eq.${tripId}` },
          () => loadMedia()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trip_destinations", filter: `trip_id=eq.${tripId}` },
          () => loadDestinations()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notes", filter: `trip_id=eq.${tripId}` },
          () => loadNotes()
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

      await Promise.all([loadMedia(), loadDestinations(), loadNotes(), loadAllDestinations()]);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal memuat data trip");
    } finally {
      setLoading(false);
    }
  };

  const loadMedia = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tripId) return;

      const { data, error } = await supabase
        .from("media")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMedia(data || []);
    } catch (error: any) {
      console.error("Error loading media:", error);
    }
  };

  const loadDestinations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tripId) return;

      const { data: destData, error } = await supabase
        .from("trip_destinations")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .order("hari_ke")
        .order("urutan");

      if (error) throw error;

      // Manual join with destinations table
      const destsWithInfo = await Promise.all(
        (destData || []).map(async (dest) => {
          const { data: destInfo } = await supabase
            .from("destinations")
            .select("nama_destinasi, lokasi, kategori")
            .eq("id", dest.destination_id)
            .single();
          
          return { ...dest, destinations: destInfo };
        })
      );

      setDestinations(destsWithInfo);
    } catch (error: any) {
      console.error("Error loading destinations:", error);
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

  const loadAllDestinations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllDestinations(data || []);
    } catch (error: any) {
      console.error("Error loading all destinations:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !tripId) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const fileType = file.type.startsWith("video") ? "video" : "image";

        // Upload ke storage
        const { error: uploadError } = await supabase.storage
          .from("trip-media")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Simpan metadata ke database
        const { error: dbError } = await supabase.from("media").insert({
          trip_id: tripId,
          user_id: user.id,
          file_path: fileName,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
        });

        if (dbError) throw dbError;
      }

      toast.success("File berhasil diupload");
      await loadMedia();
    } catch (error: any) {
      console.error("Error uploading:", error);
      toast.error("Gagal upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string, filePath: string) => {
    if (!confirm("Hapus file ini?")) return;

    try {
      // Hapus dari storage
      const { error: storageError } = await supabase.storage
        .from("trip-media")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Hapus dari database
      const { error: dbError } = await supabase
        .from("media")
        .delete()
        .eq("id", mediaId);

      if (dbError) throw dbError;

      toast.success("File berhasil dihapus");
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error("Gagal menghapus file");
    }
  };

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from("trip-media").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleDeleteDestination = async (id: string) => {
    if (!confirm("Hapus destinasi ini dari trip?")) return;

    try {
      const { error } = await supabase
        .from("trip_destinations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Destinasi berhasil dihapus");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus destinasi");
    }
  };

  const getCategoryColor = (kategori: string) => {
    const colors: Record<string, string> = {
      wisata: "bg-blue-500/10 text-blue-500",
      kuliner: "bg-orange-500/10 text-orange-500",
      belanja: "bg-purple-500/10 text-purple-500",
      sejarah: "bg-amber-500/10 text-amber-500",
      hiburan: "bg-pink-500/10 text-pink-500",
      religi: "bg-green-500/10 text-green-500",
    };
    return colors[kategori] || "bg-gray-500/10 text-gray-500";
  };

  const handleEditDestination = (destination: AllDestination) => {
    setSelectedDestination(destination);
    setDestinationDialogOpen(true);
  };

  const handleAddDestination = () => {
    setSelectedDestination(undefined);
    setDestinationDialogOpen(true);
  };

  const handleDeleteAllDestination = async (id: string) => {
    if (!confirm("Hapus destinasi ini?")) return;

    try {
      const { error } = await supabase
        .from("destinations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Destinasi berhasil dihapus");
      loadAllDestinations();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus destinasi");
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
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

          <div className="ios-card p-5 mb-6">
            <h1 className="text-2xl font-bold mb-4">{trip.nama_trip}</h1>

            <div className="flex items-center text-muted-foreground mb-2">
              <Calendar className="w-4 h-4 mr-2" />
              {format(new Date(trip.tanggal), "dd MMMM yyyy", { locale: id })}
            </div>

            <div className="flex items-center text-muted-foreground mb-4">
              <MapPin className="w-4 h-4 mr-2" />
              {trip.tujuan}
            </div>

            {trip.catatan && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">{trip.catatan}</p>
              </div>
            )}
          </div>

          <Tabs defaultValue="gallery" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="gallery">Galeri</TabsTrigger>
              <TabsTrigger value="destinations">Trip</TabsTrigger>
              <TabsTrigger value="wisata">Wisata</TabsTrigger>
              <TabsTrigger value="notes">Catatan</TabsTrigger>
            </TabsList>

            <TabsContent value="gallery" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Foto & Video</h2>
                <label htmlFor="file-upload">
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <Button
                    className="gradient-primary text-white"
                    disabled={uploading}
                    asChild
                  >
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload"}
                    </span>
                  </Button>
                </label>
              </div>

              {media.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Belum ada foto atau video</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {media.map((item) => (
                    <div key={item.id} className="ios-card overflow-hidden group relative">
                      {item.file_type === "image" ? (
                        <img
                          src={getMediaUrl(item.file_path)}
                          alt={item.file_name}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <video
                          src={getMediaUrl(item.file_path)}
                          className="w-full h-48 object-cover"
                          controls
                        />
                      )}

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={getMediaUrl(item.file_path)}
                          download={item.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="icon" variant="secondary" className="bg-white">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDeleteMedia(item.id, item.file_path)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="destinations" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Destinasi Terpilih</h2>
                <Button
                  className="gradient-primary text-white"
                  onClick={() => navigate("/destinations/select", { state: { tripId } })}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>

              {destinations.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">Belum ada destinasi dipilih</p>
                  <Button
                    onClick={() => navigate("/destinations/select", { state: { tripId } })}
                    className="gradient-primary text-white"
                  >
                    Pilih Destinasi
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {destinations.map((dest) => (
                    <Card key={dest.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold">{dest.destinations?.nama_destinasi}</h3>
                          <p className="text-sm text-muted-foreground">{dest.destinations?.lokasi}</p>
                        </div>
                        <div className="flex gap-1">
                          <Badge className={getCategoryColor(dest.destinations?.kategori || "")}>
                            Hari {dest.hari_ke}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteDestination(dest.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {dest.jam_mulai && dest.jam_selesai && (
                        <p className="text-xs text-muted-foreground">
                          {dest.jam_mulai} - {dest.jam_selesai}
                        </p>
                      )}
                      {dest.catatan && (
                        <p className="text-sm mt-2">{dest.catatan}</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="wisata" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Destinasi Wisata</h2>
                <Button
                  className="gradient-primary text-white"
                  onClick={handleAddDestination}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>

              {allDestinations.length === 0 ? (
                <Card className="p-8 text-center">
                  <MapPinned className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Belum ada destinasi wisata</p>
                  <Button onClick={handleAddDestination} className="gradient-primary text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Destinasi Wisata
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {allDestinations.map((dest) => (
                    <Card key={dest.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{dest.nama_destinasi}</h3>
                          <Badge className={getCategoryColor(dest.kategori)}>
                            {dest.kategori.charAt(0).toUpperCase() + dest.kategori.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditDestination(dest)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteAllDestination(dest.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {dest.deskripsi && (
                        <p className="text-sm text-muted-foreground mb-3">{dest.deskripsi}</p>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {dest.lokasi}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {dest.durasi_standar} menit
                        </div>
                        <div className="flex items-center gap-1">
                          <span>💰</span>
                          {formatRupiah(dest.estimasi_biaya)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Catatan Trip</h2>
                <Button
                  className="gradient-primary text-white"
                  onClick={() => setNoteDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>

              {notes.length === 0 ? (
                <Card className="p-8 text-center">
                  <StickyNote className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Belum ada catatan</p>
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
                        {format(new Date(note.created_at), "dd MMM yyyy", { locale: id })}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <NoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          tripId={tripId}
          onSuccess={loadNotes}
        />

        <DestinationDialog
          open={destinationDialogOpen}
          onOpenChange={setDestinationDialogOpen}
          destination={selectedDestination}
          onSuccess={loadAllDestinations}
        />

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default TripDetail;
