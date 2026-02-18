import React from 'react';
import LegalCard from '../components/LegalCard';

export default function Legal() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 pb-4 pt-1 mb-2">
        <h1 className="heading-page">Legal</h1>
      </div>

      <div className="mt-2 flex flex-col gap-4">
        <LegalCard defaultOpen={true} />
      </div>
    </div>
  );
}
