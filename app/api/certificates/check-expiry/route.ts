import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendExpiryNotification } from '@/lib/email';

/**
 * GET /api/certificates/check-expiry
 * Kontroluje certifikáty, ktoré expirujú za menej ako 30 dní
 * a odošle email notifikácie
 */
export async function GET() {
  try {
    // Aktuálny dátum
    const now = new Date();

    // Dátum o 30 dní
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Nájdenie certifikátov, ktoré expirujú do 30 dní a ešte nebola odoslaná notifikácia
    const expiringCertificates = await prisma.certificate.findMany({
      where: {
        expiryDate: {
          lte: thirtyDaysFromNow, // Menej alebo rovné ako 30 dní
        },
        notificationSent: false, // Ešte nebola odoslaná notifikácia
        emailAddress: {
          not: null, // Iba certifikáty s emailovou adresou
        },
      },
    });

    if (expiringCertificates.length === 0) {
      return NextResponse.json(
        { message: 'Žiadne certifikáty na odoslanie notifikácií', count: 0 },
        { status: 200 }
      );
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Odoslanie emailov pre každý certifikát
    for (const certificate of expiringCertificates) {
      // Výpočet zostávajúcich dní
      const timeDiff = certificate.expiryDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

      try {
        // Odoslanie email notifikácie
        const emailResult = await sendExpiryNotification({
          certificateName: certificate.name,
          expiryDate: certificate.expiryDate,
          daysRemaining: daysRemaining,
          recipientEmail: certificate.emailAddress!,
        });

        if (emailResult.success) {
          // Označenie notifikácie ako odoslanej
          await prisma.certificate.update({
            where: { id: certificate.id },
            data: { notificationSent: true },
          });

          successCount++;
          results.push({
            id: certificate.id,
            name: certificate.name,
            status: 'success',
            email: certificate.emailAddress,
            daysRemaining,
          });
        } else {
          failureCount++;
          results.push({
            id: certificate.id,
            name: certificate.name,
            status: 'failed',
            email: certificate.emailAddress,
            daysRemaining,
            error: emailResult.error || 'Neznáma chyba',
          });
        }
      } catch (error: any) {
        console.error(`Chyba pri odosielaní notifikácie pre certifikát ${certificate.id}:`, error);
        failureCount++;
        results.push({
          id: certificate.id,
          name: certificate.name,
          status: 'error',
          email: certificate.emailAddress,
          daysRemaining,
          error: error?.message || error?.toString() || 'Chyba pri odosielaní emailu',
        });
      }
    }

    return NextResponse.json(
      {
        message: `Kontrola dokončená. Úspešne: ${successCount}, Chyby: ${failureCount}`,
        totalChecked: expiringCertificates.length,
        successCount,
        failureCount,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Chyba pri kontrole certifikátov:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa skontrolovať certifikáty' },
      { status: 500 }
    );
  }
}
