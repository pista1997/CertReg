import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';

/**
 * POST /api/certificates/import
 * Importuje Excel alebo CSV súbor s certifikátmi
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Súbor nebol nahraný' },
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

    // Parsovanie Excel/CSV súboru
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Súbor je prázdny alebo neobsahuje dáta' },
        { status: 400 }
      );
    }

    // Mapovanie stĺpcov (podporuje rôzne názvy)
    const columnMappings = {
      name: ['názov', 'name', 'nazov', 'Názov', 'Name'],
      expiryDate: ['dátum_platnosti', 'datum_platnosti', 'expiry_date', 'expiryDate', 'dátum platnosti', 'datum platnosti'],
      emailAddress: ['email', 'email_address', 'emailAddress', 'Email'],
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
      const dateString = String(dateValue).trim();

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

    // Spracovanie každého riadku
    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      const rowNumber = i + 2; // +2 kvôli hlavičke a indexu od 0

      try {
        // Nájdenie stĺpcov
        const nameColumn = findColumn(row, columnMappings.name);
        const dateColumn = findColumn(row, columnMappings.expiryDate);
        const emailColumn = findColumn(row, columnMappings.emailAddress);

        if (!nameColumn || !dateColumn || !emailColumn) {
          errors.push({
            row: rowNumber,
            error: 'Nepodarilo sa nájsť všetky požadované stĺpce (názov, dátum_platnosti, email)',
          });
          continue;
        }

        const name = String(row[nameColumn]).trim();
        const emailAddress = String(row[emailColumn]).trim();
        const expiryDate = parseDate(row[dateColumn]);

        // Validácia
        if (!name) {
          errors.push({ row: rowNumber, error: 'Názov je povinný' });
          continue;
        }

        if (!expiryDate) {
          errors.push({ row: rowNumber, error: 'Nepodarilo sa parsovať dátum' });
          continue;
        }

        if (!emailRegex.test(emailAddress)) {
          errors.push({ row: rowNumber, error: 'Neplatná emailová adresa' });
          continue;
        }

        // Vytvorenie certifikátu
        const certificate = await prisma.certificate.create({
          data: {
            name,
            expiryDate,
            emailAddress,
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
  } catch (error) {
    console.error('Chyba pri importe súboru:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa importovať súbor' },
      { status: 500 }
    );
  }
}
