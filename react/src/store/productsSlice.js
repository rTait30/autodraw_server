import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../services/auth';

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async () => {
    const response = await apiFetch('/products');
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    return await response.json();
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    list: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Sort by name to match previous behavior
        state.list = action.payload.sort((a, b) => 
          String(a.name).localeCompare(String(b.name))
        );
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default productsSlice.reducer;
