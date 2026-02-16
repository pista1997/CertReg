'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Certificate {
  id?: number;
  name: string;
  expiryDate: string;
  emailAddress: string | null;
}

interface AddCertificateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editCertificate?: Certificate | null;
}

export default function AddCertificateForm({
  onSuccess,
  onCancel,
  editCertificate,
}: AddCertificateFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    expiryDate: '',
    emailAddress: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Načítanie dát pri editácii
  useEffect(() => {
    if (editCertificate) {
      // Formátovanie dátumu pre input type="date" (YYYY-MM-DD)
      const date = new Date(editCertificate.expiryDate);
      const formattedDate = format(date, 'yyyy-MM-dd');

      setFormData({
        name: editCertificate.name,
        expiryDate: formattedDate,
        emailAddress: editCertificate.emailAddress || '',
      });
    }
  }, [editCertificate]);

  // Validácia formulára
  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Názov je povinný';
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Dátum expirácie je povinný';
    } else {
      const selectedDate = new Date(formData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.expiryDate = 'Dátum expirácie nemôže byť v minulosti';
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.emailAddress.trim() && !emailRegex.test(formData.emailAddress)) {
      newErrors.emailAddress = 'Neplatná emailová adresa';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Spracovanie odoslania formulára
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editCertificate
        ? `/api/certificates/${editCertificate.id}`
        : '/api/certificates';

      const method = editCertificate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Chyba pri ukladaní certifikátu');
      }

      // Reset formulára
      setFormData({ name: '', expiryDate: '', emailAddress: '' });
      setErrors({});

      // Callback pre úspech
      onSuccess();
    } catch (error: any) {
      console.error('Chyba pri ukladaní:', error);
      alert(error.message || 'Nepodarilo sa uložiť certifikát');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Spracovanie zmeny hodnôt
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Vymazanie chyby pri zmene
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            {editCertificate ? 'Upraviť certifikát' : 'Pridať nový certifikát'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Názov */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Názov certifikátu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.name
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                  }`}
                placeholder="napr. SSL Certifikát - www.example.com"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Dátum expirácie */}
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                Dátum expirácie <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.expiryDate
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                  }`}
              />
              {errors.expiryDate && (
                <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Emailová adresa <span className="text-gray-400 text-xs">(voliteľné)</span>
              </label>
              <input
                type="email"
                id="emailAddress"
                name="emailAddress"
                value={formData.emailAddress}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.emailAddress
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                  }`}
                placeholder="napr. admin@example.com (nepovinné)"
              />
              {errors.emailAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.emailAddress}</p>
              )}
            </div>

            {/* Tlačidlá */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium ${isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {isSubmitting ? 'Ukladám...' : editCertificate ? 'Uložiť zmeny' : 'Pridať certifikát'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
              >
                Zrušiť
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
