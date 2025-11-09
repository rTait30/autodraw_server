import { createSlice } from '@reduxjs/toolkit';

const togglesSlice = createSlice({
  name: 'toggles',
  initialState: {
    darkMode: false,
    devMode: true,
  },
  reducers: {
    toggleDarkMode: (state) => { state.darkMode = !state.darkMode; },
    toggleDevMode: (state) => { state.devMode = !state.devMode; },
    setDarkMode: (state, action) => { state.darkMode = action.payload; },
    setDevMode: (state, action) => { state.devMode = action.payload; },
  },
});

export const { toggleDarkMode, toggleDevMode, setDarkMode, setDevMode } = togglesSlice.actions;
export default togglesSlice.reducer;