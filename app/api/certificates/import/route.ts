import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helper';
import * as XLSX from 'xlsx';

// Bezpečnostné nastavenia pre ochranu proti ReDoS a Prototype Pollution
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const MAX_ROWS = 1000; // Maximum počet riadkov na import
const PROCESSING_TIMEOUT = 30000; // 30 sekúnd timeout

/**
 * POST /api/certificates/import
 * Importuje Excel alebo CSV súbor s certifikátmi
 * 
 * BEZPEČNOSTNÉ OPATRENIA:
 * - Limit veľkosti súboru (5MB)
 * - Limit počtu riadkov (1000)
 * - Timeout ochrany (30s)
 */
export async function POST(request: NextRequest) {
  // Kontrola autentifikácie
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Súbor nebol nahraný' },
        { status: 400 }
      );
    }

    // BEZPEČNOSŤ: Kontrola veľkosti súboru
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Súbor je príliš veľký. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Kontrola typu súboru
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Nepodporovaný formát súboru. Podporované sú: .xlsx, .xls, .csv' },
        { status: 400 }
      );
    }

    // Načítanie súboru
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // BEZPEČNOSŤ: Timeout ochrana proti ReDoS
    const parsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Spracovanie súboru trvalo príliš dlho (timeout)'));
      }, PROCESSING_TIMEOUT);

      try {
        // Parsovanie Excel/CSV súboru
        const workbook = XLSX.read(buffer, {
          type: 'buffer',
          // BEZPEČNOSŤ: Obmedzenie parsovacích možností
          cellDates: true,
          cellNF: false,
          cellHTML: false,
        });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        clearTimeout(timeout);
        resolve(data);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });

    const data = await parsePromise as any[];

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Súbor je prázdny alebo neobsahuje dáta' },
        { status: 400 }
      );
    }

    // BEZPEČNOSŤ: Limit počtu riadkov
    if (data.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Príliš veľa riadkov. Maximum: ${MAX_ROWS} riadkov` },
        { status: 400 }
      );
    }

    // Mapovanie stĺpcov (podporuje rôzne názvy a encoding problémy)
    const columnMappings = {
      name: ["CN"],
      validFrom: ['Valid_From', 'Valid_from'],
      expiryDate: ['Valid_To', 'Valid_to'],
      emailAddress: ['email', 'Email'],
      thumbprint: ['thumbprint', 'Thumbprint'],
    };

    // Funkcia pre nájdenie správneho názvu stĺpca
    const findColumn = (row: any, possibleNames: string[]): string | null => {
      for (const name of possibleNames) {
        if (row[name] !== undefined) {
          return name;
        }
      }
      return null;
    };

    // Funkcia pre sanitizáciu string hodnôt (ochrana proti Prototype Pollution)
    const sanitizeString = (value: any): string => {
      if (value === null || value === undefined) return '';
      // Zabránenie prototype pollution
      const str = String(value).trim();
      // Blokovanie nebezpečných kľúčov
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      if (dangerousKeys.some(key => str.toLowerCase().includes(key))) {
        throw new Error('Nebezpečný obsah v súbore');
      }
      return str;
    };

    // Funkcia pre parsovanie dátumu v rôznych formátoch
    const parseDate = (dateValue: any): Date | null => {
      if (!dateValue) return null;

      // Ak je už Date objekt
      if (dateValue instanceof Date) return dateValue;

      // Ak je číslo (Excel serial date)
      if (typeof dateValue === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + dateValue * 86400000);
      }

      // Ak je string, skúsime rôzne formáty
      const dateString = sanitizeString(dateValue);

      // Formát: DD.MM.YYYY alebo DD/MM/YYYY
      const ddmmyyyyMatch = dateString.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
      if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Formát: YYYY-MM-DD
      const yyyymmddMatch = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (yyyymmddMatch) {
        const [, year, month, day] = yyyymmddMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Skúsime štandardný Date parser
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      return null;
    };

    const importedCertificates = [];
    const errors = [];

    // Validácia emailovej adresy
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // VYMAZAŤ LEN IMPORTOVANÉ ZÁZNAMY (s thumbprint) PRED IMPORTOM
    await prisma.certificate.deleteMany({
      where: { thumbprint: { not: null } },
    });

    // Spracovanie každého riadku
    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      const rowNumber = i + 2; // +2 kvôli hlavičke a indexu od 0

      try {
        // Nájdenie stĺpcov
        const nameColumn = findColumn(row, columnMappings.name);
        const validFromColumn = findColumn(row, columnMappings.validFrom);
        const dateColumn = findColumn(row, columnMappings.expiryDate);
        const emailColumn = findColumn(row, columnMappings.emailAddress);
        const thumbprintColumn = findColumn(row, columnMappings.thumbprint);

        // Kontrola chýbajúcich stĺpcov
        const missingColumns = [];
        if (!nameColumn) missingColumns.push('názov');
        if (!validFromColumn) missingColumns.push('platny_od');
        if (!dateColumn) missingColumns.push('dátum_platnosti');
        if (!thumbprintColumn) missingColumns.push('thumbprint');

        if (missingColumns.length > 0) {
          errors.push({
            row: rowNumber,
            error: `Chýbajúce stĺpce: ${missingColumns.join(', ')}`,
          });
          continue;
        }

        // BEZPEČNOSŤ: Sanitizácia vstupov
        const name = sanitizeString(row[nameColumn!]);
        let emailAddress: string | null = null;

        // Spracovanie emailu - môže byť prázdny alebo "EMPTY"
        if (emailColumn && row[emailColumn]) {
          const rawEmail = sanitizeString(row[emailColumn]);
          if (rawEmail && rawEmail.toUpperCase() !== 'EMPTY') {
            emailAddress = rawEmail;
          }
        }

        const validFrom = parseDate(row[validFromColumn!]);
        const expiryDate = parseDate(row[dateColumn!]);
        const thumbprint = sanitizeString(row[thumbprintColumn!]);

        // Validácia dĺžky
        if (name.length > 500) {
          errors.push({ row: rowNumber, error: 'Názov je príliš dlhý (max 500 znakov)' });
          continue;
        }

        if (emailAddress && emailAddress.length > 255) {
          errors.push({ row: rowNumber, error: 'Email je príliš dlhý (max 255 znakov)' });
          continue;
        }

        // Validácia
        if (!name) {
          errors.push({ row: rowNumber, error: 'Názov je povinný' });
          continue;
        }

        if (!validFrom) {
          errors.push({ row: rowNumber, error: 'Nepodarilo sa parsovať dátum platnosti od' });
          continue;
        }

        if (!expiryDate) {
          errors.push({ row: rowNumber, error: 'Nepodarilo sa parsovať dátum' });
          continue;
        }

        if (validFrom > expiryDate) {
          errors.push({ row: rowNumber, error: 'Dátum platnosti od nemôže byť po dátume expirácie' });
          continue;
        }

        if (!thumbprint) {
          errors.push({ row: rowNumber, error: 'Chýba thumbprint' });
          continue;
        }

        // Validácia emailu len ak je vyplnený
        if (emailAddress && !emailRegex.test(emailAddress)) {
          errors.push({ row: rowNumber, error: 'Neplatná emailová adresa' });
          continue;
        }

        // Vytvorenie certifikátu
        const certificate = await prisma.certificate.create({
          data: {
            name,
            validFrom,
            expiryDate,
            ...(emailAddress && { emailAddress }),
            thumbprint,
          },
        });

        importedCertificates.push(certificate);
      } catch (error) {
        console.error(`Chyba pri spracovaní riadku ${rowNumber}:`, error);
        errors.push({ row: rowNumber, error: 'Chyba pri vytváraní certifikátu' });
      }
    }

    return NextResponse.json(
      {
        message: `Import dokončený. Úspešne importovaných: ${importedCertificates.length}, Chyby: ${errors.length}`,
        imported: importedCertificates.length,
        errors: errors.length,
        errorDetails: errors,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Chyba pri importe súboru:', error);

    // Bezpečnostné chybové hlášky
    if (error.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Spracovanie súboru trvalo príliš dlho. Súbor môže byť príliš zložitý.' },
        { status: 408 }
      );
    }

    if (error.message?.includes('Nebezpečný obsah')) {
      return NextResponse.json(
        { error: 'Súbor obsahuje potenciálne nebezpečný obsah' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Nepodarilo sa importovať súbor' },
      { status: 500 }
    );
  }
}
