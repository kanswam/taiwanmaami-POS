import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { CartItem, calculateGst, GST_RATE } from '@shared/types';

interface CartState {
  items: CartItem[];
  orderType: 'instore' | 'delivery' | 'pickup';
  tableNumber: string | null; // For in-store orders
  discountCode: string | null;
  discountAmount: number;
  loyaltyPointsUsed: number;
  lastAddedItem: { productId: number; subcategoryId: number } | null;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_ORDER_TYPE'; payload: 'instore' | 'delivery' | 'pickup' }
  | { type: 'SET_TABLE_NUMBER'; payload: string | null }
  | { type: 'APPLY_DISCOUNT'; payload: { code: string; amount: number } }
  | { type: 'REMOVE_DISCOUNT' }
  | { type: 'USE_LOYALTY_POINTS'; payload: number }
  | { type: 'LOAD_CART'; payload: CartState };

const initialState: CartState = {
  items: [],
  orderType: 'delivery',
  tableNumber: null,
  discountCode: null,
  discountAmount: 0,
  loyaltyPointsUsed: 0,
  lastAddedItem: null,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        item =>
          item.productId === action.payload.productId &&
          item.size === action.payload.size &&
          item.withBoba === action.payload.withBoba &&
          item.sugarLevel === action.payload.sugarLevel &&
          item.iceLevel === action.payload.iceLevel &&
          item.specialInstructions === action.payload.specialInstructions &&
          JSON.stringify(item.addons) === JSON.stringify(action.payload.addons)
      );

      if (existingIndex > -1) {
        const newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + action.payload.quantity,
          lineTotal: (newItems[existingIndex].quantity + action.payload.quantity) * 
            (newItems[existingIndex].unitPrice + newItems[existingIndex].addonsTotal),
        };
        return { 
          ...state, 
          items: newItems,
          lastAddedItem: { productId: action.payload.productId, subcategoryId: action.payload.subcategoryId },
        };
      }
      return { 
        ...state, 
        items: [...state.items, action.payload],
        lastAddedItem: { productId: action.payload.productId, subcategoryId: action.payload.subcategoryId },
      };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload) };
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return { ...state, items: state.items.filter(item => item.id !== action.payload.id) };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? {
                ...item,
                quantity: action.payload.quantity,
                lineTotal: action.payload.quantity * (item.unitPrice + item.addonsTotal),
              }
            : item
        ),
      };
    }
    case 'CLEAR_CART':
      return { ...initialState, orderType: state.orderType };
    case 'SET_ORDER_TYPE': {
      // When switching to delivery/pickup, ensure mochi items have minimum quantity of 2
      const newOrderType = action.payload;
      if (newOrderType === 'delivery' || newOrderType === 'pickup') {
        const adjustedItems = state.items.map(item => {
          // Check if this is a mochi item (by product name containing 'mochi')
          const isMochi = item.productName.toLowerCase().includes('mochi');
          if (isMochi && item.quantity < 2) {
            // Upgrade to minimum 2 pieces
            return {
              ...item,
              quantity: 2,
              lineTotal: 2 * (item.unitPrice + item.addonsTotal),
            };
          }
          return item;
        });
        return { ...state, orderType: newOrderType, items: adjustedItems };
      }
      return { ...state, orderType: newOrderType };
    }
    case 'SET_TABLE_NUMBER':
      return { ...state, tableNumber: action.payload };
    case 'APPLY_DISCOUNT':
      return { ...state, discountCode: action.payload.code, discountAmount: action.payload.amount };
    case 'REMOVE_DISCOUNT':
      return { ...state, discountCode: null, discountAmount: 0 };
    case 'USE_LOYALTY_POINTS':
      return { ...state, loyaltyPointsUsed: action.payload };
    case 'LOAD_CART':
      return action.payload;
    default:
      return state;
  }
}

interface CartContextValue {
  state: CartState;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setOrderType: (type: 'instore' | 'delivery' | 'pickup') => void;
  setTableNumber: (tableNumber: string | null) => void;
  applyDiscount: (code: string, amount: number) => void;
  removeDiscount: () => void;
  useLoyaltyPoints: (points: number) => void;
  subtotal: number;
  gst: { stateGst: number; centralGst: number; total: number };
  total: number;
  itemCount: number;
  tableNumber: string | null;
  lastAddedItem: { productId: number; subcategoryId: number } | null;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('taiwanMaamiCart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: parsed });
      } catch (e) {
        console.error('Failed to load cart from localStorage');
      }
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem('taiwanMaamiCart', JSON.stringify(state));
  }, [state]);

  const subtotal = state.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const gst = calculateGst(subtotal);
  const total = subtotal + gst.total - state.discountAmount - state.loyaltyPointsUsed;
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  const value: CartContextValue = {
    state,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', payload: item }),
    removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', payload: id }),
    updateQuantity: (id, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
    setOrderType: (type) => dispatch({ type: 'SET_ORDER_TYPE', payload: type }),
    setTableNumber: (tableNumber) => dispatch({ type: 'SET_TABLE_NUMBER', payload: tableNumber }),
    applyDiscount: (code, amount) => dispatch({ type: 'APPLY_DISCOUNT', payload: { code, amount } }),
    removeDiscount: () => dispatch({ type: 'REMOVE_DISCOUNT' }),
    useLoyaltyPoints: (points) => dispatch({ type: 'USE_LOYALTY_POINTS', payload: points }),
    subtotal,
    gst,
    total,
    itemCount,
    tableNumber: state.tableNumber,
    lastAddedItem: state.lastAddedItem,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
