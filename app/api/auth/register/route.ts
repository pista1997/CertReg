import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/register
 * Vytvorenie nového používateľa (len pre prvotné nastavenie)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Používateľské meno a heslo sú povinné' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Heslo musí mať aspoň 6 znakov' },
                { status: 400 }
            );
        }

        // Kontrola či používateľ už existuje
        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Používateľské meno už existuje' },
                { status: 400 }
            );
        }

        // Hash hesla
        const hashedPassword = await bcrypt.hash(password, 10);

        // Vytvorenie používateľa
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
            },
        });

        return NextResponse.json(
            {
                message: 'Používateľ bol úspešne vytvorený',
                user: { id: user.id, username: user.username }
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Chyba pri vytváraní používateľa:', error);
        return NextResponse.json(
            { error: 'Nepodarilo sa vytvoriť používateľa' },
            { status: 500 }
        );
    }
}
