import { configureStore } from '@reduxjs/toolkit';
import togglesReducer from './togglesSlice';
import productsReducer from './productsSlice';

export default configureStore({
  reducer: {
    toggles: togglesReducer,
    products: productsReducer,
  },
});
