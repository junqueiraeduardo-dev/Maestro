/**
 * src/pay.ts — Pagamento (Mercado Pago Checkout Pro) + entrega da chave.
 *
 * SEGURANÇA (prioridade máxima):
 *  - O cartão/Pix é digitado no CHECKOUT HOSPEDADO do Mercado Pago.
 *    Nosso servidor NUNCA recebe número de cartão/CVV. Zero dado de
 *    cartão no código, no banco ou nos logs.
 *  - Preço é definido no SERVIDOR (cliente não escolhe valor).
 *  - Webhook só é aceito com ASSINATURA válida (MP_WEBHOOK_SECRET).
 *  - Idempotente por mp_payment_id (não emite chave 2x).
 *  - Segredos só em variáveis de ambiente (nunca no repositório).
 *
 * ENTREGA DA CHAVE (zero custo, sem e-mail):
 *  Hoje a chave Premium é guardada como HASH (sha256) — segura, mas opaca.
 *  Para entregar SEM e-mail (evita comprar domínio pro Resend), também
 *  guardamos a chave EM TEXTO por 7 dias em `chave_temp` (col. nova migr. 14).
 *  O frontend, depois do redirect do MP com payment_id, busca em
 *  GET /api/pay/chave?payment_id=X e mostra na tela com botão "Copiar".
 *  Depois de 7 dias o campo zera; recuperação volta a ser via e-mail
 *  (se algum dia configurado) ou contato com suporte.
 */
import { Request, Response } from "express";
import crypto from "crypto";
import { supabase } from "./config/supabase";

// Quanto tempo a chave em texto vive na tabela (apenas pra entrega na tela).
// Reduzido pra 24h: janela suficiente pro cliente copiar/usar; minimiza
// exposição em caso de leak do DB. Recuperação após 24h: "Perdi minha chave"
// no login com o payment_id retorna 410 e cliente fala com suporte.
const CHAVE_TEMP_TTL_MS = 24 * 3600_000;

// Janela aceitável de timestamp do webhook (defesa contra replay tardio).
// MP envia o `ts` no header x-signature. Aceitamos ±5 min do nosso relógio.
// Webhooks legítimos chegam em segundos; ataques replay capturam e
// retransmitem horas depois (atacante que comprometeu rede da CDN, etc.).
const WEBHOOK_TS_WINDOW_MS = 5 * 60 * 1000;

const httpFetch: any = (globalThis as any).fetch;

// Preços e duração — AUTORIDADE É O SERVIDOR.
const PLANOS: Record<string, { preco: number; dias: number; nome: string }> = {
  mensal: { preco: 89.0, dias: 30, nome: "Maestro Premium · Mensal" },
  anual: { preco: 801.0, dias: 365, nome: "Maestro Premium · Anual" },
  equipe: { preco: 80.1, dias: 30, nome: "Maestro Premium · Equipe (até 25)" },
};

function baseUrl(req: Request): string {
  return (
    process.env.APP_URL ||
    `${req.headers["x-forwarded-proto"] || req.protocol}://${req.headers.host}`
  );
}
function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}
function geraChave(): string {
  const r = crypto.randomBytes(9).toString("hex").toUpperCase(); // 18 hex
  return `MA-${r.slice(0, 6)}-${r.slice(6, 12)}-${r.slice(12, 18)}`;
}

// ---- e-mail (Resend) — só envia a chave; sem outros dados sensíveis ----
async function enviarEmail(para: string, chave: string, plano: string, validade: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "Maestro <no-reply@maestro.app>";
  const corpo = `Sua assinatura Maestro Premium (${plano}) está ativa.

Sua chave de acesso Premium:

    ${chave}

Use esta chave na tela de login, em "Já sou Premium".
Válida até ${validade}. Renove o pagamento para continuar após essa data.

Não compartilhe esta chave.`;
  if (!key) {
    // Sem provedor de e-mail configurado (modo zero-custo): no-op silencioso.
    // A chave NÃO é logada — vazaria credencial sensível pros logs do Render
    // (LGPD + sec ops). Recuperação fica por conta de:
    //   1) Tela do pagamento (chave aparece automaticamente)
    //   2) "Perdi minha chave" no login (usa payment_id, vale 24h)
    return;
  }
  try {
    await httpFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: para,
        subject: "Sua chave Maestro Premium",
        text: corpo,
      }),
    });
  } catch (e: any) {
    console.error("[pay] falha ao enviar e-mail:", e?.message ?? e);
  }
}

// =====================================================================
// GET /api/pay/planos — preços (público, só leitura)
// =====================================================================
export function payPlanos(_req: Request, res: Response) {
  res.json({
    planos: Object.entries(PLANOS).map(([id, p]) => ({
      id,
      nome: p.nome,
      preco: p.preco,
      dias: p.dias,
    })),
  });
}

// =====================================================================
// POST /api/pay/checkout {email, plano} -> URL do checkout hospedado
// =====================================================================
export async function payCheckout(req: Request, res: Response) {
  try {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token)
      return res
        .status(503)
        .json({ erro: "Pagamento não configurado no servidor." });

    const email = String(req.body?.email ?? "").trim().toLowerCase().slice(0, 160);
    const plano = String(req.body?.plano ?? "").trim();
    if (!email || !/.+@.+\..+/.test(email))
      return res.status(400).json({ erro: "Informe um e-mail válido." });
    const P = PLANOS[plano];
    if (!P) return res.status(400).json({ erro: "Plano inválido." });

    const url = baseUrl(req);
    const pref = {
      items: [
        {
          title: P.nome,
          quantity: 1,
          currency_id: "BRL",
          unit_price: P.preco, // preço do servidor
        },
      ],
      payer: { email },
      // email|plano volta no webhook (assinado) para sabermos o que liberar
      external_reference: `${email}|${plano}`,
      back_urls: { success: url, failure: url, pending: url },
      auto_return: "approved",
      notification_url: `${url}/api/pay/webhook`,
      statement_descriptor: "MAESTRO",
    };

    const r = await httpFetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pref),
      }
    );
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !(j.init_point || j.sandbox_init_point)) {
      console.error("[pay] preference falhou:", j?.message ?? r.status);
      return res.status(502).json({ erro: "Falha ao iniciar pagamento." });
    }
    res.json({ url: j.init_point || j.sandbox_init_point });
  } catch (err: any) {
    console.error("[pay] checkout:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao iniciar pagamento." });
  }
}

// =====================================================================
// POST /api/pay/webhook — Mercado Pago confirma o pagamento
// Aceito SOMENTE com assinatura válida (x-signature + MP_WEBHOOK_SECRET).
// =====================================================================
export async function payWebhook(req: Request, res: Response) {
  try {
    const token = process.env.MP_ACCESS_TOKEN;
    const segredo = process.env.MP_WEBHOOK_SECRET;
    // Fail-closed: sem segredo configurado, NÃO processa (segurança).
    if (!token || !segredo) {
      console.warn("[pay] webhook sem MP_ACCESS_TOKEN/MP_WEBHOOK_SECRET");
      return res.status(503).end();
    }

    const dataId = String(
      (req.body && req.body.data && req.body.data.id) ||
        (req.query && (req.query as any)["data.id"]) ||
        ""
    );
    const sigHeader = String(req.headers["x-signature"] || "");
    const reqId = String(req.headers["x-request-id"] || "");
    const parts = Object.fromEntries(
      sigHeader.split(",").map((kv) => {
        const [k, v] = kv.split("=");
        return [k && k.trim(), v && v.trim()];
      })
    );
    const ts = parts["ts"];
    const v1 = parts["v1"];
    if (!dataId || !ts || !v1) return res.status(401).end();

    // ---- Defesa contra REPLAY ATTACK (além da idempotência por payment_id) ----
    // O MP envia `ts` em milissegundos. Rejeita se for muito velho ou muito
    // futuro (diferença de relógio + replay tardio). Mesmo se atacante captura
    // a requisição assinada, ela "morre" depois de 5 min.
    const tsMs = parseInt(ts, 10);
    if (!Number.isFinite(tsMs)) {
      console.warn("[pay] webhook ts inválido");
      return res.status(401).end();
    }
    const skew = Math.abs(Date.now() - tsMs);
    if (skew > WEBHOOK_TS_WINDOW_MS) {
      console.warn(`[pay] webhook fora da janela (${skew}ms)`);
      return res.status(401).end();
    }

    const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
    const expected = crypto
      .createHmac("sha256", segredo)
      .update(manifest)
      .digest("hex");
    const ok =
      v1.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
    if (!ok) {
      console.warn("[pay] webhook assinatura inválida");
      return res.status(401).end();
    }

    // Busca o pagamento na API do MP (fonte da verdade).
    const pr = await httpFetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const pay = await pr.json().catch(() => ({}));
    if (!pr.ok) return res.status(200).end(); // 200 evita retentativa infinita
    if (pay.status !== "approved") return res.status(200).end();

    const mpId = String(pay.id);
    // Idempotência: já emitiu p/ esse pagamento?
    const { data: existe } = await supabase
      .from("assinaturas")
      .select("id")
      .eq("mp_payment_id", mpId)
      .maybeSingle();
    if (existe) return res.status(200).end();

    const ref = String(pay.external_reference || "");
    const [emailRef, planoRef] = ref.split("|");
    const email = (emailRef || pay.payer?.email || "").toLowerCase().trim();
    const plano = PLANOS[planoRef] ? planoRef : "mensal";
    if (!email) return res.status(200).end();

    // -------- DEFESA EM PROFUNDIDADE: validar valor + moeda --------
    // Mesmo que a preference seja criada server-side (atacante não consegue
    // mexer no preço), conferimos o valor do pagamento contra o plano
    // declarado em external_reference. Se vier menor que o esperado
    // (atacante explorando alguma falha futura ou no MP), recusa silente.
    //
    // Currency check: MP suporta múltiplas moedas. Se de algum jeito o pagto
    // vier em ARS/USD com valor numérico parecido, equivaleria a 1/5 do preço.
    // Forçamos BRL.
    const valorPago = Number(pay.transaction_amount || 0);
    const valorEsperado = PLANOS[plano].preco;
    const moeda = String(pay.currency_id || "");
    if (moeda !== "BRL") {
      console.warn(`[pay] moeda inesperada: ${moeda} (esperado BRL)`);
      return res.status(200).end();
    }
    // Tolerância de 1% para arredondamento (defesa, não rigor financeiro)
    if (valorPago < valorEsperado * 0.99) {
      console.warn(
        `[pay] valor abaixo do esperado: pago R$${valorPago} < esperado R$${valorEsperado} (plano ${plano})`
      );
      return res.status(200).end();
    }

    const chave = geraChave();
    const validoAte = new Date(Date.now() + PLANOS[plano].dias * 86400_000);
    const chaveTempUntil = new Date(Date.now() + CHAVE_TEMP_TTL_MS);

    const { error } = await supabase.from("assinaturas").insert({
      email,
      chave_hash: sha256Hex(chave),
      plano,
      status: "ativa",
      valido_ate: validoAte.toISOString(),
      mp_payment_id: mpId,
      // Chave em texto p/ entrega na tela (TTL 7d). Apaga sozinha lazy
      // quando o GET /api/pay/chave vê que `chave_temp_until` passou.
      chave_temp: chave,
      chave_temp_until: chaveTempUntil.toISOString(),
    });
    if (error) {
      console.error("[pay] insert assinatura:", error.message);
      return res.status(200).end();
    }

    // E-mail é OPCIONAL agora — a tela já entrega a chave instantaneamente.
    // Se RESEND_API_KEY estiver setado, envia como backup. Senão, no-op.
    await enviarEmail(
      email,
      chave,
      PLANOS[plano].nome,
      validoAte.toLocaleDateString("pt-BR")
    );
    return res.status(200).end();
  } catch (err: any) {
    console.error("[pay] webhook:", err?.message ?? err);
    return res.status(200).end();
  }
}

/**
 * Valida uma chave digitada no login contra assinaturas ativas.
 * Retorna a expiração (ms) se válida; senão null. Comparação por hash.
 */
export async function validarChaveAssinatura(
  senha: string
): Promise<number | null> {
  try {
    const hash = sha256Hex(senha);
    const { data } = await supabase
      .from("assinaturas")
      .select("valido_ate,status")
      .eq("chave_hash", hash)
      .eq("status", "ativa")
      .order("valido_ate", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const exp = new Date(data.valido_ate).getTime();
    return exp > Date.now() ? exp : null;
  } catch {
    return null;
  }
}

// =====================================================================
// GET /api/pay/chave?payment_id=X — entrega a chave em texto na tela.
//
// Como funciona:
//  1. Mercado Pago redireciona pra "?status=approved&payment_id=12345"
//  2. Frontend chama este endpoint com o payment_id
//  3. Devolve a chave + dados da assinatura, válido por 7 dias após o pagto.
//
// Segurança:
//  - É público (sem token), mas exige conhecer o `payment_id` exato do MP
//    (~10-12 dígitos numéricos não-enumeráveis na prática).
//  - A chave em texto vive 7 dias; passou disso, retorna 410 Gone.
//  - Lazy cleanup: se o registro está expirado, zera chave_temp ao consultar.
// =====================================================================
export async function payChave(req: Request, res: Response) {
  try {
    const paymentId = String(req.query.payment_id || "").trim();
    if (!paymentId || !/^\d{6,20}$/.test(paymentId))
      return res.status(400).json({ erro: "payment_id inválido." });

    const { data, error } = await supabase
      .from("assinaturas")
      .select("email, plano, valido_ate, chave_temp, chave_temp_until, status")
      .eq("mp_payment_id", paymentId)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      // Pagamento ainda não processado (webhook pode demorar) ou ID falso.
      return res
        .status(404)
        .json({ erro: "Pagamento ainda não confirmado.", pendente: true });
    }
    if (data.status !== "ativa") {
      return res
        .status(410)
        .json({ erro: "Assinatura não está mais ativa." });
    }

    const untilMs = data.chave_temp_until
      ? new Date(data.chave_temp_until).getTime()
      : 0;
    const ainda = data.chave_temp && untilMs > Date.now();

    if (!ainda) {
      // Janela de 7 dias passou: limpa o campo sob demanda (lazy cleanup).
      if (data.chave_temp) {
        await supabase
          .from("assinaturas")
          .update({ chave_temp: null, chave_temp_until: null })
          .eq("mp_payment_id", paymentId);
      }
      return res.status(410).json({
        erro: "A janela de 7 dias para mostrar a chave nesta tela expirou.",
        expirou: true,
      });
    }

    const planoNome = PLANOS[data.plano]?.nome || "Maestro Premium";
    return res.json({
      chave: data.chave_temp,
      email: data.email,
      plano: data.plano,
      planoNome,
      valido_ate: data.valido_ate,
    });
  } catch (err: any) {
    console.error("[pay] chave:", err?.message ?? err);
    return res.status(500).json({ erro: "Falha ao buscar a chave." });
  }
}
