'use client';

import { createContext, useContext, useState,useEffect } from 'react';
import api from "@/app/services/axios";
const IDBooleanContext = createContext<ModalContextType | undefined>(undefined);

export function IDBooleanProvider({ children }: { children: React.ReactNode }) {
  const [activeOrg, setActiveOrg] = useState(null);
  const [Orgname, setOrgname] = useState('');
  const [Orgid, setOrgid] = useState('');

  const getOrgname=()=>{
    try{
    if (Orgname===''){
      return localStorage.getItem('orgname');
    }
    else{
      return Orgname;
    }}
    catch(error){
      console.log('no organization name obtained yet')
    }
  }

 const closeOrg=()=>{
   setActiveOrg('');
   setOrgname('');
 }
 
;

  return (
    <IDBooleanContext.Provider value={{ activeOrg,setActiveOrg,Orgname, setOrgname,closeOrg,getOrgname}}>
      {children}
    </IDBooleanContext.Provider>
  );
}

export function useIDContext() {
  const context = useContext(IDBooleanContext);
  if (!context) {
    throw new Error('IDBooleanContext must be used within a IDBooleanProvider');
  }
  return context;
}
