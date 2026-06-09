/**
 * src/mailer.ts — envio de e-mail transacional via Brevo (API HTTP).
 *
 * POR QUE HTTP (e não SMTP/nodemailer): o Render BLOQUEIA portas SMTP de saída
 * (25/465/587) como política anti-spam — qualquer SMTP dá "Connection timeout".
 * A API HTTP da Brevo fala na 443, que é liberada.
 *
 * Custo zero: plano grátis da Brevo (300 e-mails/dia). Sem domínio próprio —
 * basta verificar UM remetente (single sender) no painel da Brevo.
 *
 * Config por env:
 *   BREVO_API_KEY      chave da API (Brevo → SMTP & API → API Keys)
 *   MAIL_SENDER        e-mail do remetente VERIFICADO na Brevo
 *                      (ex.: junqueiraeduardo2@gmail.com)
 *   MAIL_SENDER_NAME   (opcional) nome de exibição; default "Maestro"
 *
 * FALHA ABERTA: sem BREVO_API_KEY/MAIL_SENDER, só loga e retorna false — o
 * fluxo de reset não quebra (quem chama loga o link em dev).
 */
const httpFetch: any = (globalThis as any).fetch;

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Envia um e-mail via Brevo. Retorna true se a API aceitou (HTTP 2xx), false
 * se faltou config, a API recusou ou houve erro de rede. Nunca lança.
 */
export async function enviarEmail(
  para: string,
  assunto: string,
  texto: string,
  html?: string
): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.MAIL_SENDER || process.env.GMAIL_USER;
  const senderName = process.env.MAIL_SENDER_NAME || "Maestro";
  if (!apiKey || !senderEmail) {
    console.warn(
      `[mailer] Brevo não configurado (BREVO_API_KEY/MAIL_SENDER) — e-mail NÃO enviado (assunto="${assunto}").`
    );
    return false;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    let resp: any;
    try {
      resp = await httpFetch(BREVO_URL, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: para }],
          subject: assunto,
          textContent: texto,
          ...(html ? { htmlContent: html } : {}),
        }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => "");
      console.error(
        `[mailer] Brevo recusou (HTTP ${resp.status}): ${String(corpo).slice(0, 300)}`
      );
      return false;
    }
    return true;
  } catch (e: any) {
    console.error("[mailer] falha ao enviar:", e?.message ?? e);
    return false;
  }
}
