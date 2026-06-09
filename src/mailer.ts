/**
 * src/mailer.ts — envio de e-mail transacional via Gmail SMTP (nodemailer).
 *
 * Custo zero: usa a própria conta Gmail do dono com uma "Senha de app"
 * (myaccount.google.com/apppasswords). Configura por env:
 *   GMAIL_USER           e-mail da conta (ex.: voce@gmail.com)
 *   GMAIL_APP_PASSWORD   senha de app de 16 chars (NÃO a senha normal)
 *   MAIL_FROM (opcional) remetente exibido; default "Maestro <GMAIL_USER>"
 *
 * FALHA ABERTA EM DEV: sem credencial OU sem o pacote `nodemailer` instalado,
 * `enviarEmail` apenas loga e retorna false — o fluxo que depende dele (reset
 * de senha) não quebra. Quem chama é responsável por, em dev, logar o link.
 *
 * `nodemailer` é carregado por import DINÂMICO: o app sobe normalmente mesmo
 * que o pacote ainda não esteja instalado (o transporter só é exigido quando
 * há credencial configurada).
 */
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;
let cargaTentada = false;

async function getTransporter(): Promise<Transporter | null> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;        // sem credencial → fallback
  if (transporter) return transporter;
  if (cargaTentada) return null;          // já falhou em carregar; não re-tenta
  cargaTentada = true;
  try {
    const { createTransport } = await import("nodemailer");
    transporter = createTransport({ service: "gmail", auth: { user, pass } });
    return transporter;
  } catch (e: any) {
    console.warn("[mailer] nodemailer indisponível:", e?.message ?? e);
    return null;
  }
}

/**
 * Envia um e-mail. Retorna true se entregou ao SMTP, false se caiu no fallback
 * (sem credencial/pacote) ou se o envio falhou. Nunca lança.
 */
export async function enviarEmail(
  para: string,
  assunto: string,
  texto: string,
  html?: string
): Promise<boolean> {
  const t = await getTransporter();
  // From SEMPRE a conta Gmail autenticada (o Gmail reescreve/rejeita qualquer
  // outro endereço). NÃO usar MAIL_FROM aqui: essa env é do envio via Resend
  // em pay.ts — reaproveitá-la mandaria um remetente inválido pro Gmail.
  const from = `Maestro <${process.env.GMAIL_USER || "no-reply@maestro.app"}>`;
  if (!t) {
    console.warn(
      `[mailer] SMTP não configurado — e-mail NÃO enviado (assunto="${assunto}").`
    );
    return false;
  }
  try {
    await t.sendMail({ from, to: para, subject: assunto, text: texto, html });
    return true;
  } catch (e: any) {
    console.error("[mailer] falha ao enviar:", e?.message ?? e);
    return false;
  }
}
