export const headingStyles = `
  text-2xl font-bold text-black mb-4 text-left
`;


export const linkStyles = `
  text-white no-underline font-medium text-lg
`;

export const roleStyles = `
  font-medium text-sm opacity-80
`;

// Table styles
export const tableBaseStyles = `
  w-full border-collapse border border-warm-grey bg-white 
  [&_tbody_tr:nth-child(even)]:bg-warm-grey 
  [&_tbody_tr:nth-child(odd)]:bg-white 
  [&_tbody_tr:hover]:bg-warm-grey [&_tbody_tr:hover]:transition-colors [&_tbody_tr:hover]:duration-150
`;

export const tableHeaderStyles = `
  text-left font-sans text-base font-semibold text-secondary tracking-wide 
  bg-warm-grey border-b border-warm-grey py-2 px-3
`;

export const tableCellStyles = `
  p-2 border-b border-warm-grey text-sm
`;

export const tableCalcStyles = `
  bg-warm-grey
`;

export const formStyles = `
  flex flex-col items-center gap-y-2
`;

export const authContainerStyles = `
  flex items-center justify-center p-4
`;

export const authBoxStyles = `
  rounded-2xl bg-white p-4 w-full max-w-xs shadow-lg flex flex-col items-center dark:bg-gray-800
`;

export const authLogoStyles = `
  flex justify-center w-full mb-2
`;

export const authErrorStyles = `
  text-[#DC2626] text-sm mt-2
`; // using hex #DC2626 for error to match --color-error if utility not set

export const authSuccessStyles = `
  text-[#16A34A] text-sm mt-2
`; // using hex #16A34A for success