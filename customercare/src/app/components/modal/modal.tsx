'use client';

import { useModalContext } from '@/app/context/modalcontext';

export default function Modal({ children }) {
  const { showModal } = useModalContext();

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      <div
        className="absolute inset-0 z-10 bg-[rgba(0,0,0,0.55)]"
      >{children}</div>

    </div>
  );
}
