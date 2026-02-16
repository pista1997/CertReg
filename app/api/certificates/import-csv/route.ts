import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parse } from 'csv-parse/sync';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 1000;

/**
 * POST /api/certificates/import-csv
 * BEZPEČNÝ CSV-only import BEZ xlsx závislosti
 * Eliminuje všetky známe xlsx zraniteľnosti
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Súbor nebol nahraný' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Súbor je príliš veľký. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (file.type !== 'text/csv' && !file.name.match(/\.csv$/i)) {
      return NextResponse.json(
        { error: 'Podporovaný je iba CSV formát (.csv)' },
        { status: 400 }
      );
    }

    const text = await file.text();

    let records: any[];
    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        max_record_size: 10240,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Chyba pri parsovaní CSV: ${error.message}` },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV súbor je prázdny' }, { status: 400 });
    }

    if (records.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Príliš veľa riadkov. Maximum: ${MAX_ROWS}` },
        { status: 400 }
      );
    }

    const columnMappings = {
      name: ['názov', 'name', 'nazov'],
      expiryDate: ['dátum_platnosti', 'datum_platnosti', 'expiry_date', 'expiryDate'],
      emailAddress: ['email', 'email_address', 'emailAddress'],
    };

    const findColumn = (record: any, possibleNames: string[]): string | null => {
      const keys = Object.keys(record);
      for (const name of possibleNames) {
        const found = keys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
        if (found) return found;
      }
      return null;
    };

    const sanitize = (value: any): string => {
      if (!value) return '';
      const str = String(value).trim();
      if (['__proto__', 'constructor', 'prototype'].some(k => str.toLowerCase().includes(k))) {
        throw new Error('Nebezpečný obsah');
      }
      return str;
    };

    const parseDate = (value: any): Date | null => {
      if (!value) return null;
      const str = sanitize(value);

      let match = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
      if (match) return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));

      match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (match) return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));

      const d = new Date(str);
      return !isNaN(d.getTime()) ? d : null;
    };

    const imported = [];
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // VYMAZAŤ VŠETKY EXISTUJÚCE ZÁZNAMY PRED IMPORTOM
    await prisma.certificate.deleteMany({});

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const row = i + 2;

      try {
        const nameCol = findColumn(rec, columnMappings.name);
        const dateCol = findColumn(rec, columnMappings.expiryDate);
        const emailCol = findColumn(rec, columnMappings.emailAddress);

        if (!nameCol || !dateCol) {
          errors.push({ row, error: 'Chýbajúce stĺpce (názov, dátum)' });
          continue;
        }

        const name = sanitize(rec[nameCol]);
        let email: string | null = null;

        // Spracovanie emailu - môže byť prázdny alebo "EMPTY"
        if (emailCol && rec[emailCol]) {
          const rawEmail = sanitize(rec[emailCol]);
          if (rawEmail && rawEmail.toUpperCase() !== 'EMPTY') {
            email = rawEmail;
          }
        }

        const date = parseDate(rec[dateCol]);

        if (!name || name.length > 500) {
          errors.push({ row, error: 'Neplatný názov' });
          continue;
        }

        if (email && (email.length > 255 || !emailRegex.test(email))) {
          errors.push({ row, error: 'Neplatný email' });
          continue;
        }

        if (!date) {
          errors.push({ row, error: 'Neplatný dátum' });
          continue;
        }

        const cert = await prisma.certificate.create({
          data: { name, expiryDate: date, emailAddress: email },
        });
        imported.push(cert);
      } catch (err: any) {
        errors.push({ row, error: err.message || 'Chyba' });
      }
    }

    return NextResponse.json({
      message: `CSV import: ${imported.length} úspešných, ${errors.length} chýb`,
      imported: imported.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error: any) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Import zlyhal' }, { status: 500 });
  }
}
