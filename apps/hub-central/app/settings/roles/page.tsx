import React from 'react';
import { RoleBuilder } from '../../../components/roles/RoleBuilder';

export default function RolesSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* En-tête de la page */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Centre de Commandement des Rôles</h1>
          <p className="text-indigo-100 opacity-90">
            Gérez la hiérarchie de l'Îlot Zoizos. Ajoutez de nouveaux rôles dynamiques et définissez leurs permissions par défaut.
          </p>
        </div>

        {/* Le composant qu'on vient de créer */}
        <RoleBuilder />
        
      </div>
    </div>
  );
}