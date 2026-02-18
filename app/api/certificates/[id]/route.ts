import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helper';

/**
 * DELETE /api/certificates/[id]
 * Zmaže certifikát podľa ID
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Kontrola autentifikácie
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

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
  // Kontrola autentifikácie
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, validFrom, expiryDate, emailAddress } = body;

    // Kontrola či ID je číslo
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Neplatné ID certifikátu' },
        { status: 400 }
      );
    }

    // Validácia vstupných údajov
    if (!name || !validFrom || !expiryDate) {
      return NextResponse.json(
        { error: 'Názov, dátum platnosti od a dátum expirácie sú povinné' },
        { status: 400 }
      );
    }

    const validFromDate = new Date(validFrom);
    const expiry = new Date(expiryDate);
    if (isNaN(validFromDate.getTime()) || isNaN(expiry.getTime())) {
      return NextResponse.json(
        { error: 'Neplatný dátum platnosti' },
        { status: 400 }
      );
    }

    if (validFromDate > expiry) {
      return NextResponse.json(
        { error: 'Dátum platnosti od nemôže byť po dátume expirácie' },
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
        validFrom: validFromDate,
        expiryDate: expiry,
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
