import React, { useState, useRef, useEffect } from 'react';
import { Send, Download, BarChart3, TrendingUp, MapPin, Upload, File, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RealEstateChatbot = () => {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: 'Hello! Please upload your real estate CSV file to get started, or I can analyze the default dataset. Try queries like:\n• "Analyze Wakad"\n• "Compare Ambegaon Budruk and Aundh demand trends"\n• "Show price growth for Akurdi over the last 3 years"'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Django API base URL - Update this to your backend URL
  const API_BASE_URL = 'http://localhost:8000/api';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      setMessages(prev => [...prev, {
        type: 'bot',
        text: '❌ Please upload a valid CSV or Excel file.'
      }]);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload/`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadedFile({
          name: file.name,
          size: (file.size / 1024).toFixed(2) + ' KB',
          columns: data.columns_found || [],
          rows: data.total_rows || 0
        });

        setMessages(prev => [...prev, {
          type: 'bot',
          text: `✅ File "${file.name}" uploaded successfully!\n\n📊 Data Summary:\n• Total Rows: ${data.total_rows || 'N/A'}\n• Columns Found: ${data.columns_found?.length || 'N/A'}\n\nYou can now ask questions about your real estate data!`
        }]);
      } else {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: `❌ Upload failed: ${data.error || 'Unknown error'}`
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'bot',
        text: `❌ Upload error: ${error.message}. Make sure Django server is running on ${API_BASE_URL}`
      }]);
    } finally {
      setUploading(false);
    }
  };

  // Analyze query with Django backend
  const analyzeQuery = async (query) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      return data;
    } catch (error) {
      throw new Error(`API Error: ${error.message}`);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { type: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await analyzeQuery(input);
      
      const botMessage = {
        type: 'bot',
        text: response.summary || 'Analysis complete.',
        chartData: response.chartData || [],
        chartType: response.chartType || 'line',
        tableData: response.tableData || []
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'bot',
        text: `❌ Error: ${error.message}\n\nPlease ensure:\n1. Django server is running\n2. File is uploaded\n3. Query mentions valid location names`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setMessages(prev => [...prev, {
      type: 'bot',
      text: 'File removed. Please upload a new file to continue analysis.'
    }]);
  };

  const downloadData = (data) => {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'real_estate_analysis.csv';
    a.click();
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    return [headers, ...rows].join('\n');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-3 rounded-lg">
                <BarChart3 className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Real Estate Analysis Chatbot</h1>
                <p className="text-gray-600">Upload CSV and analyze property trends with AI</p>
              </div>
            </div>

            {/* Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
              >
                <Upload size={20} />
                {uploading ? 'Uploading...' : 'Upload CSV'}
              </button>
            </div>
          </div>

          {/* File Info */}
          {uploadedFile && (
            <div className="mt-4 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <File className="text-green-600" size={24} />
                <div>
                  <p className="font-semibold text-gray-800">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {uploadedFile.size} • {uploadedFile.rows} rows • {uploadedFile.columns.length} columns
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="text-red-600 hover:text-red-800 transition"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-4xl ${msg.type === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'} rounded-lg p-4 shadow`}>
                  {msg.type === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div>
                      <p className="whitespace-pre-wrap mb-4">{msg.text}</p>
                      
                      {/* Chart */}
                      {msg.chartData && msg.chartData.length > 0 && (
                        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={20} className="text-indigo-600" />
                            <h3 className="font-semibold text-gray-800">Visual Analysis</h3>
                          </div>
                          <ResponsiveContainer width="100%" height={250}>
                            {msg.chartType === 'bar' ? (
                              <BarChart data={msg.chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {Object.keys(msg.chartData[0])
                                  .filter(key => key !== 'year' && key !== 'location')
                                  .map((key, i) => (
                                    <Bar key={key} dataKey={key} fill={i === 0 ? '#4f46e5' : '#10b981'} />
                                  ))}
                              </BarChart>
                            ) : (
                              <LineChart data={msg.chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {Object.keys(msg.chartData[0])
                                  .filter(key => key !== 'year')
                                  .map((key, i) => (
                                    <Line key={key} type="monotone" dataKey={key} stroke={['#4f46e5', '#10b981', '#f59e0b'][i]} strokeWidth={2} />
                                  ))}
                              </LineChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Table */}
                      {msg.tableData && msg.tableData.length > 0 && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <MapPin size={20} className="text-indigo-600" />
                              <h3 className="font-semibold text-gray-800">Detailed Data</h3>
                            </div>
                            <button
                              onClick={() => downloadData(msg.tableData)}
                              className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                            >
                              <Download size={16} />
                              Download
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50">
                                  {Object.keys(msg.tableData[0]).map(key => (
                                    <th key={key} className="px-4 py-2 text-left font-semibold text-gray-700 capitalize">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {msg.tableData.map((row, i) => (
                                  <tr key={i} className="border-t border-gray-200">
                                    {Object.values(row).map((val, j) => (
                                      <td key={j} className="px-4 py-2 text-gray-700">{val}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4 shadow">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about real estate trends..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <Send size={20} />
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {['Analyze Wakad', 'Compare Ambegaon Budruk and Aundh', 'Price growth for Akurdi'].map((query, idx) => (
            <button
              key={idx}
              onClick={() => setInput(query)}
              className="bg-white p-3 rounded-lg shadow hover:shadow-md transition text-left text-sm text-gray-700 hover:text-indigo-600"
            >
              "{query}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RealEstateChatbot;