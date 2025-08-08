export const openWhatsApp = (productName?: string, customMessage?: string) => {
  const phoneNumber = "5511999999999"; // Replace with actual WhatsApp number
  
  let message = "";
  if (customMessage) {
    message = customMessage;
  } else if (productName) {
    message = `Olá! Tenho interesse no produto: ${productName}`;
  } else {
    message = "Olá! Gostaria de mais informações sobre os produtos.";
  }
  
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
};
