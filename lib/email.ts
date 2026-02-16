import nodemailer from 'nodemailer';
import { format } from 'date-fns';

// Konfigurácia SMTP transportéra
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true pre port 465, false pre ostatné porty
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailData {
  certificateName: string;
  expiryDate: Date;
  daysRemaining: number;
  recipientEmail: string;
}

interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Funkcia pre odoslanie email notifikácie o expirácii certifikátu
 */
export async function sendExpiryNotification(data: EmailData): Promise<EmailResult> {
  const { certificateName, expiryDate, daysRemaining, recipientEmail } = data;

  // Formátovanie dátumu na slovenský formát
  const formattedDate = format(expiryDate, 'dd.MM.yyyy');

  // Email predmet
  const subject = `⚠️ Certifikát čoskoro expiruje - ${certificateName}`;

  // Email telo v HTML formáte
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f97316; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f97316; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .warning { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">⚠️ Upozornenie na expiráciu certifikátu</h2>
          </div>
          <div class="content">
            <p>Dobrý deň,</p>
            <p>upozorňujeme Vás, že certifikát <strong>"${certificateName}"</strong> čoskoro expiruje.</p>
            
            <div class="info-box">
              <p style="margin: 5px 0;"><strong>Názov certifikátu:</strong> ${certificateName}</p>
              <p style="margin: 5px 0;"><strong>Dátum expirácie:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;" class="warning"><strong>Zostáva:</strong> ${daysRemaining} ${daysRemaining === 1 ? 'deň' : daysRemaining < 5 ? 'dni' : 'dní'}</p>
            </div>
            
            <p><strong>Prosím, obnovte certifikát čo najskôr.</strong></p>
            
            <p style="margin-top: 20px;">S pozdravom,<br><strong>Certificate Registry System</strong></p>
          </div>
          <div class="footer">
            <p>Toto je automaticky generovaná správa. Neodpovedajte na tento email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Textová verzia emailu (fallback pre klientov bez HTML podpory)
  const textContent = `
Dobrý deň,

upozorňujeme Vás, že certifikát "${certificateName}" čoskoro expiruje.

Dátum expirácie: ${formattedDate}
Zostáva: ${daysRemaining} ${daysRemaining === 1 ? 'deň' : daysRemaining < 5 ? 'dni' : 'dní'}

Prosím, obnovte certifikát čo najskôr.

S pozdravom,
Certificate Registry System
  `;

  try {
    // Odoslanie emailu
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipientEmail,
      subject: subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`Email notifikácia úspešne odoslaná na: ${recipientEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('Chyba pri odosielaní emailu:', error);
    const errorMessage = error?.message || error?.toString() || 'Neznáma chyba';
    return { success: false, error: errorMessage };
  }
}

/**
 * Funkcia pre overenie SMTP konfigurácie
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('SMTP konfigurácia je v poriadku');
    return true;
  } catch (error) {
    console.error('Chyba v SMTP konfigurácii:', error);
    return false;
  }
}
