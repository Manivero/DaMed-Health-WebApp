const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendMail = (to, subject, text) =>
  transporter.sendMail({
    from: `"Health App" <${process.env.MAIL_USER}>`,
    to,
    subject,
    text,
  });

module.exports = sendMail;
