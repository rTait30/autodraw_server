import React from 'react';
import CollapsibleCard from '../components/CollapsibleCard';

export default function Account() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 pb-4 pt-1 mb-2">
        <h1 className="heading-page">Account</h1>
      </div>

      <div className="mt-2 flex flex-col gap-4">
        <CollapsibleCard title="Account Settings" defaultOpen={true} padding={true} contentClassName="flex flex-col gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Stub page — account management options will go here.
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-200">
              Change password (coming soon)
            </div>
            <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-200">
              Update profile (coming soon)
            </div>
            <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-200">
              Notification preferences (coming soon)
            </div>
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}
