export function Button({ 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  children, 
  ...props 
}) {
  
  // Base styles that make it feel "Solid" (consistent padding, font, focus rings)
  const displayStyle = className.includes('w-full') ? 'flex w-full' : 'inline-flex';
  const baseStyles = `${displayStyle} items-center justify-center px-4 py-2 font-gill font-medium rounded-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`;
  
  // Variants map to your theme colors
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover focus:ring-primary",
    secondary: "bg-secondary text-white hover:bg-secondary-hover focus:ring-secondary",
    danger: "bg-tertiary text-white hover:bg-tertiary-hover focus:ring-tertiary",
    dev: "bg-gray-400 text-white text-xs py-1 px-3 hover:bg-gray-500 shadow-none rounded-sm",
    submit: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-600 flex-1 justify-center bg-green-600 hover:bg-green-700 text-white",
    warning: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
    "soft-blue": "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 focus:ring-blue-500 border border-blue-200 dark:border-blue-800",
  };
    
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        // A simple consistent loading spinner
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}
