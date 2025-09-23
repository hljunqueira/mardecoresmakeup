import 'dotenv/config';
// 🚨 CRITICAL: Força IPv4 ANTES de qualquer import - primeira linha obrigatória no Railway
import * as dns from 'dns';
import * as os from 'os';

// 👇 SOLUÇÃO AGRESSIVA IPv4 (Railway não aplicou variáveis)
if (process.env.NODE_ENV === 'production') {
  console.log('🚨 === SOLUÇÃO AGRESSIVA IPv4 ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS || '❌ NÃO DEFINIDA - USANDO SOLUÇÃO ALTERNATIVA');
  
  // SOLUÇÃO 1: Forçar configurações DNS múltiplas
  console.log('⚡ Aplicando solução IPv4 agressiva...');
  
  try {
    // Método 1: DNS order
    dns.setDefaultResultOrder('ipv4first');
    console.log('✅ dns.setDefaultResultOrder aplicado');
    
    // Método 2: Variáveis de ambiente manuais
    process.env.UV_USE_IO_URING = '0';
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --dns-result-order=ipv4first';
    console.log('✅ Variáveis IPv4 aplicadas manualmente');
    
    // Método 3: Network interfaces
    const interfaces = os.networkInterfaces();
    const hasIPv4 = Object.values(interfaces).flat().some(iface => iface?.family === 'IPv4' && !iface.internal);
    console.log('🌐 IPv4 disponível:', hasIPv4 ? '✅' : '❌');
    
  } catch (error: any) {
    console.log('⚠️ Erro ao aplicar configurações IPv4:', error.message);
  }
  
  // Teste IMEDIATO com múltiplas estratégias
  console.log('🔍 === TESTE DNS AGRESSIVO ===');
  
  // Teste 1: Forçando IPv4 explicitamente com hints
  dns.lookup('db.wudcabcsxmahlufgsyop.supabase.co', { family: 4, hints: dns.ADDRCONFIG }, (err, address) => {
    if (err) {
      console.log('❌ DNS IPv4 com hints falhou:', err.message);
    } else {
      console.log('🔎 ✅ DNS IPv4 forçado:', address);
      if (address.startsWith('44.') || address.startsWith('3.') || address.startsWith('54.')) {
        console.log('🏆 ✅ SUCESSO - IPv4 AWS detectado!');
      } else {
        console.log('⚠️ IP inesperado, mas é IPv4:', address);
      }
    }
  });
  
  // Teste 2: Lookup simples IPv4
  dns.lookup('db.wudcabcsxmahlufgsyop.supabase.co', { family: 4 }, (err, address, family) => {
    if (err) {
      console.log('❌ DNS IPv4 simples falhou:', err.message);
    } else {
      console.log(`📄 DNS IPv4 simples: ${address} (family: ${family})`);
      if (family === 4) {
        console.log('🏆 ✅ IPv4 confirmado!');
      }
    }
  });
  
  // Teste 3: Resolve com IPv4 apenas
  dns.resolve4('db.wudcabcsxmahlufgsyop.supabase.co', (err, addresses) => {
    if (err) {
      console.log('❌ DNS resolve4 falhou:', err.message);
    } else {
      console.log('📀 IPv4 addresses via resolve4:', addresses);
    }
  });
  
  console.log('🚨 === FIM SOLUÇÃO AGRESSIVA ===\n');
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
