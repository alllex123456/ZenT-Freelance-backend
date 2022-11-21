const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: true,
  auth: {
    user: 'admin@zent-freelance.com',
    pass: 'andaluzia231178',
  },
});

exports.signupEmail = (recipient) => {
  transporter.sendMail({
    from: 'ZenT-Freelance <admin@zent-freelance.com>',
    to: `<${recipient.email}>`,
    subject:
      recipient.language === 'ro'
        ? 'Confirmarea înregistrării în sistemul ZenT-Freelance'
        : 'Confirmation of your ZenT-Freelance account',
    html:
      recipient.language === 'ro'
        ? `<html><body><h4>Prin acest mesaj vi se confirmă înregistrarea ca utilizator în sistemul ZenT-Freelance.</h4><p>CONDIȚII DE UTILIZARE</p><ul><li>Acest program este în variantă BETA și poate prezenta probleme de fiabilitate până la ieșirea din faza de testare.</li><li>La fel ca în cazul oricărui software, funcționarea neîntreruptă și fără erori nu este garantată.</li><li>Cu toate acestea, au fost implementate toate măsurile pentru a împiedica pierderea de date.</li><li>Vă rugăm să raportați orice probleme de funcționare către această adresă de email.</li></ul></body></html>`
        : `<html><body><h4>This is to confirm your account registration on ZenT-Freelance.</h4><p>USER TERMS</p><ul><li>This software is in BETA version and may have reliability issues until testing is finished.</li><li>As in any other software, uninterrupted and error-free operation is not guaranteed.</li><li>Nonetheless, all measures have been taken to prevent data loss.</li><li>Please report any issues to this email.</li></ul></body></html>`,
  });
};

exports.resetPasswordLink = (recipient, token) => {
  transporter.sendMail({
    from: 'ZenT-Freelance <admin@zent-freelance.com>',
    to: `<${recipient.email}>`,
    subject:
      recipient.language === 'ro'
        ? 'Resetare parolă ZenT-Freelance'
        : 'ZenT-Freelance password reset',
    html:
      recipient.language === 'ro'
        ? `<html><body><h4>Mergeți la următorul link pentru resetarea parolei în ZenT-Freelance:</h4><a href="http://localhost:3000/reset-password?email=${recipient.email}&token=${token}">RESETARE</a><p>Link-ul pentru resetarea parolei este valabil 1 oră.</p></body></html>`
        : `<html><body><h4>Please go to the following link to reset your ZenT-Freelance password:</h4><a href="http://localhost:3000/reset-password?email=${recipient.email}&token=${token}">RESET</a><p>the password reset link is valid for 1 hour.</p></body></html>`,
  });
};
