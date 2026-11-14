import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { agorotToShekels, multiplyAgorot, parsePriceToAgorot, parsePriceToShekels } from '../shared/money';
import type { JewelryItem } from '../types';

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
  totalAmountAgorot: number;
  totalAmount: number;
  quickBuyItem: JewelryItem | null;
  openQuickBuy: (item: JewelryItem) => void;
  closeQuickBuy: () => void;
  justAddedItemId: string | null;
}

const JewelryCartContext = createContext<JewelryCartContextType | undefined>(undefined);

const STORAGE_KEY = 'yuval_studio_cart';

function normalizeSavedCart(raw: unknown): CartEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry: any) => entry && entry.item && entry.item.id)
    .map((entry: any) => ({
      item: {
        ...entry.item,
        price: parsePriceToShekels(entry.item.price, 0),
      },
      quantity: Math.max(1, Math.min(99, Math.floor(Number(entry.quantity) || 1))),
    }));
}

export const JewelryCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return normalizeSavedCart(JSON.parse(saved));
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

  const addToCart = (item: JewelryItem, quantity = 1) => {
    const safePrice = parsePriceToShekels(item.price, 0);
    const qtyToAdd = Math.max(1, Math.floor(Number(quantity) || 1));
    const normalizedItem: JewelryItem = { ...item, price: safePrice };

    setCartItems(prev => {
      const existing = prev.find(entry => entry.item.id === normalizedItem.id);
      if (existing) {
        return prev.map(entry =>
          entry.item.id === normalizedItem.id
            ? { ...entry, item: normalizedItem, quantity: Math.min(99, entry.quantity + qtyToAdd) }
            : entry
        );
      }
      return [...prev, { item: normalizedItem, quantity: Math.min(99, qtyToAdd) }];
    });

    setJustAddedItemId(normalizedItem.id);
    setTimeout(() => {
      setJustAddedItemId(null);
    }, 1500);
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(entry => entry.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    const safeQty = Math.floor(Number(quantity) || 0);
    if (safeQty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems(prev =>
      prev.map(entry =>
        entry.item.id === itemId ? { ...entry, quantity: Math.min(99, safeQty) } : entry
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const openQuickBuy = (item: JewelryItem) => {
    setQuickBuyItem({ ...item, price: parsePriceToShekels(item.price, 0) });
  };
  const closeQuickBuy = () => setQuickBuyItem(null);

  const totalCount = useMemo(
    () => cartItems.reduce((sum, entry) => sum + entry.quantity, 0),
    [cartItems]
  );

  const totalAmountAgorot = useMemo(
    () =>
      cartItems.reduce(
        (sum, entry) => sum + multiplyAgorot(parsePriceToAgorot(entry.item.price, 0), entry.quantity),
        0
      ),
    [cartItems]
  );

  const totalAmount = useMemo(() => agorotToShekels(totalAmountAgorot), [totalAmountAgorot]);

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
        totalAmountAgorot,
        totalAmount,
        quickBuyItem,
        openQuickBuy,
        closeQuickBuy,
        justAddedItemId,
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
