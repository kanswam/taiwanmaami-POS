import React, { createContext, useContext, useReducer, useEffect, ReactNode, useState } from 'react';
import { CartItem, calculateGst, GST_RATE } from '@shared/types';
import { CART_EXPIRY_MS } from '@shared/const';
import { trackAddToCart, trackRemoveFromCart, toGA4Item } from '@/lib/analytics';

interface CartState {
  items: CartItem[];
  orderType: 'instore' | 'delivery' | 'pickup';
  tableNumber: string | null; // For in-store orders
  pickupOutlet: 'palladium' | 'tnagar' | null; // For pickup orders
  instoreOutlet: 'palladium' | 'tnagar' | null; // For in-store orders
  discountCode: string | null;
  discountAmount: number;
  loyaltyPointsUsed: number;
  lastAddedItem: { productId: number; subcategoryId: number } | null;
  activeOrderId: number | null; // For adding items to existing in-store orders
  lastActivityAt: number; // Timestamp of last cart activity (add/remove/update)
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_ORDER_TYPE'; payload: 'instore' | 'delivery' | 'pickup' }
  | { type: 'SET_TABLE_NUMBER'; payload: string | null }
  | { type: 'SET_PICKUP_OUTLET'; payload: 'palladium' | 'tnagar' | null }
  | { type: 'SET_INSTORE_OUTLET'; payload: 'palladium' | 'tnagar' | null }
  | { type: 'APPLY_DISCOUNT'; payload: { code: string; amount: number } }
  | { type: 'REMOVE_DISCOUNT' }
  | { type: 'USE_LOYALTY_POINTS'; payload: number }
  | { type: 'LOAD_CART'; payload: CartState }
  | { type: 'SET_ACTIVE_ORDER_ID'; payload: number | null };

const initialState: CartState = {
  items: [],
  orderType: 'delivery',
  tableNumber: null,
  pickupOutlet: null,
  instoreOutlet: null,
  discountCode: null,
  discountAmount: 0,
  loyaltyPointsUsed: 0,
  lastAddedItem: null,
  activeOrderId: null,
  lastActivityAt: Date.now(),
};

// Get initial state from localStorage synchronously to prevent flash
function getInitialState(): CartState {
  if (typeof window === 'undefined') return initialState;
  
  try {
    const savedCart = localStorage.getItem('taiwanMaamiCart');
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      const state = { ...initialState, ...parsed };
      
      // Check if cart items have expired (4 hours of inactivity)
      const lastActivity = state.lastActivityAt || 0;
      const now = Date.now();
      if (state.items.length > 0 && (now - lastActivity) > CART_EXPIRY_MS) {
        // Cart has expired — clear items but keep order type and outlet preferences
        console.log('[Cart] Cart expired after 4 hours of inactivity, clearing items');
        return {
          ...state,
          items: [],
          discountCode: null,
          discountAmount: 0,
          loyaltyPointsUsed: 0,
          lastAddedItem: null,
          activeOrderId: null,
          lastActivityAt: now,
        };
      }
      
      return state;
    }
  } catch (e) {
    console.error('Failed to load cart from localStorage');
  }
  return initialState;
}

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
          lastActivityAt: Date.now(),
        };
      }
      return { 
        ...state, 
        items: [...state.items, action.payload],
        lastAddedItem: { productId: action.payload.productId, subcategoryId: action.payload.subcategoryId },
        lastActivityAt: Date.now(),
      };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload), lastActivityAt: Date.now() };
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return { ...state, items: state.items.filter(item => item.id !== action.payload.id), lastActivityAt: Date.now() };
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
        lastActivityAt: Date.now(),
      };
    }
    case 'CLEAR_CART':
      return { ...initialState, orderType: state.orderType, lastActivityAt: Date.now() };
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
        // Clear outlet when switching order type to force re-selection
        return { 
          ...state, 
          orderType: newOrderType, 
          items: adjustedItems,
          pickupOutlet: newOrderType === 'pickup' ? null : state.pickupOutlet,
          instoreOutlet: null, // Clear instore outlet when switching to delivery/pickup
        };
      }
      // Clear outlet when switching to instore to force re-selection
      return { 
        ...state, 
        orderType: newOrderType,
        pickupOutlet: null, // Clear pickup outlet when switching to instore
        instoreOutlet: null, // Clear instore outlet to force re-selection
      };
    }
    case 'SET_TABLE_NUMBER':
      return { ...state, tableNumber: action.payload };
    case 'SET_PICKUP_OUTLET':
      return { ...state, pickupOutlet: action.payload };
    case 'SET_INSTORE_OUTLET':
      return { ...state, instoreOutlet: action.payload };
    case 'APPLY_DISCOUNT':
      return { ...state, discountCode: action.payload.code, discountAmount: action.payload.amount };
    case 'REMOVE_DISCOUNT':
      return { ...state, discountCode: null, discountAmount: 0 };
    case 'USE_LOYALTY_POINTS':
      return { ...state, loyaltyPointsUsed: action.payload };
    case 'LOAD_CART':
      return action.payload;
    case 'SET_ACTIVE_ORDER_ID':
      return { ...state, activeOrderId: action.payload };
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
  setPickupOutlet: (outlet: 'palladium' | 'tnagar' | null) => void;
  setInstoreOutlet: (outlet: 'palladium' | 'tnagar' | null) => void;
  applyDiscount: (code: string, amount: number) => void;
  removeDiscount: () => void;
  useLoyaltyPoints: (points: number) => void;
  setActiveOrderId: (orderId: number | null) => void;
  subtotal: number;
  gst: { stateGst: number; centralGst: number; total: number };
  total: number;
  itemCount: number;
  tableNumber: string | null;
  pickupOutlet: 'palladium' | 'tnagar' | null;
  instoreOutlet: 'palladium' | 'tnagar' | null;
  lastAddedItem: { productId: number; subcategoryId: number } | null;
  activeOrderId: number | null;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  // Initialize with localStorage data synchronously to prevent flash
  const [state, dispatch] = useReducer(cartReducer, undefined, getInitialState);
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage on change (after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('taiwanMaamiCart', JSON.stringify(state));
    }
  }, [state, isHydrated]);

  // Periodic check: clear expired cart items while the tab is open
  useEffect(() => {
    const interval = setInterval(() => {
      const savedCart = localStorage.getItem('taiwanMaamiCart');
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          const lastActivity = parsed.lastActivityAt || 0;
          const now = Date.now();
          if (parsed.items && parsed.items.length > 0 && (now - lastActivity) > CART_EXPIRY_MS) {
            console.log('[Cart] Cart expired during session, clearing items');
            dispatch({ type: 'CLEAR_CART' });
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }, 60_000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const subtotal = state.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const gst = calculateGst(subtotal);
  const total = subtotal + gst.total - state.discountAmount - state.loyaltyPointsUsed;
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  const value: CartContextValue = {
    state,
    addItem: (item) => {
      dispatch({ type: 'ADD_ITEM', payload: item });
      // Track GA4 add_to_cart event
      trackAddToCart(toGA4Item({
        id: item.productId,
        name: item.productName,
        category: 'Bubble Tea',
        variant: item.size || undefined,
        price: item.unitPrice + item.addonsTotal,
        quantity: item.quantity,
      }));
    },
    removeItem: (id) => {
      // Find item before removing for tracking
      const itemToRemove = state.items.find(item => item.id === id);
      dispatch({ type: 'REMOVE_ITEM', payload: id });
      // Track GA4 remove_from_cart event
      if (itemToRemove) {
        trackRemoveFromCart(toGA4Item({
          id: itemToRemove.productId,
          name: itemToRemove.productName,
          category: 'Bubble Tea',
          variant: itemToRemove.size || undefined,
          price: itemToRemove.unitPrice + itemToRemove.addonsTotal,
          quantity: itemToRemove.quantity,
        }));
      }
    },
    updateQuantity: (id, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
    setOrderType: (type) => dispatch({ type: 'SET_ORDER_TYPE', payload: type }),
    setTableNumber: (tableNumber) => dispatch({ type: 'SET_TABLE_NUMBER', payload: tableNumber }),
    setPickupOutlet: (outlet) => dispatch({ type: 'SET_PICKUP_OUTLET', payload: outlet }),
    setInstoreOutlet: (outlet) => dispatch({ type: 'SET_INSTORE_OUTLET', payload: outlet }),
    applyDiscount: (code, amount) => dispatch({ type: 'APPLY_DISCOUNT', payload: { code, amount } }),
    removeDiscount: () => dispatch({ type: 'REMOVE_DISCOUNT' }),
    useLoyaltyPoints: (points) => dispatch({ type: 'USE_LOYALTY_POINTS', payload: points }),
    setActiveOrderId: (orderId) => dispatch({ type: 'SET_ACTIVE_ORDER_ID', payload: orderId }),
    subtotal,
    gst,
    total,
    itemCount,
    tableNumber: state.tableNumber,
    pickupOutlet: state.pickupOutlet,
    instoreOutlet: state.instoreOutlet,
    lastAddedItem: state.lastAddedItem,
    activeOrderId: state.activeOrderId,
    isHydrated,
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
