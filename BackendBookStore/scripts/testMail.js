const env = require("../config/env");
const { sendMail, verifyMailTransport } = require("../utils/mailer");
const { verificationEmail } = require("../Services/emailTemplates");

const explain = (error) => {
  const code = error.code || "";
  const message = String(error.message || "");

  if (code === "EAUTH" || message.includes("535")) {
    return [
      "Google a refuse les identifiants.",
      "  - SMTP_PASS doit etre un MOT DE PASSE D'APPLICATION (16 caracteres),",
      "    pas le mot de passe du compte Google : celui-ci est toujours refuse.",
      "  - Il s'obtient sur https://myaccount.google.com/apppasswords, et cette",
      "    page n'existe que si la validation en deux etapes est activee.",
      "  - Les espaces affiches par Google ne comptent pas, avec ou sans.",
      "  - SMTP_USER doit etre l'adresse complete, @gmail.com compris.",
    ].join("\n");
  }

  if (code === "ETIMEDOUT" || code === "ESOCKET" || code === "ECONNECTION") {
    return [
      "Aucune connexion au serveur SMTP.",
      `  - Verifiez SMTP_HOST=${env.SMTP_HOST} et SMTP_PORT=${env.SMTP_PORT}.`,
      "  - Le port 587 est souvent bloque par un pare-feu ou un reseau d'entreprise.",
      "  - En 465, il faut aussi SMTP_SECURE=true.",
    ].join("\n");
  }

  if (code === "EENVELOPE") {
    return "Adresse d'expedition ou de destination refusee : verifiez MAIL_FROM et le destinataire.";
  }

  return `Echec SMTP (${code || "sans code"}).`;
};

const run = async () => {
  const to = process.argv[2] || env.SMTP_USER;

  console.log("\nTest d'envoi SMTP\n");
  console.log(`  SMTP_HOST   ${env.SMTP_HOST || "(vide)"}`);
  console.log(`  SMTP_PORT   ${env.SMTP_PORT}`);
  console.log(`  SMTP_SECURE ${env.SMTP_SECURE}`);
  console.log(`  SMTP_USER   ${env.SMTP_USER || "(vide)"}`);
  console.log(
    `  SMTP_PASS   ${
      env.SMTP_PASS ? `${env.SMTP_PASS.replace(/\s/g, "").length} caracteres` : "(vide)"
    }`,
  );
  console.log(`  MAIL_FROM   ${env.MAIL_FROM}`);
  console.log(`  destinataire ${to || "(aucun)"}\n`);

  if (!env.mailEnabled) {
    console.error(
      "SMTP_HOST est vide : rien ne sera envoye, le code s'imprime dans la console.\n" +
        "Renseignez SMTP_HOST / SMTP_USER / SMTP_PASS dans BackendBookStore/.env.",
    );
    process.exit(1);
  }

  if (!to) {
    console.error("Aucun destinataire : passez-en un en argument ou renseignez SMTP_USER.");
    process.exit(1);
  }

  console.log("1/2  connexion et authentification...");
  const transport = require("nodemailer").createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  try {
    await transport.verify();
    console.log("     OK : le serveur accepte les identifiants.\n");
  } catch (error) {
    console.error(`     ECHEC : ${error.message}\n`);
    console.error(explain(error));
    process.exit(1);
  }

  console.log("2/2  envoi du message de confirmation...");
  const delivered = await sendMail({
    to,
    ...verificationEmail({
      fullName: "Test BookStore",
      email: to,
      code: "123456",
    }),
  });

  if (!delivered) {
    console.error("     ECHEC : voir l'erreur [mail] ci-dessus.");
    process.exit(1);
  }

  console.log(`     OK : message remis au serveur, destination ${to}.`);
  console.log(
    "\nRegardez la boite de reception (et les spams au premier envoi).\n" +
      "Le code affiche est 123456 : c'est un exemple, aucun compte n'y est lie.\n",
  );
  process.exit(0);
};

run().catch((error) => {
  console.error("\nErreur inattendue :", error.message);
  process.exit(1);
});
