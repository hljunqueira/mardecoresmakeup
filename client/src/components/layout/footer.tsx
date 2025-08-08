import { Link } from "wouter";
import { BRAND_NAME, CONTACT_WHATSAPP, CONTACT_EMAIL, BUSINESS_HOURS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-petrol-800 dark:bg-petrol-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gold-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-2xl font-bold text-gold-500">{BRAND_NAME}</span>
            </div>
            <p className="text-petrol-200 max-w-md mb-6">
              Sua beleza em cores vibrantes. Oferecemos uma experiência única em cosméticos e maquiagens premium.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="w-10 h-10 bg-petrol-700 hover:bg-gold-500 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <i className="fab fa-instagram"></i>
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-petrol-700 hover:bg-gold-500 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <i className="fab fa-facebook"></i>
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-petrol-700 hover:bg-gold-500 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <i className="fab fa-whatsapp"></i>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4 text-gold-500">Links Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/">
                  <a className="text-petrol-200 hover:text-gold-500 transition-colors duration-200">
                    Início
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/produtos">
                  <a className="text-petrol-200 hover:text-gold-500 transition-colors duration-200">
                    Produtos
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/colecoes">
                  <a className="text-petrol-200 hover:text-gold-500 transition-colors duration-200">
                    Coleções
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/contato">
                  <a className="text-petrol-200 hover:text-gold-500 transition-colors duration-200">
                    Contato
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4 text-gold-500">Atendimento</h4>
            <ul className="space-y-2">
              <li className="text-petrol-200">WhatsApp: {CONTACT_WHATSAPP}</li>
              <li className="text-petrol-200">Email: {CONTACT_EMAIL}</li>
              <li className="text-petrol-200">{BUSINESS_HOURS}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-petrol-700 mt-8 pt-8 text-center">
          <p className="text-petrol-300">© 2024 {BRAND_NAME}. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
