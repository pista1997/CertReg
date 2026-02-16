import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * DELETE /api/certificates/[id]
 * Zmaže certifikát podľa ID
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    // Kontrola či ID je číslo
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Neplatné ID certifikátu' },
        { status: 400 }
      );
    }

    // Kontrola či certifikát existuje
    const existingCertificate = await prisma.certificate.findUnique({
      where: { id },
    });

    if (!existingCertificate) {
      return NextResponse.json(
        { error: 'Certifikát nebol najdený' },
        { status: 404 }
      );
    }

    // Zmazanie certifikátu
    await prisma.certificate.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Certifikát bol úspešne zmazaný' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Chyba pri mazaní certifikátu:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa zmazať certifikát' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/certificates/[id]
 * Aktualizuje certifikát
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, expiryDate, emailAddress } = body;

    // Kontrola či ID je číslo
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Neplatné ID certifikátu' },
        { status: 400 }
      );
    }

    // Validácia vstupných údajov
    if (!name || !expiryDate) {
      return NextResponse.json(
        { error: 'Názov a dátum expirácie sú povinné' },
        { status: 400 }
      );
    }

    // Validácia emailovej adresy (ak je vyplnený)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailAddress && emailAddress.trim() && !emailRegex.test(emailAddress)) {
      return NextResponse.json(
        { error: 'Neplatná emailová adresa' },
        { status: 400 }
      );
    }

    // Kontrola či certifikát existuje
    const existingCertificate = await prisma.certificate.findUnique({
      where: { id },
    });

    if (!existingCertificate) {
      return NextResponse.json(
        { error: 'Certifikát nebol najdený' },
        { status: 404 }
      );
    }

    // Aktualizácia certifikátu
    const certificate = await prisma.certificate.update({
      where: { id },
      data: {
        name,
        expiryDate: new Date(expiryDate),
        emailAddress: emailAddress && emailAddress.trim() ? emailAddress.trim() : null,
        notificationSent: false, // Reset notifikácie pri zmene dátumu
      },
    });

    return NextResponse.json(
      { message: 'Certifikát bol úspešne aktualizovaný', certificate },
      { status: 200 }
    );
  } catch (error) {
    console.error('Chyba pri aktualizácii certifikátu:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa aktualizovať certifikát' },
      { status: 500 }
    );
  }
}
