// string-helpers-seguro v1.0.0
// Funções utilitárias escritas internamente pela equipe

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

function validarCPF(cpf) {
  const n = cpf.replace(/\D/g, "");
  if (n.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(n)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(n[i]) * (10 - i);
  let digito = 11 - (soma % 11);
  if (digito > 9) digito = 0;
  if (parseInt(n[9]) !== digito) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(n[i]) * (11 - i);
  digito = 11 - (soma % 11);
  if (digito > 9) digito = 0;
  if (parseInt(n[10]) !== digito) return false;

  return true;
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

function sanitizarEntrada(texto) {
  if (typeof texto !== "string") return "";
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function formatarDadosUsuario(dados) {
  return {
    ...dados,
    nome: dados.nome ? capitalizarTexto(dados.nome) : dados.nome,
    cpf: dados.cpf ? formatarCPF(dados.cpf) : dados.cpf,
    email: dados.email ? dados.email.toLowerCase().trim() : dados.email,
  };
}

module.exports = {
  capitalizarTexto,
  removerAcentos,
  formatarCPF,
  validarCPF,
  mascararEmail,
  gerarSlug,
  sanitizarEntrada,
  formatarDadosUsuario,
};
