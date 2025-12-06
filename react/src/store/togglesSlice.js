import { createSlice } from '@reduxjs/toolkit';

const getInitialDarkMode = () => {
  const stored = localStorage.getItem('darkMode');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const togglesSlice = createSlice({
  name: 'toggles',
  initialState: {
    darkMode: getInitialDarkMode(),
    devMode: localStorage.getItem('devMode') === 'true',
  },
  reducers: {
    toggleDarkMode: (state) => { 
      state.darkMode = !state.darkMode; 
      localStorage.setItem('darkMode', state.darkMode);
    },
    toggleDevMode: (state) => { 
      state.devMode = !state.devMode; 
      localStorage.setItem('devMode', state.devMode);
    },
    setDarkMode: (state, action) => { 
      state.darkMode = action.payload; 
      localStorage.setItem('darkMode', state.darkMode);
    },
    setDevMode: (state, action) => { 
      state.devMode = action.payload; 
      localStorage.setItem('devMode', state.devMode);
    },
  },
});

export const { toggleDarkMode, toggleDevMode, setDarkMode, setDevMode } = togglesSlice.actions;
export default togglesSlice.reducer;
