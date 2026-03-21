// ============================================================
//  API DE CADASTRO DE USUÁRIOS (VÍTIMA)
//
//  Esta API simula um sistema legítimo que utiliza a biblioteca
//  "string-helpers" para manipulação de dados. O desenvolvedor
//  não sabe que a lib foi comprometida.
//
//  Para ele, tudo funciona perfeitamente.
//  Para o atacante, todos os dados estão sendo copiados.
// ============================================================

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDoc = require("./swagger.json");

// ─── Importação da lib "confiável" ──────────────────────────
// O desenvolvedor encontrou essa lib no npm, viu que tinha
// milhares de downloads, documentação bonita, e instalou.
// Ele não conferiu o código-fonte da lib.
const stringHelpers = require("./lib/string-helpers");

const app = express();
const PORTA = 3000;

// ─── Variáveis de ambiente simuladas ────────────────────────
// Em um sistema real, essas estariam no .env
// A lib maliciosa vai capturá-las ao ser importada
process.env.DATABASE_URL = "postgresql://admin:senha123@db.empresa.com:5432/producao";
process.env.JWT_SECRET = "meu-segredo-super-secreto-2024";
process.env.API_KEY = "sk-live-abc123def456ghi789";
process.env.SENHA_ADMIN = "admin@2024!";

// ─── Middlewares ────────────────────────────────────────────
app.use(express.json());

// O desenvolvedor usa o "logger" da lib — parece inofensivo!
// "Ah, é só um logger de requisições, que mal pode fazer?"
app.use(stringHelpers.loggerDeRequisicoes());

// ─── Swagger ────────────────────────────────────────────────
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customCss: `
    .swagger-ui .topbar { background-color: #dc3545; }
    .swagger-ui .topbar .link { visibility: hidden; }
    .swagger-ui .topbar .link::after {
      content: "⚠️ Supply Chain Attack — Demonstração Educacional";
      visibility: visible;
      color: white;
      font-size: 18px;
      font-weight: bold;
    }
    .swagger-ui .info .title { color: #dc3545; }
  `,
  customSiteTitle: "Supply Chain Attack — Demo",
}));

// ═══════════════════════════════════════════════════════════
//  ENDPOINTS DA API
// ═══════════════════════════════════════════════════════════

// ─── POST /usuarios/cadastrar ────────────────────────────────
app.post("/usuarios/cadastrar", (req, res) => {
  const { nome, email, cpf, telefone, senha } = req.body;

  if (!nome || !email || !cpf) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome, email, cpf",
    });
  }

  // Usa a função da lib para formatar — AQUI OS DADOS SÃO ROUBADOS
  const usuarioFormatado = stringHelpers.formatarDadosUsuario({
    nome,
    email,
    cpf,
    telefone,
    senha, // A SENHA TAMBÉM É ENVIADA AO ATACANTE!
  });

  // Resposta normal — tudo parece funcionar perfeitamente
  res.status(201).json({
    mensagem: "✅ Usuário cadastrado com sucesso!",
    usuario: {
      nome: usuarioFormatado.nome,
      email: usuarioFormatado.email,
      cpf: usuarioFormatado.cpf,
      telefone: usuarioFormatado.telefone,
      // Senha não retorna na resposta (boa prática!)
      // Mas a lib já roubou ela...
    },
  });
});

// ─── POST /usuarios/validar-cpf ─────────────────────────────
app.post("/usuarios/validar-cpf", (req, res) => {
  const { cpf } = req.body;

  if (!cpf) {
    return res.status(400).json({ erro: "Campo obrigatório: cpf" });
  }

  // Usa a função da lib para validar — CPF É ROUBADO AQUI
  const valido = stringHelpers.validarCPF(cpf);

  res.json({
    cpf: stringHelpers.formatarCPF(cpf),
    valido,
    mensagem: valido
      ? "✅ CPF válido!"
      : "❌ CPF inválido — verifique o formato.",
  });
});

// ─── POST /utilidades/sanitizar ──────────────────────────────
app.post("/utilidades/sanitizar", (req, res) => {
  const { texto } = req.body;

  if (!texto) {
    return res.status(400).json({ erro: "Campo obrigatório: texto" });
  }

  // Usa a função da lib — DADOS SENSÍVEIS NO TEXTO SÃO EXTRAÍDOS
  const textoSanitizado = stringHelpers.sanitizarEntrada(texto);

  res.json({
    original: texto,
    sanitizado: textoSanitizado,
    mensagem: "✅ Texto sanitizado com sucesso!",
  });
});

// ─── POST /utilidades/capitalizar (SEGURA) ───────────────────
app.post("/utilidades/capitalizar", (req, res) => {
  const { texto } = req.body;

  if (!texto) {
    return res.status(400).json({ erro: "Campo obrigatório: texto" });
  }

  // Esta função NÃO foi infectada
  const resultado = stringHelpers.capitalizarTexto(texto);

  res.json({
    original: texto,
    capitalizado: resultado,
    mensagem: "✅ Texto capitalizado!",
  });
});

// ─── POST /utilidades/gerar-slug (SEGURA) ────────────────────
app.post("/utilidades/gerar-slug", (req, res) => {
  const { texto } = req.body;

  if (!texto) {
    return res.status(400).json({ erro: "Campo obrigatório: texto" });
  }

  // Esta função NÃO foi infectada
  const slug = stringHelpers.gerarSlug(texto);

  res.json({
    original: texto,
    slug,
    mensagem: "✅ Slug gerado!",
  });
});

// ─── POST /utilidades/mascarar-email (SEGURA) ────────────────
app.post("/utilidades/mascarar-email", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ erro: "Campo obrigatório: email" });
  }

  // Esta função NÃO foi infectada
  const mascarado = stringHelpers.mascararEmail(email);

  res.json({
    original: email,
    mascarado,
    mensagem: "✅ E-mail mascarado!",
  });
});

// ─── GET /saude ──────────────────────────────────────────────
app.get("/saude", (_req, res) => {
  res.json({
    status: "online",
    api: "API de Cadastro de Usuários v1.0.0",
    dependencias: {
      "string-helpers": "v2.1.0 (comprometida — mas o dev não sabe!)",
    },
    mensagem: "💚 API funcionando normalmente!",
  });
});

// ─── Inicialização ───────────────────────────────────────────
app.listen(PORTA, () => {
  console.log();
  console.log("══════════════════════════════════════════════════════");
  console.log("  📋 API de Cadastro de Usuários (VÍTIMA)");
  console.log("══════════════════════════════════════════════════════");
  console.log();
  console.log("  🌐 API rodando em:     http://localhost:" + PORTA);
  console.log("  📖 Swagger (docs) em:  http://localhost:" + PORTA + "/docs");
  console.log();
  console.log("  ⚠️  A lib string-helpers foi carregada.");
  console.log("  ⚠️  Variáveis de ambiente já foram capturadas!");
  console.log("  ⚠️  Observe o terminal do atacante...");
  console.log();
  console.log("══════════════════════════════════════════════════════");
  console.log();
});
