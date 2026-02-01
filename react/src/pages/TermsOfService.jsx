import React from 'react';
import PageHeader from '../components/PageHeader';

const TermsOfService = () => {
    return (
        <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <PageHeader title="Terms of Service" backPath={-1} backLabel="Back" />
            
            <div className="flex-1 overflow-y-auto overscroll-y-contain bg-gray-100 dark:bg-gray-900">
                <div className="max-w-4xl mx-auto p-4 py-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                        <h1 className="text-xl font-bold mb-4 dark:text-white">Terms of Service</h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            Terms of Service stub page.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
