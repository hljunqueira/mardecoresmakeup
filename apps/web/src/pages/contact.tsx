import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import FloatingWhatsApp from "@/components/floating-whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { openWhatsApp } from "@/lib/whatsapp";
import { CONTACT_WHATSAPP, CONTACT_EMAIL, BUSINESS_HOURS } from "@/lib/constants";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    message: "",
  });
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.message) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha seu nome e mensagem.",
        variant: "destructive",
      });
      return;
    }

    // Send via WhatsApp
    const message = `Olá! Meu nome é ${formData.name}.\n\n${formData.message}\n\n${
      formData.whatsapp ? `WhatsApp para contato: ${formData.whatsapp}` : ""
    }`;
    
    openWhatsApp("", message);
    
    toast({
      title: "Mensagem enviada!",
      description: "Redirecionando para o WhatsApp...",
    });

    // Reset form
    setFormData({
      name: "",
      whatsapp: "",
      message: "",
    });
  };

  return (
    <div className="min-h-screen bg-white text-petrol-700">
      <Header />
      
      {/* Page Header */}
      <section className="bg-beige-50 py-16 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-petrol-700 mb-4">
            Entre em Contato
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Estamos aqui para ajudar você a encontrar os produtos perfeitos para sua beleza
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-white rounded-3xl shadow-xl animate-slide-up">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold text-petrol-500 dark:text-gold-500 mb-6">
                    Fale Conosco
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <i className="fab fa-whatsapp text-white text-xl"></i>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">WhatsApp</h4>
                        <p className="text-gray-600 dark:text-gray-300">{CONTACT_WHATSAPP}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <i className="fas fa-envelope text-white text-xl"></i>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Email</h4>
                        <p className="text-gray-600 dark:text-gray-300">{CONTACT_EMAIL}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                        <i className="fas fa-clock text-white text-xl"></i>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Horário</h4>
                        <p className="text-gray-600 dark:text-gray-300">{BUSINESS_HOURS}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nome *
                      </label>
                      <Input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="rounded-xl"
                        placeholder="Seu nome completo"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        WhatsApp (opcional)
                      </label>
                      <Input
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleInputChange}
                        className="rounded-xl"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Mensagem *
                      </label>
                      <Textarea
                        name="message"
                        rows={4}
                        value={formData.message}
                        onChange={handleInputChange}
                        className="rounded-xl"
                        placeholder="Como podemos ajudar você?"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center"
                    >
                      <i className="fab fa-whatsapp mr-2"></i>
                      Enviar via WhatsApp
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
