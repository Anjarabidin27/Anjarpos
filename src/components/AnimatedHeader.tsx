import { useState } from "react";
import { Bus } from "lucide-react";
import { FeedbackDialog } from "./FeedbackDialog";

export const AnimatedHeader = () => {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <div
        onClick={() => setShowFeedback(true)}
        className="flex items-center justify-center gap-3 mb-6 cursor-pointer group"
      >
        <div className="animate-float">
          <Bus className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent animate-fade-in">
          Malika Tour
        </h1>
      </div>
      <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} />
    </>
  );
};
