import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  console.log('🛠️ Configurando Vite...');
  console.log('📁 Root do Vite:', path.resolve(process.cwd(), "apps", "web"));
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    configFile: path.resolve(process.cwd(), "vite.config.ts"),
    root: path.resolve(process.cwd(), "apps", "web"),
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "apps", "web", "src"),
        "@shared": path.resolve(process.cwd(), "packages", "shared"),
        "@assets": path.resolve(process.cwd(), "attached_assets"),
      },
    },
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        console.error('❌ Vite Error:', msg);
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  console.log('✅ Vite server criado com sucesso');
  
  app.use(vite.middlewares);
  console.log('✅ Middleware do Vite adicionado ao Express');
  
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    console.log('🔄 Processando requisição:', url);

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "apps",
        "web",
        "index.html",
      );
      
      console.log('📄 Lendo template de:', clientTemplate);

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      
      console.log('🔄 Transformando HTML com Vite...');
      const page = await vite.transformIndexHtml(url, template);
      console.log('✅ HTML transformado, enviando resposta');
      
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error('❌ Erro ao processar requisição:', e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  
  console.log('✅ Vite configurado completamente!');
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  console.log('📁 Tentando servir arquivos estáticos de:', distPath);
  console.log('🔍 Current working directory:', process.cwd());
  
  // Listar o que existe no diretório de trabalho
  try {
    const rootContents = fs.readdirSync(process.cwd());
    console.log('🔍 Conteúdo do diretório raiz:', rootContents);
    
    if (rootContents.includes('dist')) {
      const distContents = fs.readdirSync(path.resolve(process.cwd(), 'dist'));
      console.log('🔍 Conteúdo de dist/:', distContents);
      
      if (distContents.includes('public')) {
        const publicContents = fs.readdirSync(path.resolve(process.cwd(), 'dist', 'public'));
        console.log('🔍 Conteúdo de dist/public/:', publicContents);
      } else {
        console.log('⚠️ Pasta dist/public não encontrada!');
      }
    } else {
      console.log('⚠️ Pasta dist não encontrada!');
    }
  } catch (e) {
    console.log('🔍 Erro ao listar diretórios:', e);
  }
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Diretório de build não encontrado:', distPath);
    
    // Em vez de quebrar, vamos servir apenas a API
    console.log('⚠️ Modo API: Servindo apenas rotas da API sem frontend');
    
    // Serve uma página simples de status na raiz
    app.get('/', (req, res) => {
      res.json({
        status: 'ok',
        message: 'Mar de Cores API - Frontend em construção',
        api: '/api',
        timestamp: new Date().toISOString(),
        build_info: {
          frontend_built: false,
          backend_built: true,
          dist_path: distPath
        }
      });
    });
    
    return;
  }

  console.log('✅ Diretório de build encontrado:', distPath);
  
  // Verificar se o index.html existe
  const indexPath = path.resolve(distPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error('❌ index.html não encontrado em:', indexPath);
    return;
  }
  
  console.log('✅ index.html encontrado:', indexPath);
  console.log('🚀 Configurando servidor estático para frontend completo...');
  
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    console.log('📄 Servindo index.html de:', indexPath);
    res.sendFile(indexPath);
  });
}
