import { configureStore } from '@reduxjs/toolkit';
import togglesReducer from './togglesSlice';

export default configureStore({
  reducer: {
    toggles: togglesReducer,
  },
});