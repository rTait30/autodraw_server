import React from 'react';
import { useNavigate } from 'react-router-dom';
import CollapsibleCard from './CollapsibleCard';

const LegalCard = ({ className = "" }) => {
  const navigate = useNavigate();

  return (
    <CollapsibleCard title="Legal" defaultOpen={false} className={className} padding={true} contentClassName="flex flex-col gap-3">
        <button
          onClick={() => navigate('/copelands/legal/terms')}
          className="w-full text-left px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors"
        >
          Terms of Service
        </button>
        <button
          onClick={() => navigate('/copelands/legal/privacy')}
          className="w-full text-left px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors"
        >
          Privacy Policy
        </button>
    </CollapsibleCard>
  );
};

export default LegalCard;
