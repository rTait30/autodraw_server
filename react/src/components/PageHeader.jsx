import React from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from './TopBar';

const PageHeader = ({ title, backPath, backLabel = "Back" }) => {
    const navigate = useNavigate();
    const isLoggedIn = !!localStorage.getItem('username');

    const HeaderContent = () => (
        <div className="flex items-center justify-between px-4 py-4 md:px-8 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate(backPath)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 font-medium text-lg"
                >
                    <span>← {backLabel}</span>
                </button>
                <div className="hidden sm:block h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                        {title}
                    </h2>
                </div>
            </div>
        </div>
    );

    if (isLoggedIn) {
        return (
            <div className="flex-none z-10 flex flex-col">
                <TopBar />
                <HeaderContent />
            </div>
        );
    }

    return (
        <div className="flex-none z-10 flex flex-col">
             <HeaderContent />
        </div>
    );
};

export default PageHeader;
