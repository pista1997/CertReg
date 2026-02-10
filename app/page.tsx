'use client';

import { useState, useEffect } from 'react';
import CertificateTable from '@/components/CertificateTable';
import FileUpload from '@/components/FileUpload';
import AddCertificateForm from '@/components/AddCertificateForm';

interface Certificate {
  id: number;
  name: string;
  expiryDate: string;
  emailAddress: string;
  notificationSent: boolean;
}

export default function Home() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editCertificate, setEditCertificate] = useState<Certificate | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Načítanie certifikátov
  const fetchCertificates = async () => {
    try {
      const response = await fetch('/api/certificates');
      const data = await response.json();
      setCertificates(data.certificates || []);
    } catch (error) {
      console.error('Chyba pri načítavaní certifikátov:', error);
      showToast('Nepodarilo sa načítať certifikáty', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie pri prvom zobrazení
  useEffect(() => {
    fetchCertificates();
  }, []);

  // Zobrazenie toast notifikácie
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Zmazanie certifikátu
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/certificates/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Chyba pri mazaní');
      }

      showToast('Certifikát bol úspešne zmazaný', 'success');
      fetchCertificates();
    } catch (error: any) {
      console.error('Chyba pri mazaní:', error);
      showToast(error.message || 'Nepodarilo sa zmazať certifikát', 'error');
    }
  };

  // Editácia certifikátu
  const handleEdit = (certificate: Certificate) => {
    setEditCertificate(certificate);
    setShowAddForm(true);
  };

  // Úspešné pridanie/editácia certifikátu
  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditCertificate(null);
    showToast(
      editCertificate ? 'Certifikát bol úspešne aktualizovaný' : 'Certifikát bol úspešne pridaný',
      'success'
    );
    fetchCertificates();
  };

  // Zrušenie formulára
  const handleFormCancel = () => {
    setShowAddForm(false);
    setEditCertificate(null);
  };

  // Úspešný upload
  const handleUploadSuccess = () => {
    showToast('Import bol úspešne dokončený', 'success');
    fetchCertificates();
  };

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">📜 Register certifikátov</h1>
          <p className="text-blue-100 mt-1">Správa a monitoring certifikátov informačných systémov OS SR</p>
        </div>
      </header>

      {/* Toast notifikácia */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg ${toast.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
              }`}
          >
            <div className="flex items-center">
              <span className="mr-2">{toast.type === 'success' ? '✅' : '❌'}</span>
              <p className="font-medium">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hlavný obsah */}
      <div className="container mx-auto px-4 py-8">
        {/* Tlačidlo pre pridanie certifikátu */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-colors"
          >
            ➕ Pridať nový certifikát
          </button>
        </div>

        {/* Upload sekcia */}
        <div className="mb-8">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Tabuľka certifikátov */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Načítavam certifikáty...</p>
          </div>
        ) : (
          <CertificateTable
            certificates={certificates}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Formulár pre pridanie/editáciu */}
      {showAddForm && (
        <AddCertificateForm
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
          editCertificate={editCertificate}
        />
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-sm text-gray-400">
              © 2026 Certificate Registry - Automatický monitoring certifikátov
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Pre automatickú kontrolu expirácie použite: curl http://localhost:3000/api/certificates/check-expiry
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
