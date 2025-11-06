'use client';
import Button from '@/app/components/UI/buttons/button';
import { useModalContext } from '@/app/context/modalcontext';
import { useEffect, useState } from 'react';
import api from '@/app/services/axios';

export default function ModalOptionsOrg() {
  const { modalType, closeModal } = useModalContext();
  const [orglist, setOrglist] = useState<any[]>([]);
  const [morglist, setMorglist] = useState<any[]>([]);

  const fetchOOrg = async () => {
    try {
      const res = await api.get('organizerorganizations/', { withCredentials: true });
      console.log(res.data.orgss);
      setOrglist(res.data.orgss);
    } catch (err) {
      console.error("Error fetching orgs:", err);
    }
  };
  const fetchMOrg = async () => {
    try {
      const res = await api.get('memberorganizations/', { withCredentials: true });
      console.log(res.data.orgss);
      setMorglist(res.data.orgss);
    } catch (err) {
      console.error("Error fetching orgs:", err);
    }
  };
  const changeorg = async (orgId: number) => {
    try {
      await api.post(`change-organization/${orgId}/`, {}, { withCredentials: true });
      closeModal(); // optionally close after switching
    } catch (err) {
      console.error("Error switching org:", err);
    }
  };

  const changeorgmem = async (orgId: number) => {
    try {
      await api.post(`change-organization-member/${orgId}/`, {}, { withCredentials: true });
      closeModal(); // optionally close after switching
    } catch (err) {
      console.error("Error switching org:", err);
    }
  };

  useEffect(() => {
    if (modalType === 'organizer') {
      fetchOOrg();
    }
    if (modalType === 'member') {
      fetchMOrg();
    }
  }, [modalType]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
      <div className="bg-white p-6 rounded shadow-lg w-[400px] relative">
        <button onClick={closeModal} className="absolute top-2 right-2 text-blue-500 font-bold">X</button>
        {modalType === 'member' && (
          <div className="flex flex-col p-4">
            <div className="bg-blue-500 text-white text-center rounded p-2 mb-4 cursor-pointer" onClick={fetchMOrg}>
              Refresh List
            </div>
            <h2 className="text-xl mb-4 text-black text-center">Change your organization</h2>
            <ul className="mb-4">
              {morglist.map((orgs) => (
                <li key={orgs.id} onClick={() => changeorgmem(orgs.id)} className="text-black cursor-pointer p-2 hover:bg-blue-100 rounded">
                  {orgs.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        {modalType === 'organizer' && (
          <div className="flex flex-col p-4">
            <div className="bg-blue-500 text-white text-center rounded p-2 mb-4 cursor-pointer" onClick={fetchOOrg}>
              Refresh List
            </div>
            <h2 className="text-xl mb-4 text-black text-center">Change your organization</h2>
            <ul className="mb-4">
              {orglist.map((orgs) => (
                <li key={orgs.id} onClick={() => changeorg(orgs.id)} className="text-black cursor-pointer p-2 hover:bg-blue-100 rounded">
                  {orgs.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
