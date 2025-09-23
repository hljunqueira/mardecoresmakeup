import 'dotenv/config';
// 🚨 CRITICAL: Força IPv4 ANTES de qualquer import - primeira linha obrigatória no Railway
import * as dns from 'dns';

// 👇 Garantir que Node escolhe sempre IPv4 primeiro (solução testada Railway)
if (process.env.NODE_ENV === 'production') {
  dns.setDefaultResultOrder('ipv4first');
  console.log('📡 ✅ DNS configurado para IPv4 FIRST no Railway (aplicado ANTES de qualquer import)');
  
  // Teste para confirmar se funcionou (IPv4 vs IPv6)
  dns.lookup('db.wudcabcsxmahlufgsyop.supabase.co', { family: 4 }, (err, address) => {
    if (err) {
      console.log('❌ Erro no DNS lookup IPv4:', err.message);
    } else {
      console.log('🔎 ✅ Supabase DNS resolvido para IPv4:', address);
      console.log('🏆 Sucesso se começar com 44.x.x.x ou 3.x.x.x (não 2600:)');
    }
  });
}

// Agora sim, imports seguros após configurar DNS para IPv4
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('🚀 Iniciando aplicação...');
    console.log('📁 Diretório de trabalho atual:', process.cwd());
    
    // Listar o que existe antes de iniciar
    try {
      const rootContents = fs.readdirSync('.');
      console.log('🔍 Conteúdo do diretório atual:', rootContents);
      
      if (rootContents.includes('dist')) {
        const distContents = fs.readdirSync('./dist');
        console.log('🔍 Conteúdo de ./dist:', distContents);
        
        if (distContents.includes('public')) {
          const publicContents = fs.readdirSync('./dist/public');
          console.log('🔍 Conteúdo de ./dist/public:', publicContents);
        }
      }
    } catch (e) {
      console.log('🔍 Erro ao listar diretórios:', e instanceof Error ? e.message : String(e));
    }
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('❌ Erro na aplicação:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log('🛠️ Configurando Vite para desenvolvimento...');
      await setupVite(app, server);
    } else {
      console.log('📋 Configurando arquivos estáticos para produção...');
      try {
        serveStatic(app);
      } catch (staticError) {
        console.error('⚠️ Erro ao configurar arquivos estáticos, continuando apenas com API:', staticError);
        // Se falhar, configura uma rota simples na raiz
        app.get('/', (req, res) => {
          res.json({
            status: 'ok',
            message: 'Mar de Cores API - Modo Emergencial',
            error: 'Frontend não disponível',
            api: '/api'
          });
        });
      }
    }

    // Usa PORT do ambiente (Railway) ou padrão 5170 (dev)
    const port = parseInt(process.env.PORT || '8080', 10);
    console.log(`🚀 Starting server on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`📁 Static files will be served from: ${process.env.NODE_ENV === 'production' ? 'dist/public' : 'development mode'}`);

    // Windows não suporta reusePort e gera ENOTSUP. Tornamos condicional.
    const listenOptions: { port: number; host: string; reusePort?: boolean } = {
      port,
      host: "0.0.0.0",
    };
    if (process.platform !== "win32") {
      listenOptions.reusePort = true;
    }

    server.listen(listenOptions, () => {
      console.log(`✅ Server successfully started on http://0.0.0.0:${port}`);
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Erro fatal na inicialização:', error);
    process.exit(1);
  }
})();
