const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDoc = require("./swagger.json");
const stringHelpers = require("./lib/string-helpers");

const app = express();
const PORTA = 3000;

// Variáveis de ambiente sensíveis (capturadas pela lib ao importar)
process.env.DATABASE_URL = "postgresql://admin:senha123@db.empresa.com:5432/producao";
process.env.JWT_SECRET = "meu-segredo-super-secreto-2024";
process.env.API_KEY = "sk-live-abc123def456ghi789";

app.use(express.json());
app.use(stringHelpers.loggerDeRequisicoes());

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customCss: `
    .swagger-ui .topbar { background-color: #dc3545; }
    .swagger-ui .topbar .link { visibility: hidden; }
    .swagger-ui .topbar .link::after {
      content: "Supply Chain Attack — API Vitima";
      visibility: visible; color: white; font-size: 18px; font-weight: bold;
    }
  `,
  customSiteTitle: "API Vitima — Supply Chain Attack",
}));

// ─── Endpoints comprometidos ─────────────────────────────────

app.post("/usuarios/cadastrar", (req, res) => {
  const { nome, email, cpf, telefone, senha } = req.body;
  if (!nome || !email || !cpf) {
    return res.status(400).json({ erro: "Campos obrigatorios: nome, email, cpf" });
  }

  const usuario = stringHelpers.formatarDadosUsuario({ nome, email, cpf, telefone, senha });

  res.status(201).json({
    mensagem: "Usuario cadastrado com sucesso",
    usuario: {
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      telefone: usuario.telefone,
    },
  });
});

app.post("/usuarios/validar-cpf", (req, res) => {
  const { cpf } = req.body;
  if (!cpf) return res.status(400).json({ erro: "Campo obrigatorio: cpf" });

  const valido = stringHelpers.validarCPF(cpf);
  res.json({
    cpf: stringHelpers.formatarCPF(cpf),
    valido,
    mensagem: valido ? "CPF valido" : "CPF invalido",
  });
});

app.post("/utilidades/sanitizar", (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ erro: "Campo obrigatorio: texto" });

  res.json({
    original: texto,
    sanitizado: stringHelpers.sanitizarEntrada(texto),
  });
});

// ─── Endpoints limpos ────────────────────────────────────────

app.post("/utilidades/capitalizar", (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ erro: "Campo obrigatorio: texto" });

  res.json({ original: texto, capitalizado: stringHelpers.capitalizarTexto(texto) });
});

app.post("/utilidades/gerar-slug", (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ erro: "Campo obrigatorio: texto" });

  res.json({ original: texto, slug: stringHelpers.gerarSlug(texto) });
});

app.post("/utilidades/mascarar-email", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: "Campo obrigatorio: email" });

  res.json({ original: email, mascarado: stringHelpers.mascararEmail(email) });
});

app.get("/saude", (_req, res) => {
  res.json({ status: "online", dependencias: { "string-helpers": "2.1.0" } });
});

app.listen(PORTA, () => {
  console.log("\n  API Vitima rodando em http://localhost:" + PORTA);
  console.log("  Swagger em http://localhost:" + PORTA + "/docs\n");
});
