const express = require("express");
// [+] HELMET: biblioteca confiavel e auditada para headers de seguranca HTTP
const helmet = require("helmet");
// [+] BCRYPT: hash seguro para senhas -- nunca armazena em texto puro
const bcrypt = require("bcrypt");
// [+] RATE LIMITING: protecao contra brute-force e flood de requisicoes
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerDoc = require("./swagger-seguro.json");
// [+] LIB PROPRIA: funcoes internas da equipe -- nenhum codigo externo nao auditado
const helpers = require("./lib/string-helpers-seguro");

const app = express();
const PORTA = 3002;

process.env.DATABASE_URL = "postgresql://admin:senha123@db.empresa.com:5432/producao";
process.env.JWT_SECRET = "meu-segredo-super-secreto-2024";

// [+] HELMET: configura automaticamente CSP, X-Frame-Options, HSTS e outros headers de seguranca
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

// [+] RATE LIMITING: maximo 100 requisicoes por IP a cada 15 minutos -- bloqueia brute-force
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { erro: "Muitas requisicoes. Tente novamente em 15 minutos." },
}));

// [+] LIMITE DE BODY: rejeita payloads acima de 10KB -- previne DoS por payload gigante
app.use(express.json({ limit: "10kb" }));

// [+] LOGGER PROPRIO: registra apenas metodo e rota -- nenhum dado sensivel (body, cookies, headers) e exposto
app.use((req, _res, next) => {
  console.log(`  [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customCss: `
    .swagger-ui .topbar { background-color: #28a745; }
    .swagger-ui .topbar .link { visibility: hidden; }
    .swagger-ui .topbar .link::after {
      content: "API Segura — Prevencao contra Supply Chain Attack";
      visibility: visible; color: white; font-size: 18px; font-weight: bold;
    }
  `,
  customSiteTitle: "API Segura — Prevencao",
}));

// ─── Endpoints seguros ───────────────────────────────────────

app.post("/usuarios/cadastrar", async (req, res) => {
  const { nome, email, cpf, telefone, senha } = req.body;

  // [+] VALIDACAO RIGOROSA: todos os campos obrigatorios verificados, incluindo senha
  if (!nome || !email || !cpf || !senha) {
    return res.status(400).json({ erro: "Campos obrigatorios: nome, email, cpf, senha" });
  }
  // [+] VALIDACAO DE TIPO E TAMANHO: impede strings maliciosas ou vazias demais
  if (typeof nome !== "string" || nome.length < 2 || nome.length > 100) {
    return res.status(400).json({ erro: "Nome deve ter entre 2 e 100 caracteres" });
  }
  // [+] VALIDACAO DE FORMATO: regex garante e-mail estruturalmente valido
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ erro: "Formato de e-mail invalido" });
  }
  // [+] VALIDACAO DE DIGITOS: verifica os digitos verificadores reais do CPF
  if (!helpers.validarCPF(cpf)) {
    return res.status(400).json({ erro: "CPF invalido" });
  }
  // [+] FORCA MINIMA DE SENHA: rejeita senhas fracas antes de processar
  if (senha.length < 8) {
    return res.status(400).json({ erro: "Senha deve ter no minimo 8 caracteres" });
  }

  // [+] BCRYPT HASH: senha nunca armazenada em texto puro -- salt rounds 10 = resistente a brute-force offline
  const senhaHash = await bcrypt.hash(senha, 10);
  // [+] LIB SEGURA: dados passados apenas para funcao interna -- sem exfiltracao
  const usuario = helpers.formatarDadosUsuario({ nome, email, cpf, telefone });

  res.status(201).json({
    mensagem: "Usuario cadastrado com seguranca",
    usuario: {
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      telefone: usuario.telefone,
      senhaProtegida: senhaHash,
    },
  });
});

app.post("/usuarios/validar-cpf", (req, res) => {
  const { cpf } = req.body;
  if (!cpf) return res.status(400).json({ erro: "Campo obrigatorio: cpf" });

  const valido = helpers.validarCPF(cpf);
  res.json({
    cpf: helpers.formatarCPF(cpf),
    valido,
    mensagem: valido ? "CPF valido" : "CPF invalido",
  });
});

app.post("/utilidades/sanitizar", (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ erro: "Campo obrigatorio: texto" });

  res.json({
    original: texto,
    sanitizado: helpers.sanitizarEntrada(texto),
  });
});

app.post("/utilidades/capitalizar", (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ erro: "Campo obrigatorio: texto" });

  res.json({ original: texto, capitalizado: helpers.capitalizarTexto(texto) });
});

app.post("/utilidades/gerar-slug", (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ erro: "Campo obrigatorio: texto" });

  res.json({ original: texto, slug: helpers.gerarSlug(texto) });
});

app.post("/utilidades/mascarar-email", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: "Campo obrigatorio: email" });

  res.json({ original: email, mascarado: helpers.mascararEmail(email) });
});

app.get("/seguranca/headers", (_req, res) => {
  res.json({
    mensagem: "Headers de seguranca configurados pelo Helmet",
    headers: {
      "X-Content-Type-Options": "nosniff — impede MIME sniffing",
      "X-Frame-Options": "DENY — impede clickjacking via iframe",
      "Strict-Transport-Security": "forca HTTPS",
      "Content-Security-Policy": "controla origens de scripts e estilos",
    },
    dica: "F12 > Network > clique em qualquer requisicao > aba Headers",
  });
});

app.get("/seguranca/comparativo", (_req, res) => {
  res.json({
    comparativo: [
      { aspecto: "Dependencias", vitima: "Lib de terceiros sem auditoria", segura: "Funcoes internas da equipe" },
      { aspecto: "Senhas", vitima: "Texto puro", segura: "Hash bcrypt (salt rounds: 10)" },
      { aspecto: "Headers HTTP", vitima: "Padrao Express", segura: "Helmet (CSP, HSTS, X-Frame-Options)" },
      { aspecto: "Rate Limiting", vitima: "Nenhum", segura: "100 req/15min por IP" },
      { aspecto: "Validacao", vitima: "Apenas campos obrigatorios", segura: "Tipo, tamanho, formato, digitos CPF" },
      { aspecto: "Side-effects no import", vitima: "require() executa codigo malicioso", segura: "require() nao executa nada" },
      { aspecto: "Middleware logger", vitima: "Intercepta headers, body e cookies", segura: "Registra apenas metodo e rota" },
      { aspecto: "Exfiltracao", vitima: "Dados enviados ao atacante", segura: "Nenhum dado sai da aplicacao" },
    ],
  });
});

app.get("/saude", (_req, res) => {
  res.json({
    status: "online",
    seguranca: { helmet: "ativo", bcrypt: "ativo", rateLimiting: "100 req/15min" },
  });
});

app.listen(PORTA, () => {
  console.log("\n  API Segura rodando em http://localhost:" + PORTA);
  console.log("  Swagger em http://localhost:" + PORTA + "/docs\n");
});
