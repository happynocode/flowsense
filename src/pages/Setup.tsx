import React from 'react';
import { SchemaApplier } from '../components/admin/SchemaApplier';

export const Setup: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Required</h1>
          <p className="text-gray-600">
            The database schema needs to be applied before you can use the application.
          </p>
        </div>
        <SchemaApplier />
      </div>
    </div>
  );
};