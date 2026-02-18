import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helper';

/**
 * GET /api/certificates
 * Vráti všetky certifikáty z databázy
 */
export async function GET() {
  try {
    const certificates = await prisma.certificate.findMany({
      orderBy: {
        expiryDate: 'asc', // Zoradenie podľa dátumu expirácie
      },
    });

    return NextResponse.json({ certificates });
  } catch (error) {
    console.error('Chyba pri načítavaní certifikátov:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa načítať certifikáty' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/certificates
 * Vytvorí nový certifikát
 */
export async function POST(request: NextRequest) {
  // Kontrola autentifikácie
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { name, validFrom, expiryDate, emailAddress } = body;

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

    // Vytvorenie certifikátu
    const certificate = await prisma.certificate.create({
      data: {
        name,
        validFrom: validFromDate,
        expiryDate: expiry,
        emailAddress: emailAddress && emailAddress.trim() ? emailAddress.trim() : null,
      },
    });

    return NextResponse.json(
      { message: 'Certifikát bol úspešne vytvorený', certificate },
      { status: 201 }
    );
  } catch (error) {
    console.error('Chyba pri vytváraní certifikátu:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa vytvoriť certifikát' },
      { status: 500 }
    );
  }
}
