import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from './Navigation';

const PageHeader = ({
    title,
    subtitle,
    backPath,
    backLabel = "Back",
    onBack,
    includeNav = true,
    hideBackButton = false,
    rightActions = null,
    // When `fixed` is true the header is positioned using
    // `top: var(--header-height)` (used on full pages). When
    // false the header is rendered in-flow (useful for
    // overlays/inline panels that already account for the
    // navigation height).
    fixed = true,
}) => {
    const navigate = useNavigate();
    const isLoggedIn = !!localStorage.getItem('username');
    const showNav = isLoggedIn && includeNav;

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (backPath) {
            navigate(backPath);
        } else {
            navigate(-1);
        }
    };

    const HeaderContent = () => {
        // If there's a global navigation bar rendered elsewhere on the page
        // (has class `topbar`), we should offset the fixed header below it
        // even when `includeNav` is false. Detect that at render time.
        const hasGlobalTopbar = (typeof document !== 'undefined') && !!document.querySelector('.topbar');
        const needsOffset = fixed && (showNav || hasGlobalTopbar);
        const topClass = fixed ? (needsOffset ? 'fixed top-[var(--header-height)] w-full' : 'fixed top-0 w-full') : 'relative w-full';

        return (
        <div
            className={`bg-white ${topClass} flex items-center justify-between px-4 py-3 md:px-8 border-b border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm z-[200]`}
        >
            <div className="flex items-center gap-4">
                {!hideBackButton && (
                    <>
                        <button 
                            onClick={handleBack}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 font-medium text-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span>{backLabel}</span>
                        </button>
                        <div className="hidden sm:block h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
                    </>
                )}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                        {title}
                    </h2>
                    {subtitle && (
                        <div className="text-sm text-gray-500 font-medium">
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>

            {rightActions && (
                <div className="flex items-center gap-2">
                    {rightActions}
                </div>
            )}
        </div>
    );
    };

    return (
        <div className="flex-none z-10 flex flex-col">
            {showNav && <Navigation />}
             <HeaderContent />
                 {fixed && ( (showNav || (typeof document !== 'undefined' && !!document.querySelector('.topbar'))) ? (
                     // spacer to keep page content below the fixed header when there's a nav
                     <div aria-hidden style={{ height: 'var(--header-height)' }} />
                 ) : null)}
        </div>
    );
};

export default PageHeader;
