import { createSlice } from '@reduxjs/toolkit';



const togglesSlice = createSlice({
  name: 'toggles',
  initialState: {
    devMode: localStorage.getItem('devMode') === 'true',
    darkMode: localStorage.getItem('darkMode') === 'true' || 
              (localStorage.getItem('darkMode') === null && window.matchMedia('(prefers-color-scheme: dark)').matches),
  },
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      localStorage.setItem('darkMode', state.darkMode);
    },
    setDarkMode: (state, action) => {
      state.darkMode = action.payload;
      localStorage.setItem('darkMode', state.darkMode);
    },
    syncDarkMode: (state, action) => {
      state.darkMode = action.payload;
      // Do not write to localStorage on sync, to respect system preference until overridden
    },
    toggleDevMode: (state) => { 
      state.devMode = !state.devMode; 
      localStorage.setItem('devMode', state.devMode);
    },
    setDevMode: (state, action) => { 
      state.devMode = action.payload; 
      localStorage.setItem('devMode', state.devMode);
    },
  },
});

export const { toggleDarkMode, toggleDevMode, setDarkMode, setDevMode, syncDarkMode } = togglesSlice.actions;
export default togglesSlice.reducer;
