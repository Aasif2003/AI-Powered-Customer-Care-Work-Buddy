'use client';

import { useState, useEffect } from 'react';
import api from '@/app/services/axios';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIDContext } from '@/app/context/booleancontext';
import Modal from '@/app/components/modal/modal';
import ModalOptionsOrg from '@/app/components/modaloptions/modaloptionsorg';
import {
  ArrowPathIcon,
  ChatBubbleLeftEllipsisIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  ClockIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

export default function MockCallPage() {
  const { getOrgname } = useIDContext();
  const [history, setHistory] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [orgType, setOrgType] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const router = useRouter();
  const orgname = getOrgname();

  const loadConversation = async (id) => {
    try {
      const res = await api.get(`mockconversations/${id}/all/`, { withCredentials: true });
      setConversationId(id);
      setResponse(res.data.response);
      setOrgType(res.data.org_type);
      setSelectedHistory(id);
    } catch (err) {
      console.error("Error loading conversation:", err);
    }
  };

  const handleMockCall = async () => {
    if (!orgType) {
      alert('Please select an organization type.');
      return;
    }

    setActive(true);
    setLoading(true);
    setResponse(null);

    try {
      if (!conversationId) {
        const res = await api.post(
          '/mock-call/',
          { orgname: orgname, org_type: orgType, notes },
          { withCredentials: true }
        );
        setResponse(res.data.reply.response);
        setConversationId(res.data.conversation_id);
      } else {
        const res = await api.post(
          `/mock-call-message/${conversationId}/messages/`,
          { org_type: orgType, notes },
          { withCredentials: true }
        );
        setResponse(res.data.response);
      }
    } catch (err) {
      console.error(err);
      setResponse('Error contacting AI. Please try again.');
    } finally {
      setLoading(false);
      setActive(false);

      // Refresh history after new call
      const res = await api.get('mockconversations/history/', { withCredentials: true });
      setHistory(res.data);
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
    const fetchHistory = async () => {
      try {
        const res = await api.get('mockconversations/history/', { withCredentials: true });
        setHistory(res.data);
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 lg:w-72 flex-col bg-white border-r border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <ChatBubbleLeftEllipsisIcon className="h-5 w-5 mr-2 text-indigo-600" />
            AI Trainer
          </h2>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/mock-call">
            <div className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              router.pathname === '/dashboardm/train'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}>
              <ArrowPathIcon className="h-5 w-5 mr-3" />
              New Training Session
            </div>
          </Link>

          <Link href="/mock-call/history">
            <div className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              router.pathname === '/mock-call/history'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}>
              <BookOpenIcon className="h-5 w-5 mr-3" />
              History
            </div>
          </Link>

          <Link href="/mock-call/settings">
            <div className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              router.pathname === '/mock-call/settings'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}>
              <Cog6ToothIcon className="h-5 w-5 mr-3" />
              Settings
            </div>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
            <ClockIcon className="h-4 w-4 mr-2" />
            Recent Sessions
          </h3>
          <div className="space-y-1">
            {history.slice(0, 5).map((conv) => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  selectedHistory === conv.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="truncate">{conv.title}</span>
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Training Simulator</h1>
            <p className="text-sm text-gray-500">Practice and improve your customer interactions</p>
          </div>
          <Modal>
            <ModalOptionsOrg />
          </Modal>
        </div>

        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-800">Create Training Session</h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Organization Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Type
                  </label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full rounded-lg border text-gray-700 border-gray-300 bg-gray-50 px-4 py-3 focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select organization type</option>
                    <option value="customer-care">Customer Care</option>
                    <option value="sales">Sales</option>
                    <option value="support">Technical Support</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Select the type of organization you're training for
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Training Scenario
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Describe the scenario, customer profile, or specific training goals..."
                    className="w-full rounded-lg border text-black border-gray-300 bg-gray-50 px-4 py-3 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-sm text-gray-600">
                    Provide context to help the AI simulate realistic interactions
                  </p>
                </div>

                {/* Button */}
                <div className="pt-4">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    animate={active ? { backgroundColor: '#10B981' } : {}}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    onClick={handleMockCall}
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : active
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      {loading && (
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      )}
                      {loading ? 'Processing...' : 'Start Training Session'}
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* AI Response */}
            {response && (
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-indigo-50 border-b border-gray-200">
                  <h2 className="text-sm font-medium text-indigo-700 uppercase tracking-wider">
                    AI Response
                  </h2>
                </div>
                <div className="p-6">
                  <p className="text-gray-800 whitespace-pre-wrap">{response}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
