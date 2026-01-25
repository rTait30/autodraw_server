// sharedStyles.js (or keep at the top of your components file)

// Big, clickable targets (h-12 = 48px is the touch standard)
// High contrast text (text-gray-900)
// clear focus ring for accessibility
export const baseInputStyles = `
  w-full h-12 px-4 
  bg-white border border-gray-300 rounded-lg shadow-sm
  text-base text-gray-900 placeholder-gray-400
  focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none 
  focus:bg-yellow-100 
  disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
  transition-colors duration-75 ease-out
`;

export const labelStyles = `
  block text-sm font-bold text-gray-700 mb-1.5 ml-1 select-none
`;