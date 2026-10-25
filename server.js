// Duelo de Presentes — servidor único: roda no PC (INICIAR.bat) ou na nuvem (Render).
// Conecta na TikTok LIVE, guarda o placar e os ajustes, e manda tudo para o overlay por WebSocket.
//
// Variáveis de ambiente (nuvem):
//   TIKTOK_USERNAME  seu @ do TikTok (sem @)
//   SENHA_PAINEL     senha do painel /admin (obrigatória na nuvem)
//   PORT             porta (o Render define sozinho)
//   EULER_API_KEY    opcional, só se quiser limites maiores no servidor de assinatura
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");

const DIR = __dirname;
const DATA = path.join(DIR, "data");
const NA_NUVEM = !!(process.env.RENDER || process.env.NUVEM);
const PORTA = Number(process.env.PORT) || 8080;
const SENHA = process.env.SENHA_PAINEL || "";

const hora = () => new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
const log = (...a) => console.log(`[${hora()}]`, ...a);
const norm = s => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/* ======================= estado (ajustes + placar) ======================= */
function lerJSON(f, padrao) { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return padrao; } }
const PADRAO = lerJSON(path.join(DIR, "config.json"), {});
try { fs.mkdirSync(DATA, { recursive: true }); } catch (e) {}
const ARQ_ESTADO = path.join(DATA, "estado.json");
const salvo = lerJSON(ARQ_ESTADO, null);

let cfg = limparCfg(Object.assign({}, PADRAO, salvo && salvo.cfg));
if (process.env.TIKTOK_USERNAME && !(salvo && salvo.cfg && salvo.cfg.usuario)) cfg.usuario = limparUsuario(process.env.TIKTOK_USERNAME);
let pts = (salvo && Array.isArray(salvo.pts)) ? salvo.pts.map(n => Math.max(0, Number(n) || 0)) : [0, 0];
const BOOT = crypto.randomBytes(4).toString("hex");

function limparUsuario(u) { return String(u || "").replace(/^@/, "").trim().replace(/[^\w.]/g, "").slice(0, 40); }
function limparCor(c, d) { return /^#[0-9a-f]{6}$/i.test(c || "") ? c : d; }
function limparTexto(t, max) { return String(t ?? "").slice(0, max); }
function limparCfg(c) {
  const p = PADRAO.lados || [{ cor: "#1f6fff" }, { cor: "#e53935" }];
  const out = {
    usuario: limparUsuario(c.usuario),
    titulo: limparTexto(c.titulo || "QUEM VENCE O DUELO?", 80),
    maximo: Math.max(1, Math.min(1e9, Math.round(Number(c.maximo) || 100000))),
    som: c.som !== false,
    fundoTransparente: !!c.fundoTransparente,
    lados: [0, 1].map(i => {
      const L = (c.lados && c.lados[i]) || {};
      return { nome: limparTexto(L.nome || (i ? "LADO B" : "LADO A"), 40), cor: limparCor(L.cor, p[i] && p[i].cor || "#888888"),
        foto: limparTexto(L.foto || "", 500) };
    }),
    regras: (Array.isArray(c.regras) ? c.regras : []).slice(0, 20).map(r => ({
      presentes: limparTexto(r.presentes, 200), lado: Number(r.lado) === 1 ? 1 : 0,
      pontos: Math.max(-1e6, Math.min(1e6, Math.round(Number(r.pontos) || 0))), icone: limparTexto(r.icone, 300)
    }))
  };
  return out;
}

let timerSalvar = null;
function salvar() {
  clearTimeout(timerSalvar);
  timerSalvar = setTimeout(() => {
    try { fs.writeFileSync(ARQ_ESTADO, JSON.stringify({ cfg, pts })); } catch (e) { log("Não consegui salvar:", e.message); }
  }, 400);
}

/* ======================= WebSocket mínimo ======================= */
const clientes = new Set();
let live = { conectado: false, msg: "iniciando…" };

function frame(texto) {
  const p = Buffer.from(texto);
  let h;
  if (p.length < 126) h = Buffer.from([0x81, p.length]);
  else if (p.length < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(p.length, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(p.length), 2); }
  return Buffer.concat([h, p]);
}
function enviar(sock, obj) { try { sock.write(frame(JSON.stringify(obj))); } catch (e) { clientes.delete(sock); } }
function enviarTodos(obj) { const b = frame(JSON.stringify(obj)); for (const c of clientes) { try { c.write(b); } catch (e) { clientes.delete(c); } } }
const estadoPublico = () => ({ event: "estado", data: { cfg: Object.assign({}, cfg, { usuario: undefined }), pts, live, boot: BOOT } });
const mandarEstado = () => enviarTodos(estadoPublico());
function setLive(conectado, msg) { live = { conectado, msg }; enviarTodos({ event: "status", data: live }); }

// lê os quadros que o navegador manda (só para responder ping/close e ignorar o resto)
function leitorWS(sock) {
  let buf = Buffer.alloc(0);
  return chunk => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const op = buf[0] & 0x0f, mascarado = buf[1] & 0x80;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (len > 1e6) { sock.destroy(); return; }
      const total = off + (mascarado ? 4 : 0) + len;
      if (buf.length < total) return;
      const payload = buf.subarray(off + (mascarado ? 4 : 0), total);
      if (mascarado) { const m = buf.subarray(off, off + 4); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
      buf = buf.subarray(total);
      if (op === 0x8) { clientes.delete(sock); try { sock.end(Buffer.from([0x88, 0])); } catch (e) {} return; }
      if (op === 0x9) { const h = Buffer.from([0x8a, payload.length]); try { sock.write(Buffer.concat([h, payload])); } catch (e) {} }
    }
  };
}

/* ======================= presentes → pontos ======================= */
function aplicarPresente(g, origem) {
  if (g.giftType === 1 && !g.repeatEnd) return 0;          // combo: conta só quando termina
  const nome = norm(g.giftName), id = String(g.giftId ?? "");
  const qtd = Math.max(1, Math.min(100000, Number(g.repeatCount) || 1));
  let n = 0;
  cfg.regras.forEach(r => {
    const nomes = r.presentes.split(",").map(norm).filter(Boolean);
    if (!(nomes.includes(nome) || (id && nomes.includes(id)))) return;
    const delta = r.pontos * qtd;
    pts[r.lado] = Math.min(cfg.maximo, Math.max(0, pts[r.lado] + delta));
    enviarTodos({ event: "jogada", data: { lado: r.lado, delta, icone: r.icone, pts } });
    n++;
  });
  log(`${origem === "teste" ? "🧪 (teste)" : "🎁"} "${g.giftName}" x${qtd}${n ? "" : "  (não está na lista de presentes)"}`);
  if (n) salvar();
  return n;
}

/* ======================= conexão com a TikTok LIVE ======================= */
let TL = null, conn = null, geracao = 0, timerRetry = null;
async function carregarLib() {
  try { const m = await import("tiktok-live-connector"); TL = m.default && !m.TikTokLiveConnection && !m.WebcastPushConnection ? m.default : m; }
  catch (e) { log("⚠ Biblioteca do TikTok não instalada (rode npm install). Modo só simulação."); TL = null; }
}
function desconectarLive() {
  geracao++; clearTimeout(timerRetry);
  if (conn) { try { conn.disconnect(); } catch (e) {} conn = null; }
}
function conectarLive() {
  desconectarLive();
  const minha = geracao;
  if (!cfg.usuario) { setLive(false, "configure seu @ no painel /admin"); return; }
  if (!TL) { setLive(false, "modo simulação (biblioteca do TikTok ausente)"); return; }
  const Classe = TL.TikTokLiveConnection || TL.WebcastPushConnection;
  const EV = TL.WebcastEvent || {}, CE = TL.ControlEvent || {};
  const opcoes = { enableExtendedGiftInfo: true };
  if (process.env.EULER_API_KEY) opcoes.signApiKey = process.env.EULER_API_KEY;
  let c;
  try { c = new Classe(cfg.usuario, opcoes); } catch (e) { return tentarDeNovo(minha, "Erro: " + e.message); }
  conn = c;
  c.on(EV.GIFT || "gift", d => {
    if (minha !== geracao) return;
    aplicarPresente({
      giftName: d.giftDetails?.giftName || d.giftName || d.extendedGiftInfo?.name || "",
      giftId: d.giftId, repeatCount: d.repeatCount, repeatEnd: d.repeatEnd,
      giftType: d.giftDetails?.giftType ?? d.giftType
    }, "live");
  });
  c.on(EV.STREAM_END || "streamEnd", () => minha === geracao && tentarDeNovo(minha, "A live terminou."));
  c.on(CE.DISCONNECTED || "disconnected", () => minha === geracao && tentarDeNovo(minha, "Conexão caiu."));
  setLive(false, `conectando em @${cfg.usuario}…`);
  Promise.resolve(c.connect()).then(() => {
    if (minha !== geracao) return;
    log(`✅ Conectado na live de @${cfg.usuario}.`);
    setLive(true, "conectado");
  }).catch(err => minha === geracao && tentarDeNovo(minha, `Sem live ativa em @${cfg.usuario} (${String(err && err.message || err).slice(0, 90)}).`));
}
function tentarDeNovo(minha, motivo) {
  if (minha !== geracao) return;
  if (conn) { try { conn.disconnect(); } catch (e) {} conn = null; }
  log(motivo + " Tentando de novo em 20 s…");
  setLive(false, `aguardando a live de @${cfg.usuario}`);
  clearTimeout(timerRetry);
  timerRetry = setTimeout(() => minha === geracao && conectarLive(), 20000);
}

/* ======================= HTTP ======================= */
const TIPOS = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".md": "text/plain; charset=utf-8" };
const PUBLICOS = new Set(["duelo.html", "admin.html"]);

function senhaOk(req) {
  if (!SENHA) return !NA_NUVEM;                       // no PC sem senha: liberado; na nuvem sem senha: bloqueado
  const dada = Buffer.from(String(req.headers["x-senha"] || ""));
  const certa = Buffer.from(SENHA);
  return dada.length === certa.length && crypto.timingSafeEqual(dada, certa);
}
function json(res, code, obj) { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj)); }
function corpo(req, limite) {
  return new Promise((ok, falha) => {
    let n = 0; const partes = [];
    req.on("data", c => { n += c.length; if (n > limite) { falha(new Error("grande demais")); req.destroy(); } else partes.push(c); });
    req.on("end", () => { try { ok(JSON.parse(Buffer.concat(partes).toString("utf8") || "{}")); } catch (e) { falha(e); } });
    req.on("error", falha);
  });
}
function servirArquivo(res, caminho) {
  const ext = path.extname(caminho).toLowerCase();
  fs.readFile(caminho, (err, data) => {
    if (err || !TIPOS[ext]) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TIPOS[ext], "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  try {
    if (p === "/saude") return json(res, 200, { ok: true, live: live.conectado });
    if (p === "/" || p === "/duelo") return servirArquivo(res, path.join(DIR, "duelo.html"));
    if (p === "/admin") return servirArquivo(res, path.join(DIR, "admin.html"));

    if (p.startsWith("/api/")) {
      if (p === "/api/estado" && req.method === "GET") return json(res, 200, estadoPublico().data);
      if (p === "/api/login" && req.method === "POST") {
        if (!SENHA && NA_NUVEM) return json(res, 503, { erro: "Defina SENHA_PAINEL no Render (Environment) para liberar o painel." });
        return senhaOk(req) ? json(res, 200, { ok: true, precisaSenha: !!SENHA, usuario: cfg.usuario, cfg, pts, live }) : json(res, 401, { erro: "Senha errada" });
      }
      if (!senhaOk(req)) return json(res, 401, { erro: "Senha errada" });
      if (req.method !== "POST") return json(res, 405, { erro: "método" });

      if (p === "/api/config") {
        const b = await corpo(req, 200000);
        const antes = cfg.usuario;
        cfg = limparCfg(Object.assign({}, cfg, b));
        pts = pts.map(n => Math.min(n, cfg.maximo));
        salvar(); mandarEstado();
        if (cfg.usuario !== antes) { log(`Usuário trocado para @${cfg.usuario}`); conectarLive(); }
        return json(res, 200, { ok: true, cfg });
      }
      if (p === "/api/placar") {
        const b = await corpo(req, 10000);
        pts = [0, 1].map(i => Math.min(cfg.maximo, Math.max(0, Math.round(Number(b.pts && b.pts[i]) || 0))));
        salvar(); mandarEstado();
        return json(res, 200, { ok: true, pts });
      }
      if (p === "/api/presente") {
        const b = await corpo(req, 10000);
        let nome = b.presente;
        if (b.regra !== undefined) { const r = cfg.regras[Number(b.regra)]; if (!r) return json(res, 400, { erro: "regra" }); nome = r.presentes.split(",")[0].trim(); }
        const n = aplicarPresente({ giftName: nome, repeatCount: Number(b.qtd) || 1, repeatEnd: true, giftType: 0 }, "teste");
        return json(res, 200, { ok: true, aplicadas: n, pts });
      }
      if (p === "/api/foto") {
        const b = await corpo(req, 6 * 1024 * 1024);
        const lado = Number(b.lado) === 1 ? 1 : 0;
        const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(b.dataUrl || ""));
        if (!m) return json(res, 400, { erro: "imagem inválida" });
        const ext = m[1] === "jpeg" ? "jpg" : m[1];
        const nomeArq = `foto-${lado ? "b" : "a"}.${ext}`;
        fs.writeFileSync(path.join(DATA, nomeArq), Buffer.from(m[2], "base64"));
        cfg.lados[lado].foto = `/data/${nomeArq}?v=${Date.now()}`;
        salvar(); mandarEstado();
        return json(res, 200, { ok: true, foto: cfg.lados[lado].foto });
      }
      if (p === "/api/reconectar") { conectarLive(); return json(res, 200, { ok: true }); }
      return json(res, 404, { erro: "não encontrado" });
    }

    // fotos enviadas pelo painel
    if (p.startsWith("/data/")) {
      const nome = path.basename(p);
      if (!/^foto-[ab]\.(jpg|png|webp)$/.test(nome)) { res.writeHead(404); return res.end(); }
      return servirArquivo(res, path.join(DATA, nome));
    }
    // imagens na pasta do projeto (ícones e fotos que você subir junto)
    const nome = decodeURIComponent(p.slice(1));
    if (/^[\w\- .]+\.(png|jpe?g|webp|gif|svg)$/i.test(nome)) return servirArquivo(res, path.join(DIR, nome));
    res.writeHead(404); res.end();
  } catch (e) {
    json(res, 400, { erro: e.message });
  }
});

server.on("upgrade", (req, sock) => {
  if (!req.url.startsWith("/ws") || !req.headers["sec-websocket-key"]) return sock.destroy();
  const aceita = crypto.createHash("sha1").update(req.headers["sec-websocket-key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  sock.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + aceita + "\r\n\r\n");
  sock.setNoDelay(true);
  clientes.add(sock);
  enviar(sock, estadoPublico());
  sock.on("data", leitorWS(sock));
  sock.on("close", () => clientes.delete(sock));
  sock.on("error", () => clientes.delete(sock));
});

// batimento: mantém a conexão viva em proxies e celulares
setInterval(() => enviarTodos({ event: "hb", t: Date.now() }), 25000);

/* ======================= início ======================= */
function perguntar(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a); }));
}
(async () => {
  console.log("\n  ===== DUELO DE PRESENTES =====\n");
  if (!cfg.usuario && !NA_NUVEM && process.stdin.isTTY) {
    cfg.usuario = limparUsuario(await perguntar("  Seu usuário do TikTok (sem @): "));
    salvar();
  }
  if (NA_NUVEM && !SENHA) log("⚠ SENHA_PAINEL não definida: o painel /admin fica bloqueado até você definir.");
  await carregarLib();
  server.listen(PORTA, () => {
    log(`Overlay: http://localhost:${PORTA}   |   Painel: http://localhost:${PORTA}/admin`);
    if (!NA_NUVEM) log("NÃO feche esta janela enquanto estiver ao vivo.\n");
    conectarLive();
  });
  server.on("error", e => log(e.code === "EADDRINUSE" ? `A porta ${PORTA} já está em uso. Feche a outra janela do duelo.` : "Erro: " + e.message));
})();
