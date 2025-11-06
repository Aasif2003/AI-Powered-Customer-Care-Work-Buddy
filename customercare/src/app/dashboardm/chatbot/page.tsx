'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import api from '@/app/services/axios';
import {useIDContext} from '@/app/context/booleancontext';
import Modal from '@/app/components/modal/modal';
import { FiMessageSquare, FiClock, FiSettings, FiSend } from 'react-icons/fi';
import ModalOptionsOrg from '@/app/components/modaloptions/modaloptionsorg'

export default function ChatPage() {
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);
  const {getOrgname}=useIDContext();

  const [history, setHistory] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const orgname= getOrgname();

  const loadConversation = async (id) => {
    try {
      const res = await api.get(`conversations/${id}/all/`, { withCredentials: true });
      setConversationId(id);
      setMessages(res.data); // This sets all old messages
    } catch (err) {
      console.error("Error loading conversation:", err);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      if (!conversationId) {
      const res = await api.post(
        '/chat/',
        { query: input,
         orgname: orgname },
        { withCredentials: true }
      );
      setConversationId(res.data.conversation_id);
      console.log(res.data.conversation_id);
      const assistantReply = res.data?.reply || 'No response';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantReply },
      ]);
    } else {
      const res = await api.post(
        `/api/conversations/${conversationId}/messages/`,
        { query: input ,
          orgname: orgname },

        { withCredentials: true }
      );
      const assistantReply = res.data?.reply || 'No response';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantReply },
      ]);
    }


    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error retrieving reply.' },
      ]);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get('/auth/verify-token/', { withCredentials: true });
      } catch (error) {
        router.push('/loginm/');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

 useEffect(()=>{

   const fetchHistory = async () => {
    const res = await api.get('conversations/history/',
 { withCredentials: true });
    setHistory(res.data);
  };
  fetchHistory();
},[orgname]);
  return (
    <div className="flex h-screen bg-gray-50">
   <Modal>
     <ModalOptionsOrg />
   </Modal>

   {/* Sidebar - Professional Design */}
   <aside className="w-64 bg-gray-900 text-white flex flex-col border-r border-gray-700">
     <div className="p-5 border-b border-gray-700">
       <h1 className="text-xl font-bold">Chat Assistant</h1>
       <p className="text-gray-400 text-sm mt-1">{orgname || 'Organization'}</p>
     </div>

     <div className="flex-1 flex flex-col py-4">
       <button className="sidebar-button">
         <FiMessageSquare className="mr-3" />
         New Chat
       </button>

       <div className="mt-6 px-4 mb-2 flex items-center text-gray-400 text-sm">
         <FiClock className="mr-2" />
         <span>Recent Chats</span>
       </div>

       {/* Scrollable History Section */}
       <div className="overflow-y-auto flex-1 max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
         {history.map((conv) => (
           <div
             key={conv.id}
             onClick={() => loadConversation(conv.id)}
             className="history-item"
           >
             <span className="truncate">{conv.title}</span>
           </div>
         ))}
       </div>

       <button className="sidebar-button mt-auto">
         <FiSettings className="mr-3" />
         Settings
       </button>
     </div>
   </aside>

   {/* Main Chat Area - Professional Design */}
   <main className="flex-1 flex flex-col">
     {/* Message Container */}
     <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-gray-100">
       <div className="max-w-4xl mx-auto space-y-4">
         {messages.map((msg, idx) => (
           <div
             key={idx}
             className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
           >
             <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
               msg.role === 'user'
                 ? 'bg-blue-600 text-white rounded-br-none'
                 : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
             }`}>
               {msg.content}
             </div>
           </div>
         ))}
         <div ref={messagesEndRef} />
       </div>
     </div>

     {/* Input Area */}
     <form
       onSubmit={handleSubmit}
       className="border-t border-gray-200 bg-white p-4"
     >
       <div className="max-w-4xl mx-auto flex gap-3">
         <input
           className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
           placeholder="Type your message..."
           value={input}
           onChange={(e) => setInput(e.target.value)}
         />
         <button
           type="submit"
           className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition duration-200 flex items-center justify-center w-14"
         >
           <FiSend className="text-xl" />
         </button>
       </div>
     </form>
   </main>
 </div>
  );
}
