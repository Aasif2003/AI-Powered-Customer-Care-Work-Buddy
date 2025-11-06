'use client';
import Button from '@/app/components/UI/buttons/button';
import { useModalContext } from '@/app/context/modalcontext';
import {useRouter} from 'next/navigation'
export default function ModalOptions() {
  const { modalType, closeModal } = useModalContext();
  const router = useRouter();

  const routerpush= (path) => {
    closeModal();
    router.push(path);
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
      <div className="bg-white p-6 rounded shadow-lg w-[400px] relative">
        <button onClick={closeModal} className="absolute top-2 right-2 text-blue-500 font-bold">X</button>
        {modalType === 'login' && (
          <div className="flex flex-col p-4">
            <h2 className="text-xl mb-4 text-black w-full flex justify-center items-center ">Login</h2>
            <Button variant="primary" className="mt-4" onClick={()=> routerpush('/logino')}>Login as organizer</Button>

            <Button variant="primary" className="mt-5 mb-4" onClick={()=> routerpush('/loginm')} >Login as member</Button>
          </div>
        )}
        {modalType === 'signup' && (
          <div className="flex flex-col p-4">
            <h2 className="text-xl mb-4 text-black w-full flex justify-center items-center ">Sign Up</h2>
            <Button variant="primary" className="mt-4" onClick={()=> routerpush('/signupo')}>Signup as organizer</Button>
            <Button variant="primary" className="mt-5 mb-4" onClick={()=> routerpush('/signupm')} >Signup as member</Button>
          </div>
        )}
      </div>
    </div>
  );
}
