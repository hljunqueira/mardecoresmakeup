import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ProductRequestBanner() {
  const [formData, setFormData] = useState({
    customerName: "",
    productName: "",
    phone: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName.trim() || !formData.productName.trim() || !formData.phone.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await apiRequest("POST", "/api/product-requests", {
        customerName: formData.customerName.trim(),
        productName: formData.productName.trim(),
        phone: formData.phone.trim(),
        status: "pending"
      });

      toast({
        title: "Solicitação enviada!",
        description: "Entraremos em contato em breve via WhatsApp.",
      });

      // Limpar formulário
      setFormData({
        customerName: "",
        productName: "",
        phone: ""
      });
    } catch (error) {
      toast({
        title: "Erro ao enviar solicitação",
        description: "Tente novamente ou entre em contato pelo WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <section className="py-16 bg-gradient-to-r from-petrol-600 via-petrol-500 to-gold-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Search className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            🎯 PRODUTO ESPECIAL? NÓS ENCONTRAMOS!
          </h2>
          <p className="text-white/90 text-lg max-w-2xl mx-auto">
            Não achou o produto que estava procurando? Informe qual produto deseja e nossa equipe entrará em contato via WhatsApp!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label htmlFor="customerName" className="text-sm font-medium text-gray-700">
                  Seu nome *
                </label>
                <Input
                  id="customerName"
                  type="text"
                  placeholder="Digite seu nome"
                  value={formData.customerName}
                  onChange={handleInputChange("customerName")}
                  className="border-gray-300 focus:border-petrol-500 focus:ring-petrol-500"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="productName" className="text-sm font-medium text-gray-700">
                  Produto desejado *
                </label>
                <Input
                  id="productName"
                  type="text"
                  placeholder="Ex: Batom Ruby Rose"
                  value={formData.productName}
                  onChange={handleInputChange("productName")}
                  className="border-gray-300 focus:border-petrol-500 focus:ring-petrol-500"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  WhatsApp *
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(48) 99999-9999"
                  value={formData.phone}
                  onChange={handleInputChange("phone")}
                  className="border-gray-300 focus:border-petrol-500 focus:ring-petrol-500"
                  disabled={isSubmitting}
                />
              </div>

              <Button 
                type="submit" 
                className="bg-petrol-600 hover:bg-petrol-700 text-white font-semibold py-3 px-8 h-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Enviando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>SOLICITAR</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                * Entraremos em contato em até 24h via WhatsApp
              </p>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}