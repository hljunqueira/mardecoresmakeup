import { Button } from "@/components/ui/button";
import { openWhatsApp } from "@/lib/whatsapp";

export default function FloatingWhatsApp() {
  const handleClick = () => {
    openWhatsApp();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleClick}
        className="bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 animate-bounce"
        size="icon"
      >
        <i className="fab fa-whatsapp text-2xl"></i>
      </Button>
    </div>
  );
}
