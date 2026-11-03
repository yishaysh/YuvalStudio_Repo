import React, { createContext, useContext, useState, useEffect } from 'react';
import { JewelryItem } from '../types';

export interface CartEntry {
  item: JewelryItem;
  quantity: number;
}

interface JewelryCartContextType {
  cartItems: CartEntry[];
  addToCart: (item: JewelryItem, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  totalCount: number;
  totalAmount: number;
  quickBuyItem: JewelryItem | null;
  openQuickBuy: (item: JewelryItem) => void;
  closeQuickBuy: () => void;
  justAddedItemId: string | null;
}

const JewelryCartContext = createContext<JewelryCartContextType | undefined>(undefined);

const STORAGE_KEY = 'yuval_studio_cart';

export const JewelryCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage', e);
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickBuyItem, setQuickBuyItem] = useState<JewelryItem | null>(null);
  const [justAddedItemId, setJustAddedItemId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cartItems]);

  const addToCart = (item: JewelryItem, quantity: number = 1) => {
    setCartItems(prev => {
      const existing = prev.find(entry => entry.item.id === item.id);
      if (existing) {
        return prev.map(entry =>
          entry.item.id === item.id
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry
        );
      }
      return [...prev, { item, quantity }];
    });

    setJustAddedItemId(item.id);
    setTimeout(() => {
      setJustAddedItemId(null);
    }, 1500);
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(entry => entry.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems(prev =>
      prev.map(entry =>
        entry.item.id === itemId
          ? { ...entry, quantity }
          : entry
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const openQuickBuy = (item: JewelryItem) => setQuickBuyItem(item);
  const closeQuickBuy = () => setQuickBuyItem(null);

  const totalCount = cartItems.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalAmount = cartItems.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);

  return (
    <JewelryCartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        openCart,
        closeCart,
        totalCount,
        totalAmount,
        quickBuyItem,
        openQuickBuy,
        closeQuickBuy,
        justAddedItemId
      }}
    >
      {children}
    </JewelryCartContext.Provider>
  );
};

export const useJewelryCart = () => {
  const context = useContext(JewelryCartContext);
  if (!context) {
    throw new Error('useJewelryCart must be used within a JewelryCartProvider');
  }
  return context;
};

