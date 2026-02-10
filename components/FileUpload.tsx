'use client';

import { useState, useRef } from 'react';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Spracovanie drag & drop eventov
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Spracovanie kliknutia na tlačidlo
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Spracovanie výberu súboru
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Upload súboru
  const handleFileUpload = async (file: File) => {
    // Kontrola typu súboru
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      alert('Nepodporovaný formát súboru. Podporované sú: .xlsx, .xls, .csv');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/certificates/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Chyba pri nahrávaní súboru');
      }

      setUploadResult(result);

      // Ak bol import úspešný, zavolať callback
      if (result.imported > 0) {
        setTimeout(() => {
          onUploadSuccess();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Chyba pri nahrávaní:', error);
      setUploadResult({
        error: true,
        message: error.message || 'Nepodarilo sa nahrať súbor',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Import certifikátov</h2>

      {/* Drag & Drop zóna */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Nahrávam súbor...</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-gray-600 mb-2">
              <span className="font-semibold">Kliknite pre výber súboru</span> alebo
              pretiahnite súbor sem
            </p>
            <p className="text-sm text-gray-500">Podporované formáty: .xlsx, .xls, .csv</p>
          </>
        )}
      </div>

      {/* Výsledok uploadu */}
      {uploadResult && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            uploadResult.error
              ? 'bg-red-50 border border-red-200'
              : 'bg-green-50 border border-green-200'
          }`}
        >
          {uploadResult.error ? (
            <div className="flex items-start">
              <span className="text-red-600 mr-2">❌</span>
              <div>
                <p className="font-semibold text-red-800">Chyba pri importe</p>
                <p className="text-red-700 text-sm">{uploadResult.message}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✅</span>
              <div>
                <p className="font-semibold text-green-800">{uploadResult.message}</p>
                <p className="text-green-700 text-sm mt-1">
                  Importované: {uploadResult.imported} certifikátov
                </p>
                {uploadResult.errors > 0 && (
                  <div className="mt-2">
                    <p className="text-orange-700 text-sm font-semibold">
                      Chyby pri importe: {uploadResult.errors}
                    </p>
                    {uploadResult.errorDetails && uploadResult.errorDetails.length > 0 && (
                      <ul className="mt-1 text-xs text-orange-600">
                        {uploadResult.errorDetails.slice(0, 5).map((err: any, idx: number) => (
                          <li key={idx}>
                            Riadok {err.row}: {err.error}
                          </li>
                        ))}
                        {uploadResult.errorDetails.length > 5 && (
                          <li>...a ďalších {uploadResult.errorDetails.length - 5} chýb</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Návod na formát súboru */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">Očakávaný formát súboru:</h3>
        <p className="text-sm text-blue-700 mb-2">
          Excel/CSV súbor musí obsahovať tieto stĺpce:
        </p>
        <ul className="text-sm text-blue-700 list-disc list-inside">
          <li>
            <strong>názov</strong> alebo <strong>name</strong> - názov certifikátu
          </li>
          <li>
            <strong>dátum_platnosti</strong> alebo <strong>expiry_date</strong> - dátum
            expirácie (DD.MM.YYYY alebo YYYY-MM-DD)
          </li>
          <li>
            <strong>email</strong> alebo <strong>email_address</strong> - emailová adresa
          </li>
        </ul>
      </div>
    </div>
  );
}
