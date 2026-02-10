import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
  try {
    const body = await request.json();
    const { name, expiryDate, emailAddress } = body;

    // Validácia vstupných údajov
    if (!name || !expiryDate || !emailAddress) {
      return NextResponse.json(
        { error: 'Všetky polia sú povinné' },
        { status: 400 }
      );
    }

    // Validácia emailovej adresy
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      return NextResponse.json(
        { error: 'Neplatná emailová adresa' },
        { status: 400 }
      );
    }

    // Vytvorenie certifikátu
    const certificate = await prisma.certificate.create({
      data: {
        name,
        expiryDate: new Date(expiryDate),
        emailAddress,
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
