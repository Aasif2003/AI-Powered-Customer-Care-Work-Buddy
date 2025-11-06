'use client';

import { createContext, useContext, useState } from 'react';

interface ModalContextType {
  showModal: boolean;
  Modaltype: 'login' | 'signup' | null;
  openModal: (args: { type: 'login' | 'signup' }) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setmodalType] = useState<'login' | 'signup' | null>(null);

  const openModal = ( type ) => {
    setmodalType(type);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  return (
    <ModalContext.Provider value={{ showModal, modalType, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  return context;
}
