'use client';
import {useState,useEffect} from "react";
import { useRouter } from 'next/navigation';

import api from "@/app/services/axios";
export default function OrgC(){



  const [message,setMessage]=useState("")
  const [formData,setformData]=useState({
    orgname:'',
    orgcode:"",


  })

  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
         const response=await api.get('/auth/verify-token/', { withCredentials: true });

      } catch (error) {
        router.push('/logino/')

      }
    };
    checkAuth();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setformData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/joinorg/", formData, {
        headers: {
          "Content-Type": "application/json",

        },
      });
      setMessage("Successfully Created!");
      router.push('/dashboardo/monitor')

    } catch (error) {
      setMessage(
        "Creation failed. " +
          (error.response?.data?.detail || error.message)
      );
    }
  };





  return(
    <>
    <div className="min-h-screen flex flex-row bg-white w-full justify-center items-center">
    <div className="w-full max-w-md min-h-[400px] bg-white border border-black-500 rounded-md flex flex-col items-center p-4">
    <div className="text-xl text-blue-500 mb-20 font-bold">
    Join an organization to access all the features{message &&  <p>{message}</p>}
    </div>
    <form onSubmit={handleSubmit}>


    <div className="flex flex-row justify-between mb-6 w-full items-center">
    <label htmlFor="orgname" className="text-black">
    Organization name
    </label>
    <input id="orgname" type="text" name="orgname" placeholder="Organization Name" value={formData.orgname} onChange={handleChange} className="text-black ml-5 border-2 border-black-500 w-[250px] rounded-md p-2" />
    </div>
    <div className="flex flex-row justify-between mb-6 w-full items-center">
    <label htmlFor="orgcode" className="text-black">
    Organization code
    </label>
    <input id="orgcode" type="password" name="orgcode" placeholder="Organization Code" value={formData.orgcode} onChange={handleChange} className="text-black ml-5 border-2 border-black-500 w-[250px] rounded-md p-2" />
    </div>
    <button type="submit" className="bg-blue-500 p-2 rounded-md">
    Create
    </button>
    </form>
    </div>
    </div>
    </>

  )
}
