const env = require("../config/env");

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

const verificationLink = (email, code) =>
  `${env.CLIENT_URL}/verify-email?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;

const verificationEmail = ({ fullName, email, code }) => {
  const link = verificationLink(email, code);
  const minutes = env.EMAIL_CODE_TTL_MIN;
  const firstName = String(fullName || "").trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";

  const text = [
    greeting,
    "",
    `Votre code de confirmation BookStore est : ${code}`,
    "",
    `Saisissez-le sur la page de confirmation, ou ouvrez ce lien : ${link}`,
    "",
    `Ce code expire dans ${minutes} minutes.`,
    "Si vous n'avez pas cree de compte, ignorez simplement ce message.",
    "",
    "L'equipe BookStore",
  ].join("\n");

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#202124;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e3e5e8;">
            <tr>
              <td style="padding:32px 32px 8px;text-align:center;">
                <div style="font-size:22px;font-weight:bold;color:#1e1e3f;">BookStore</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;">
                <h1 style="margin:16px 0 8px;font-size:20px;font-weight:normal;color:#202124;">Confirmez votre adresse email</h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#5f6368;">
                  ${escapeHtml(greeting)} utilisez ce code pour terminer la creation de votre compte
                  <strong>${escapeHtml(email)}</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <div style="background:#f1f3f4;border-radius:10px;padding:18px;text-align:center;font-size:32px;letter-spacing:10px;font-weight:bold;color:#1e1e3f;">
                  ${escapeHtml(code)}
                </div>
                <p style="margin:12px 0 24px;font-size:12px;color:#5f6368;text-align:center;">
                  Ce code expire dans ${minutes} minutes.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;text-align:center;">
                <a href="${link}" style="display:inline-block;background:#1a73e8;color:#ffffff;text-decoration:none;font-size:14px;padding:12px 28px;border-radius:8px;">
                  Confirmer mon adresse
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <p style="margin:0;font-size:12px;line-height:20px;color:#80868b;border-top:1px solid #e3e5e8;padding-top:16px;">
                  Vous n'avez pas cree de compte BookStore ? Ignorez ce message, aucun compte
                  ne sera active sans ce code.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: `${code} est votre code de confirmation BookStore`, text, html };
};

const welcomeEmail = ({ fullName, email }) => {
  const firstName = String(fullName || "").trim().split(/\s+/)[0] || "";

  const text = [
    firstName ? `Bienvenue ${firstName},` : "Bienvenue,",
    "",
    `L'adresse ${email} est confirmee : votre compte BookStore est actif.`,
    `Bonne lecture ! ${env.CLIENT_URL}`,
    "",
    "L'equipe BookStore",
  ].join("\n");

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#202124;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e3e5e8;">
            <tr>
              <td style="padding:32px;text-align:center;">
                <div style="font-size:22px;font-weight:bold;color:#1e1e3f;margin-bottom:12px;">BookStore</div>
                <h1 style="margin:0 0 8px;font-size:20px;font-weight:normal;">Votre compte est actif</h1>
                <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#5f6368;">
                  L'adresse <strong>${escapeHtml(email)}</strong> est confirmee. Vous pouvez
                  desormais commander et suivre vos livres.
                </p>
                <a href="${env.CLIENT_URL}" style="display:inline-block;background:#1a73e8;color:#ffffff;text-decoration:none;font-size:14px;padding:12px 28px;border-radius:8px;">
                  Ouvrir la librairie
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: "Bienvenue chez BookStore", text, html };
};

const card = ({ title, body, footer = "" }) => `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#202124;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e3e5e8;">
            <tr>
              <td style="padding:32px 32px 8px;text-align:center;">
                <div style="font-size:22px;font-weight:bold;color:#1e1e3f;">BookStore</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;">
                <h1 style="margin:16px 0 8px;font-size:20px;font-weight:normal;color:#202124;">${title}</h1>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <p style="margin:0;font-size:12px;line-height:20px;color:#80868b;border-top:1px solid #e3e5e8;padding-top:16px;">
                  ${footer}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const greetingFor = (fullName) => {
  const firstName = String(fullName || "").trim().split(/\s+/)[0] || "";
  return firstName ? `Bonjour ${firstName},` : "Bonjour,";
};

const passwordResetLink = (email, code) =>
  `${env.CLIENT_URL}/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;

const passwordResetEmail = ({ fullName, email, code }) => {
  const link = passwordResetLink(email, code);
  const minutes = env.PASSWORD_RESET_TTL_MIN;
  const greeting = greetingFor(fullName);

  const text = [
    greeting,
    "",
    `Votre code de reinitialisation BookStore est : ${code}`,
    "",
    `Saisissez-le avec votre nouveau mot de passe, ou ouvrez ce lien : ${link}`,
    "",
    `Ce code expire dans ${minutes} minutes.`,
    "Si vous n'avez rien demande, ignorez ce message : votre mot de passe actuel reste valable.",
    "",
    "L'equipe BookStore",
  ].join("\n");

  const html = card({
    title: "Reinitialisez votre mot de passe",
    body: `
                <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#5f6368;">
                  ${escapeHtml(greeting)} voici le code pour choisir un nouveau mot de passe
                  sur le compte <strong>${escapeHtml(email)}</strong>.
                </p>
                <div style="background:#f1f3f4;border-radius:10px;padding:18px;text-align:center;font-size:32px;letter-spacing:10px;font-weight:bold;color:#1e1e3f;">
                  ${escapeHtml(code)}
                </div>
                <p style="margin:12px 0 24px;font-size:12px;color:#5f6368;text-align:center;">
                  Ce code expire dans ${minutes} minutes.
                </p>
                <div style="text-align:center;">
                  <a href="${link}" style="display:inline-block;background:#1a73e8;color:#ffffff;text-decoration:none;font-size:14px;padding:12px 28px;border-radius:8px;">
                    Choisir un nouveau mot de passe
                  </a>
                </div>`,
    footer:
      "Vous n'avez rien demande ? Ignorez ce message : sans ce code, personne ne peut changer votre mot de passe.",
  });

  return { subject: `${code} est votre code de reinitialisation BookStore`, text, html };
};

const passwordChangedEmail = ({ fullName, email }) => {
  const greeting = greetingFor(fullName);

  const text = [
    greeting,
    "",
    `Le mot de passe du compte BookStore ${email} vient d'etre modifie.`,
    "Toutes les sessions ouvertes auparavant ont ete deconnectees.",
    "",
    "Ce n'etait pas vous ? Utilisez immediatement \"Mot de passe oublie\" sur",
    `${env.CLIENT_URL}/forgot-password pour reprendre la main sur votre compte.`,
    "",
    "L'equipe BookStore",
  ].join("\n");

  const html = card({
    title: "Votre mot de passe a ete modifie",
    body: `
                <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#5f6368;">
                  ${escapeHtml(greeting)} le mot de passe du compte
                  <strong>${escapeHtml(email)}</strong> vient d'etre change. Toutes les
                  sessions ouvertes auparavant ont ete deconnectees.
                </p>`,
    footer: `Ce n'etait pas vous ? Reprenez la main via
                  <a href="${env.CLIENT_URL}/forgot-password" style="color:#1a73e8;">Mot de passe oublie</a>.`,
  });

  return { subject: "Votre mot de passe BookStore a ete modifie", text, html };
};

module.exports = {
  verificationEmail,
  welcomeEmail,
  verificationLink,
  passwordResetEmail,
  passwordChangedEmail,
  passwordResetLink,
};
