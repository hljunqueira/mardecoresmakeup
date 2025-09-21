import { BRAND_NAME, CONTACT_WHATSAPP, CONTACT_EMAIL, BUSINESS_HOURS, CONTACT_INSTAGRAM } from "@/lib/constants";
import { openWhatsApp } from "@/lib/whatsapp";
import Logo from "@assets/NovalogoMAR_1754659972460.png";

export default function Footer() {
  return (
    <footer className="bg-white text-gray-800 py-12 border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img src={Logo} alt={BRAND_NAME} className="h-12 w-12 rounded-lg object-cover" />
              <span className="text-2xl font-bold text-petrol-500">{BRAND_NAME}</span>
            </div>
            <p className="text-gray-600 max-w-md mb-6">
              Sua beleza em cores vibrantes. Oferecemos uma experiência única em cosméticos e maquiagens premium.
            </p>
            <div className="flex space-x-4">
              <a
                href={`https://instagram.com/${CONTACT_INSTAGRAM.replace('@','')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 bg-gray-100 hover:bg-gold-500 hover:text-white text-gray-600 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <i className="fab fa-instagram"></i>
              </a>
              <button
                onClick={() => openWhatsApp()}
                aria-label="WhatsApp"
                className="w-10 h-10 bg-gray-100 hover:bg-gold-500 hover:text-white text-gray-600 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <i className="fab fa-whatsapp"></i>
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4 text-petrol-500">Links Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-600 hover:text-petrol-600 transition-colors duration-200">Início</a>
              </li>
              <li>
                <a href="/produtos" className="text-gray-600 hover:text-petrol-600 transition-colors duration-200">Produtos</a>
              </li>
              <li>
                <a href="/#tudo-por-10" className="text-gray-600 hover:text-petrol-600 transition-colors duration-200">Tudo por R$ 10</a>
              </li>
              <li>
                <a href="/admin/login" className="text-gray-600 hover:text-petrol-600 transition-colors duration-200">Admin</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4 text-petrol-500">Atendimento</h4>
            <ul className="space-y-2 text-gray-600">
              <li>
                WhatsApp: <button onClick={() => openWhatsApp(undefined, "Olá! Vim pelo site e gostaria de atendimento personalizado.")} className="underline hover:text-petrol-600">{CONTACT_WHATSAPP}</button>
              </li>
              <li>
                Instagram: <a href={`https://instagram.com/${CONTACT_INSTAGRAM.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-petrol-600">{CONTACT_INSTAGRAM}</a>
              </li>
              <li className="flex items-center gap-2">Email: <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-petrol-600 whitespace-nowrap">{CONTACT_EMAIL}</a></li>
              <li className="text-sm text-gray-500">Atendimento somente por WhatsApp em Balneário Arroio do Silva e região</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center">
          <p className="text-gray-500">© 2025 {BRAND_NAME}. Todos os direitos reservados.</p>
          <p className="text-gray-400 mt-1">
            Desenvolvido por 
            <a href="https://hlj.dev" target="_blank" rel="noopener noreferrer" className="underline hover:text-petrol-600"> Hlj.dev</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
