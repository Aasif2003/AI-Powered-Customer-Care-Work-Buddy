'use client';
import {useState,useEffect} from "react";
import { useRouter } from 'next/navigation';
import {useIDContext} from '@/app/context/booleancontext';
import api from "@/app/services/axios";
export default function Logino(){
  const {setActiveOrg,setOrgname}=useIDContext();
  const [message,setMessage]=useState("")
  const [formData,setformData]=useState({
    email:'',
    password:"",


  })

  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
         const response=await api.get('/auth/verify-token-organizer/', { withCredentials: true });
        if (response.status===200){
          router.push('/dashboardo/monitor')

        }

      } catch (error) {
        console.log('Not Logged in')
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
      const response = await api.post("/logino/", formData, {
        headers: {
          "Content-Type": "application/json",

        },
      });
      setMessage("Login successful!");
      console.log(response.data);
      try{
        localStorage.setItem('orgid',response.data.orgid)
        localStorage.setItem('orgname',response.data.orgname)
        setActiveOrg(response.data.orgid)
        setOrgname(response.data.orgname)
      }
      catch{
        console.log('No Organization created yet');
      }

      router.push('/dashboardo/monitor')

    } catch (error) {
      setMessage(
        "Login failed. " +
          (error.response?.data?.detail || error.message)
      );
    }
  };





  return(
    <>
    <div className="min-h-screen flex flex-row bg-white w-full justify-center items-center">
    <div className="w-full max-w-md min-h-[400px] bg-white border border-black-500 rounded-md flex flex-col items-center p-4">
    <div className="text-xl text-blue-500 mb-20 font-bold">
    Login as an organizer{message &&  <p>{message}</p>}
    </div>
    <form onSubmit={handleSubmit}>


    <div className="flex flex-row justify-between mb-6 w-full items-center">
    <label htmlFor="email" className="text-black">
    E-mail
    </label>
    <input id="email" type="email" name="email" placeholder="E-mail" value={formData.email} onChange={handleChange} className="text-black ml-5 border-2 border-black-500 w-[250px] rounded-md p-2" />
    </div>
    <div className="flex flex-row justify-between mb-6 w-full items-center">
    <label htmlFor="password" className="text-black">
    Password
    </label>
    <input id="password" type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="text-black ml-5 border-2 border-black-500 w-[250px] rounded-md p-2" />
    </div>
    <button type="submit" className="bg-blue-500 p-2 rounded-md">
    Register
    </button>
    </form>
    </div>
    </div>
    </>

  )
}
