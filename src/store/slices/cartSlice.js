import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const newItem = action.payload;
      const existingIndex = state.items.findIndex(
        item => String(item.stock_id) === String(newItem.stock_id),
      );

      if (existingIndex >= 0) {
        // If already in cart, update quantity and rate
        state.items[existingIndex].quantity =
          Number(state.items[existingIndex].quantity || 0) +
          Number(newItem.quantity || 1);
        state.items[existingIndex].rate = newItem.rate;
        state.items[existingIndex].total =
          Number(state.items[existingIndex].quantity) * Number(newItem.rate);
      } else {
        state.items.push({
          id: Date.now().toString(),
          ...newItem,
          total: Number(newItem.quantity) * Number(newItem.rate),
        });
      }
    },
    updateCartItem: (state, action) => {
      const { id, quantity, rate } = action.payload;
      const index = state.items.findIndex(item => item.id === id);
      if (index >= 0) {
        if (quantity !== undefined) state.items[index].quantity = Number(quantity);
        if (rate !== undefined) state.items[index].rate = Number(rate);
        state.items[index].total =
          Number(state.items[index].quantity) * Number(state.items[index].rate);
      }
    },
    removeFromCart: (state, action) => {
      const id = action.payload;
      state.items = state.items.filter(item => item.id !== id);
    },
    clearCart: state => {
      state.items = [];
    },
  },
});

export const { addToCart, updateCartItem, removeFromCart, clearCart } =
  cartSlice.actions;

export default cartSlice.reducer;

// Selectors
export const selectCartItems = state => state.cart?.items || [];
export const selectCartItemCount = state =>
  (state.cart?.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
export const selectCartGrandTotal = state =>
  (state.cart?.items || []).reduce(
    (sum, item) => sum + Number(item.total || 0),
    0,
  );

