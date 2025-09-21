import axios from 'axios';

interface GoogleImageResult {
  kind: string;
  title: string;
  htmlTitle: string;
  link: string;
  displayLink: string;
  snippet: string;
  htmlSnippet: string;
  mime: string;
  fileFormat: string;
  image: {
    contextLink: string;
    height: number;
    width: number;
    byteSize: number;
    thumbnailLink: string;
    thumbnailHeight: number;
    thumbnailWidth: number;
  };
}

interface GoogleSearchResponse {
  kind: string;
  url: {
    type: string;
    template: string;
  };
  queries: {
    request: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
      inputEncoding: string;
      outputEncoding: string;
      safe: string;
      cx: string;
      searchType: string;
    }>;
  };
  context: {
    title: string;
  };
  searchInformation: {
    searchTime: number;
    formattedSearchTime: string;
    totalResults: string;
    formattedTotalResults: string;
  };
  items: GoogleImageResult[];
}

export interface ProcessedImageResult {
  id: string;
  urls: {
    small: string;
    regular: string;
    full: string;
    thumbnail: string;
  };
  alt_description: string;
  user: {
    name: string;
  };
  description: string;
  source: string;
  dimensions: {
    width: number;
    height: number;
  };
}

export class GoogleImagesService {
  private readonly API_KEY: string;
  private readonly SEARCH_ENGINE_ID: string;
  private readonly BASE_URL = 'https://www.googleapis.com/customsearch/v1';

  constructor() {
    // Configurar chaves reais da API
    this.API_KEY = process.env.GOOGLE_API_KEY || 'development_mode';
    this.SEARCH_ENGINE_ID = process.env.GOOGLE_CX || 'development_mode';
    
    if (this.API_KEY !== 'development_mode') {
      console.log('✅ Google Images API configurada com chave real');
    } else {
      console.log('⚠️ Usando modo desenvolvimento - sem chaves da API');
    }
  }

  async searchImages(query: string, count: number = 50): Promise<ProcessedImageResult[]> {
    try {
      // Se não tiver chaves configuradas, usar fallback direto
      if (this.API_KEY === 'development_mode') {
        console.log('⚠️ Usando modo desenvolvimento - fallback local para:', query);
        return this.getFallbackImages(query);
      }

      // Melhorar query para cosméticos brasileiros
      const enhancedQuery = this.enhanceQuery(query);
      
      // Como a API tem limite de 10 por requisição, fazer múltiplas requisições
      const maxPerRequest = 10;
      const totalRequests = Math.ceil(count / maxPerRequest);
      const allResults: ProcessedImageResult[] = [];
      
      for (let i = 0; i < Math.min(totalRequests, 5); i++) { // Máximo 5 requisições (50 imagens)
        const startIndex = (i * maxPerRequest) + 1;
        
        try {
          const response = await axios.get<GoogleSearchResponse>(this.BASE_URL, {
            params: {
              key: this.API_KEY,
              cx: this.SEARCH_ENGINE_ID,
              q: enhancedQuery,
              searchType: 'image',
              num: maxPerRequest,
              start: startIndex,
              safe: 'active',
              imgType: 'photo',
              imgSize: 'medium',
              fileType: 'jpg,png,webp'
            },
            headers: {
              'Referer': 'http://localhost:5170',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
          });
          
          if (response.data.items && response.data.items.length > 0) {
            const processedResults = this.processResults(response.data.items);
            allResults.push(...processedResults);
          }
        } catch (error) {
          console.log(`⚠️ Erro na requisição ${i + 1}:`, error);
          break; // Para na primeira falha
        }
      }
      
      if (allResults.length > 0) {
        return allResults.slice(0, count); // Limitar ao número solicitado
      }
      
      // Se não conseguiu buscar nada, usar fallback
      return this.getFallbackImages(query);
    } catch (error) {
      console.error('Erro na busca do Google Images:', error);
      // Retorna resultados fallback em caso de erro
      return this.getFallbackImages(query);
    }
  }

  private enhanceQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Mapeamento para melhorar busca de produtos brasileiros
    const enhancements: Record<string, string> = {
      'vivai': 'vivai cosméticos base matte pure skin',
      'ruby rose': 'ruby rose maquiagem brasil batom base',
      'natura': 'natura cosméticos produtos beleza brasil',
      'avon': 'avon brasil maquiagem cosméticos',
      'océane': 'océane femme cosméticos brasil',
      'base': 'base líquida maquiagem cosmético brasileiro',
      'batom': 'batom maquiagem cosmético brasileiro',
      'maquiagem': 'kit maquiagem cosméticos brasil',
      'sombra': 'paleta sombras maquiagem brasil',
      'rímel': 'rímel máscara cílios maquiagem brasil',
      'pó compacto': 'pó compacto facial maquiagem brasil'
    };

    for (const [key, enhancement] of Object.entries(enhancements)) {
      if (lowerQuery.includes(key)) {
        return enhancement;
      }
    }

    // Se não encontrar mapeamento específico, adicionar contexto brasileiro
    return `${query} maquiagem cosméticos brasil`;
  }

  private processResults(items: GoogleImageResult[]): ProcessedImageResult[] {
    return items.map((item, index) => ({
      id: `google-${index}-${Date.now()}`,
      urls: {
        small: item.image.thumbnailLink,
        regular: item.link,
        full: item.link,
        thumbnail: item.image.thumbnailLink
      },
      alt_description: this.cleanTitle(item.title),
      user: {
        name: this.extractBrandName(item.displayLink)
      },
      description: this.cleanSnippet(item.snippet),
      source: 'Google Images',
      dimensions: {
        width: item.image.width,
        height: item.image.height
      }
    }));
  }

  private cleanTitle(title: string): string {
    // Remove caracteres especiais e limita tamanho
    return title
      .replace(/[^\w\s\-]/g, '')
      .substring(0, 80)
      .trim();
  }

  private cleanSnippet(snippet: string): string {
    // Remove HTML e limita tamanho
    return snippet
      .replace(/<[^>]*>/g, '')
      .substring(0, 150)
      .trim();
  }

  private extractBrandName(displayLink: string): string {
    // Extrair nome da marca do domínio
    const brandMappings: Record<string, string> = {
      'vivai': 'Vivai Cosméticos',
      'rubyrose': 'Ruby Rose Brasil',
      'natura': 'Natura Brasil',
      'avon': 'Avon Brasil',
      'oceane': 'Océane Femme',
      'mercadolivre': 'Mercado Livre',
      'americanas': 'Americanas',
      'amazon': 'Amazon Brasil',
      'magalu': 'Magazine Luiza'
    };

    const domain = displayLink.toLowerCase();
    for (const [key, brand] of Object.entries(brandMappings)) {
      if (domain.includes(key)) {
        return brand;
      }
    }

    return displayLink.split('.')[0] || 'Loja Online';
  }

  private getFallbackImages(query: string): ProcessedImageResult[] {
    // Banco de imagens locais como fallback
    const fallbackDatabase: Record<string, ProcessedImageResult[]> = {
      'vivai': [
        {
          id: 'fallback-vivai-1',
          urls: {
            small: 'https://cdn.awsli.com.br/300x300/2030/2030831/produto/164875456/base-liquida-matte-vivai-pure-skin-30ml-f7f51b8c.jpg',
            regular: 'https://cdn.awsli.com.br/600x600/2030/2030831/produto/164875456/base-liquida-matte-vivai-pure-skin-30ml-f7f51b8c.jpg',
            full: 'https://cdn.awsli.com.br/800x800/2030/2030831/produto/164875456/base-liquida-matte-vivai-pure-skin-30ml-f7f51b8c.jpg',
            thumbnail: 'https://cdn.awsli.com.br/150x150/2030/2030831/produto/164875456/base-liquida-matte-vivai-pure-skin-30ml-f7f51b8c.jpg'
          },
          alt_description: 'Base Vivai Matte Pure Skin 30ml',
          user: { name: 'Vivai Cosméticos' },
          description: 'Base líquida matte com cobertura natural',
          source: 'Banco Local',
          dimensions: { width: 600, height: 600 }
        }
      ]
    };

    const queryLower = query.toLowerCase();
    for (const [key, images] of Object.entries(fallbackDatabase)) {
      if (queryLower.includes(key)) {
        return images;
      }
    }

    return [];
  }
}