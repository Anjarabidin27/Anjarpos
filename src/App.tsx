import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Trips from "./pages/Trips";
import NewTrip from "./pages/NewTrip";
import TripDetail from "./pages/TripDetail";
import Keuangan from "./pages/Keuangan";
import NewKeuangan from "./pages/NewKeuangan";
import Laporan from "./pages/Laporan";
import Destinations from "./pages/Destinations";
import SelectDestinations from "./pages/SelectDestinations";
import Notes from "./pages/Notes";
import NotesNew from "./pages/NotesNew";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/trips/new" element={<NewTrip />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/select" element={<SelectDestinations />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notesnew" element={<NotesNew />} />
          <Route path="/keuangan" element={<Keuangan />} />
          <Route path="/keuangan/new" element={<NewKeuangan />} />
          <Route path="/laporan" element={<Laporan />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
