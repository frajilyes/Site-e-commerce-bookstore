const nodemailer = require("nodemailer");
const env = require("../config/env");

let transport = null;

const createTransport = () => {
  if (!env.mailEnabled) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
};

const getTransport = () => {
  if (!transport) transport = createTransport();
  return transport;
};

const sendMail = async ({ to, subject, text, html }) => {
  try {
    const info = await getTransport().sendMail({
      from: env.MAIL_FROM,
      to,
      subject,
      text,
      html,
    });

    if (!env.mailEnabled) {
      if (!env.isTest) {
        console.log(
          `[mail] SMTP non configure — message destine a ${to} non envoye.\n` +
            `[mail] Sujet : ${subject}\n` +
            `[mail] ----- corps texte -----\n${text}\n[mail] -----------------------`,
        );
      }
      return false;
    }

    if (!env.isProduction) console.log(`[mail] ${subject} -> ${to} (${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[mail] envoi vers ${to} echoue : ${error.message}`);
    return false;
  }
};

const verifyMailTransport = async () => {
  if (!env.mailEnabled) {
    if (env.isTest) return false;
    console.warn(
      "[mail] SMTP non configure (SMTP_HOST vide) : les emails de confirmation " +
        "seront imprimes dans cette console au lieu d'etre envoyes.",
    );
    return false;
  }

  try {
    await getTransport().verify();
    console.log(`[mail] SMTP pret sur ${env.SMTP_HOST}:${env.SMTP_PORT}`);
    return true;
  } catch (error) {
    console.error(`[mail] SMTP injoignable : ${error.message}`);
    return false;
  }
};

const isEnabled = () => env.mailEnabled;

module.exports = { sendMail, verifyMailTransport, getTransport, isEnabled };
