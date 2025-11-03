import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import DestinationDialog from "@/components/DestinationDialog";
import { TripExpandableCard } from "@/components/TripExpandableCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, Clock, DollarSign, MapPin } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface Trip {
  id: string;
  nama_trip: string;
  tanggal: string;
  tujuan: string;
  catatan: string | null;
  nama_kendaraan?: string;
  jumlah_penumpang?: number;
}

interface Destination {
  id: string;
  nama_destinasi: string;
  deskripsi: string;
  kategori: string;
  lokasi: string;
  durasi_standar: number;
  estimasi_biaya: number;
}

const Trips = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<Destination | undefined>();

  useEffect(() => {
    loadTrips();
    loadDestinations();

    const tripsChannel = supabase
      .channel("trips-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => loadTrips()
      )
      .subscribe();

    const destinationsChannel = supabase
      .channel("destinations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "destinations" },
        () => loadDestinations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tripsChannel);
      supabase.removeChannel(destinationsChannel);
    };
  }, []);

  const loadTrips = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error: any) {
      console.error("Error loading trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDestinations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDestinations(data || []);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal memuat destinasi");
    }
  };

  const handleEditDestination = (destination: Destination) => {
    setSelectedDestination(destination);
    setDialogOpen(true);
  };

  const handleAddDestination = () => {
    setSelectedDestination(undefined);
    setDialogOpen(true);
  };

  const handleDeleteDestination = async (id: string) => {
    if (!confirm("Hapus destinasi ini?")) return;

    try {
      const { error } = await supabase
        .from("destinations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Destinasi berhasil dihapus");
      loadDestinations();
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

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredTrips = trips.filter((trip) => {
    const query = searchQuery.toLowerCase();
    const matchName = trip.nama_trip.toLowerCase().includes(query);
    const matchTujuan = trip.tujuan.toLowerCase().includes(query);
    const matchDate = format(new Date(trip.tanggal), "dd MMMM yyyy", { locale: id })
      .toLowerCase()
      .includes(query);
    return matchName || matchTujuan || matchDate;
  });

  // Group trips by month and year
  const groupedTrips = filteredTrips.reduce((acc, trip) => {
    const monthYear = format(new Date(trip.tanggal), "MMMM yyyy", { locale: id });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(trip);
    return acc;
  }, {} as Record<string, Trip[]>);

  // Group destinations by city (lokasi)
  const groupedDestinations = destinations.reduce((acc, dest) => {
    const city = dest.lokasi.split(',')[0].trim(); // Get first part before comma
    if (!acc[city]) {
      acc[city] = [];
    }
    acc[city].push(dest);
    return acc;
  }, {} as Record<string, Destination[]>);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-lg mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Trip & Destinasi</h1>

          <Tabs defaultValue="trips" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="trips">Daftar Trip</TabsTrigger>
              <TabsTrigger value="destinations">Destinasi Wisata</TabsTrigger>
            </TabsList>

            <TabsContent value="trips" className="mt-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Trip Saya</h2>
                <Button
                  onClick={() => navigate("/trips/new")}
                  className="gradient-primary text-white"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cari nama trip, tujuan, atau tanggal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 ios-card"
                />
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
                </div>
              ) : filteredTrips.length === 0 && searchQuery ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Tidak ada trip yang cocok dengan pencarian</p>
                </div>
              ) : trips.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Belum ada trip</p>
                  <Button
                    onClick={() => navigate("/trips/new")}
                    className="gradient-primary text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Trip
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTrips).map(([monthYear, monthTrips]) => (
                    <div key={monthYear}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">
                        {monthYear}
                      </h3>
                      <div className="space-y-3">
                        {monthTrips.map((trip) => (
                          <TripExpandableCard
                            key={trip.id}
                            trip={trip}
                            onClick={() => navigate(`/trips/${trip.id}`)}
                            onTripUpdated={loadTrips}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="destinations" className="mt-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Destinasi Wisata</h2>
                <Button
                  className="gradient-primary text-white"
                  onClick={handleAddDestination}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
                </div>
              ) : destinations.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">Belum ada destinasi wisata</p>
                  <Button onClick={handleAddDestination} className="gradient-primary text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Destinasi
                  </Button>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedDestinations).map(([city, cityDestinations]) => (
                    <div key={city}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {city}
                      </h3>
                      <div className="space-y-3">
                        {cityDestinations.map((dest) => (
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
                                  onClick={() => handleDeleteDestination(dest.id)}
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
                                <Clock className="w-4 h-4" />
                                {dest.durasi_standar} menit
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {formatRupiah(dest.estimasi_biaya)}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DestinationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          destination={selectedDestination}
          onSuccess={loadDestinations}
        />

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default Trips;
