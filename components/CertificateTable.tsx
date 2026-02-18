'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

interface Certificate {
  id: number;
  name: string;
  validFrom: string;
  expiryDate: string;
  emailAddress: string | null;
  thumbprint?: string | null;
  notificationSent: boolean;
}

interface CertificateTableProps {
  certificates: Certificate[];
  onEdit: (certificate: Certificate) => void;
  onDelete: (id: number) => void;
}

export default function CertificateTable({
  certificates,
  onEdit,
  onDelete,
}: CertificateTableProps) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'manual'>('all');

  // Funkcia pre určenie statusu certifikátu
  const getStatus = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (daysRemaining < 0) {
      return { label: 'Expirovaný', color: 'bg-red-100 text-red-800', icon: '❌' };
    } else if (daysRemaining <= 30) {
      return { label: 'Expiruje čoskoro', color: 'bg-orange-100 text-orange-800', icon: '⚠️' };
    } else {
      return { label: 'Aktívny', color: 'bg-green-100 text-green-800', icon: '✅' };
    }
  };

  // Filtrovanie certifikátov
  const filteredCertificates = certificates.filter((cert) => {
    const emailValue = cert.emailAddress || '';
    const thumbprintValue = cert.thumbprint || '';
    const matchesSearch =
      cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emailValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thumbprintValue.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'all') return true;
    if (filter === 'manual') return !cert.thumbprint;

    const status = getStatus(cert.expiryDate);
    if (filter === 'active') return status.label === 'Aktívny';
    if (filter === 'expiring') return status.label === 'Expiruje čoskoro';
    if (filter === 'expired') return status.label === 'Expirovaný';

    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Zoznam certifikátov</h2>

        {/* Vyhľadávanie a filtrovanie */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Vyhľadať certifikát alebo email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Všetky</option>
            <option value="active">Aktívne</option>
            <option value="expiring">Expirujú čoskoro</option>
            <option value="expired">Expirované</option>
            <option value="manual">Manuálne pridané</option>
          </select>
        </div>
      </div>

      {/* Tabuľka */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Názov
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Platný od
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dátum expirácie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thumbprint
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Akcie
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCertificates.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Žiadne certifikáty neboli nájdené
                </td>
              </tr>
            ) : (
              filteredCertificates.map((cert) => {
                const status = getStatus(cert.expiryDate);
                const formattedValidFrom = format(new Date(cert.validFrom), 'dd.MM.yyyy');
                const formattedDate = format(new Date(cert.expiryDate), 'dd.MM.yyyy');

                return (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{cert.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formattedValidFrom}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formattedDate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cert.emailAddress || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cert.thumbprint || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}
                      >
                        {status.icon} {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {session ? (
                        <>
                          <button
                            onClick={() => onEdit(cert)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Upraviť
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Naozaj chcete zmazať certifikát "${cert.name}"?`
                                )
                              ) {
                                onDelete(cert.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Zmazať
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400">Len na čítanie</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Štatistiky */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Zobrazené: {filteredCertificates.length} / {certificates.length} certifikátov
        </div>
      </div>
    </div>
  );
}
