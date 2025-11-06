'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/app/services/axios';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import Modal from '@/app/components/modal/modal';

import ModalOptionsOrg from '@/app/components/modaloptions/modaloptionsorg'

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DashboardPage() {
  const [sentimentChart, setSentimentChart] = useState(null);
  const [emotionChart, setEmotionChart] = useState(null);
  const [cussentimentChart, setCussentimentChart] = useState(null);
  const [stressUsers, setStressUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response=await api.get('/auth/verify-token-organizer/', { withCredentials: true });
      } catch (error) {
        router.push('/logino/');
      }
    };

    const fetchActivity = async () => {
      try {
        const response = await api.get('employeeactivity/', { withCredentials: true });
        const { analyses, emotion, customeranalyses,stressusers } = response.data;
        console.log(stressusers);
        setStressUsers(stressusers);
        setLoading(false);
        // Prepare sentiment chart data
        const sentimentLabels = analyses.map(item => item.employee_sentiment);
        const sentimentData = analyses.map(item => item.count);

        const sentimentColors = ['#4F46E5', '#06B6D4', '#F59E0B', '#10B981', '#F472B6'];
        const sentimentChartData = {
          labels: sentimentLabels,
          datasets: [
            {
              label: 'Employee Sentiment',
              data: sentimentData,
              backgroundColor: sentimentColors.slice(0, sentimentLabels.length),
              borderColor: ['#fff'],
              borderWidth: 2,
            },
          ],
        };




        // Prepare emotion chart data
        const emotionLabels = emotion.map(item => item.emotion);
        const emotionData = emotion.map(item => item.count);

        const emotionColors = [
          '#DC2626', '#F97316', '#EAB308', '#22C55E',
          '#3B82F6', '#8B5CF6', '#EC4899'
        ];
        const emotionChartData = {
          labels: emotionLabels,
          datasets: [
            {
              label: 'Employee Emotions',
              data: emotionData,
              backgroundColor: emotionColors.slice(0, emotionLabels.length),
              borderColor: ['#fff'],
              borderWidth: 2,
            },
          ],
        };
        // Prepare sentiment chart data
        const cussentimentLabels = customeranalyses.map(item => item.employee_sentiment);
        const cussentimentData = customeranalyses.map(item => item.count);

        const cussentimentColors = ['#4F46E5', '#06B6D4', '#F59E0B', '#10B981', '#F472B6'];
        const cussentimentChartData = {
          labels: cussentimentLabels,
          datasets: [
            {
              label: 'Employee Sentiment',
              data: cussentimentData,
              backgroundColor: cussentimentColors.slice(0, cussentimentLabels.length),
              borderColor: ['#fff'],
              borderWidth: 2,
            },
          ],
        };
        setSentimentChart(sentimentChartData);
        setEmotionChart(emotionChartData);
        setCussentimentChart(cussentimentChartData)
      } catch (error) {
        console.error('Failed to fetch activity data:', error);
        setLoading(false);
      }
    };

    checkAuth();
    fetchActivity();
    const interval = setInterval(fetchActivity, 90000); // refresh every 90s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Real-time insights from employee interactions</p>
          </div>
          <Modal>
            <ModalOptionsOrg />
          </Modal>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-blue-50 p-3 rounded-lg mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Employee Sentiment</p>
                <p className="text-2xl font-semibold">{sentimentChart ? sentimentChart.datasets[0].data.reduce((a, b) => a + b, 0) : 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-purple-50 p-3 rounded-lg mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Emotion Analysis</p>
                <p className="text-2xl font-semibold">{emotionChart ? emotionChart.datasets[0].data.reduce((a, b) => a + b, 0) : 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-green-50 p-3 rounded-lg mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Customer Sentiments</p>
                <p className="text-2xl font-semibold">{cussentimentChart ? cussentimentChart.datasets[0].data.reduce((a, b) => a + b, 0) : 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Employee Sentiment</h2>
            <div className="h-64 flex items-center justify-center">
              {sentimentChart ?
                <Pie data={sentimentChart} options={{ maintainAspectRatio: false }} /> :
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading Sentiment Data</p>
                </div>
              }
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Employee Emotions</h2>
            <div className="h-64 flex items-center justify-center">
              {emotionChart ?
                <Pie data={emotionChart} options={{ maintainAspectRatio: false }} /> :
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading Emotion Data</p>
                </div>
              }
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Sentiment</h2>
            <div className="h-64 flex items-center justify-center">
              {cussentimentChart ?
                <Pie data={cussentimentChart} options={{ maintainAspectRatio: false }} /> :
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading Customer Data</p>
                </div>
              }
            </div>
          </div>
        </div>

        {/* Stressed Users Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800">Stressed Users (Last 3 Minutes)</h2>
            <p className="text-gray-500 text-sm mt-1">Real-time detection of employees needing support</p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : stressUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500 mt-4">No stressed users detected</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detected Emotion</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stressUsers.map((user, index) => (
                      <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 capitalize">
                            {user.emotion}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <span className="inline-flex items-center">
                            <span className="h-2 w-2 bg-red-500 rounded-full mr-2"></span>
                            Requires Attention
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
