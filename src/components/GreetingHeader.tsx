import { useEffect, useState } from "react";
import BusAnimation from "@/components/BusAnimation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface GreetingHeaderProps {
  onRefresh?: () => void;
}

const GreetingHeader = ({ onRefresh }: GreetingHeaderProps) => {
  const [greeting, setGreeting] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const updateGreeting = () => {
      // Waktu Indonesia Barat (WIB) adalah UTC+7
      const now = new Date();
      const wibTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      const hour = wibTime.getHours();

      if (hour >= 5 && hour < 11) {
        setGreeting("Selamat Pagi");
      } else if (hour >= 11 && hour < 15) {
        setGreeting("Selamat Siang");
      } else if (hour >= 15 && hour < 18) {
        setGreeting("Selamat Sore");
      } else {
        setGreeting("Selamat Malam");
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update setiap menit

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    if (onRefresh && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  return (
    <div className="gradient-hero p-6 rounded-3xl shadow-lg mb-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-white">{greeting}! 👋</h1>
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
          <p className="text-white/90 text-sm">Selamat datang di Malika Tour</p>
        </div>
        <div className="w-20 h-16">
          <BusAnimation />
        </div>
      </div>
    </div>
  );
};

export default GreetingHeader;
