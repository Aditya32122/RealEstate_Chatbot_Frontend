import React, { useState, useRef, useEffect } from 'react';
import { Send, Download, BarChart3, TrendingUp, MapPin, Upload, File, X, Sparkles, Loader2, Server, CheckCircle, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const REC = () => {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: '👋 Hello! I\'m your AI Real Estate Analyst.\n\n📤 Upload your Excel/CSV file to get started, or ask questions if data is already loaded!\n\n💡 Try these smart queries:\n• "Show me price trends in Wakad"\n• "Compare prices across locations"\n• "What are the total sales by year?"\n• "Analyze demand patterns"\n• "Show me the top performing areas"'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking', 'ready', 'error'
  const [healthMessage, setHealthMessage] = useState('Connecting to server...');
  const [healthAttempts, setHealthAttempts] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const hasCheckedData = useRef(false);

  const API_BASE_URL = 'https://realestate-chatbot-backend-im6f.onrender.com/api';
  const MAX_HEALTH_ATTEMPTS = 20; // 20 attempts * 3 seconds = 60 seconds

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Health check on mount
  useEffect(() => {
    const performHealthCheck = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health-check`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setServerStatus('ready');
          setHealthMessage('✅ Server is ready!');
          
          // After server is ready, check for existing data
          setTimeout(() => {
            checkExistingData();
          }, 500);
          
          return true;
        } else {
          throw new Error('Server not ready');
        }
      } catch (error) {
        const currentAttempt = healthAttempts + 1;
        setHealthAttempts(currentAttempt);
        
        if (currentAttempt < MAX_HEALTH_ATTEMPTS) {
          const elapsedTime = currentAttempt * 3;
          setHealthMessage(`⏳ Waking up server... (${elapsedTime}s / 60s)\n\n🔄 Free hosting takes 30-60 seconds to start.\nPlease be patient...`);
          
          // Retry after 3 seconds
          setTimeout(() => {
            performHealthCheck();
          }, 3000);
          
          return false;
        } else {
          setServerStatus('error');
          setHealthMessage('❌ Server failed to start after 60 seconds.\n\n🔄 Please refresh the page to try again.\n\n💡 If the problem persists, the backend might be down.');
          return false;
        }
      }
    };

    performHealthCheck();
  }, []); // Run once on mount

  // Check for existing data after server is ready
  const checkExistingData = async () => {
    if (hasCheckedData.current) return;
    hasCheckedData.current = true;

    try {
      const response = await fetch(`${API_BASE_URL}/check-data`);
      const data = await response.json();
      
      if (data.exists) {
        setUploadedFile({
          name: 'Pre-loaded data',
          size: 'N/A',
          columns: ['locality', 'date', 'price', 'demand'],
          rows: data.points_count || 0
        });
        
        setMessages(prev => [...prev, {
          type: 'bot',
          text: `✅ Data already loaded in Qdrant!\n\n📊 Found ${data.points_count?.toLocaleString()} embedded records\n\n🎯 You can start asking questions immediately:\n• "Show price trends for Wakad"\n• "Compare demand across locations"\n• "What are the yearly sales patterns?"`
        }]);
      }
    } catch (error) {
      console.log('No existing data found');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      setMessages(prev => [...prev, {
        type: 'bot',
        text: '❌ Please upload a valid CSV or Excel file (.csv, .xlsx, .xls)'
      }]);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadedFile({
          name: file.name,
          size: (file.size / 1024).toFixed(2) + ' KB',
          columns: data.columns || [],
          rows: data.rows_processed || 0
        });

        setMessages(prev => [...prev, {
          type: 'bot',
          text: `✅ File "${file.name}" uploaded and embedded successfully!\n\n📊 Data Summary:\n• Total Rows: ${data.rows_processed || 'N/A'}\n• Columns: ${data.columns?.join(', ') || 'N/A'}\n• Vector Storage: Qdrant Cloud\n\n🎯 Now ask me anything about your real estate data!`
        }]);
      } else {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: `❌ Upload failed: ${data.error || 'Unknown error'}\n\n${data.found_columns ? `Found columns: ${data.found_columns.join(', ')}` : ''}`
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'bot',
        text: `❌ Upload error: ${error.message}\n\nMake sure:\n1. Django server is running\n2. Qdrant is configured\n3. GEMINI_API_KEY is set`
      }]);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const analyzeQuery = async (query) => {
    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
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
    if (!input.trim() || serverStatus !== 'ready') return;

    const userMessage = { type: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await analyzeQuery(input);
      
      const botMessage = {
        type: 'bot',
        text: response.summary || 'Analysis complete.',
        chartData: response.chart?.data || [],
        chartType: response.chart?.type || 'line',
        tableData: response.table || []
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'bot',
        text: `❌ Error: ${error.message}\n\n💡 ${error.message.includes('No data found') ? 'Please upload a file first!' : 'Troubleshooting:\n1. Check if Django server is running\n2. Verify Qdrant connection\n3. Ensure GEMINI_API_KEY is valid\n4. Try rephrasing your query'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setMessages(prev => [...prev, {
      type: 'bot',
      text: '🗑️ File removed. Upload a new file to continue analysis.'
    }]);
  };

  const downloadData = (data) => {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `real_estate_analysis_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(val => 
      typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    ).join(','));
    return [headers, ...rows].join('\n');
  };

  const quickQueries = [
    'Show me price trends in Wakad',
    'Compare prices across different locations',
    "Give me analysis of Wakad",
    "Compare Ambegaon Budruk and Aundh demand trends",
    "Show price growth for Akurdi over the last 3 years"
  ];

  // Loading Screen Component
  if (serverStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full border border-indigo-100">
          <div className="text-center">
            {/* Animated Logo */}
            <div className="mb-6 relative">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-full mx-auto w-24 h-24 flex items-center justify-center shadow-xl animate-pulse">
                <Server className="text-white" size={48} />
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Real Estate Analyst
            </h1>
            <p className="text-sm text-gray-500 mb-6">Powered by AI</p>

            {/* Status Message */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-6 border border-indigo-100">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
                <span className="font-semibold text-gray-800">Initializing Server</span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {healthMessage}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min((healthAttempts / MAX_HEALTH_ATTEMPTS) * 100, 100)}%` }}
              ></div>
            </div>

            {/* Info Text */}
            <div className="text-xs text-gray-500 space-y-1">
              <p className="flex items-center justify-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Health check in progress...
              </p>
              <p className="flex items-center justify-center gap-2">
                <Server size={14} className="text-indigo-500" />
                Attempt {healthAttempts} of {MAX_HEALTH_ATTEMPTS}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error Screen Component
  if (serverStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full border border-red-200">
          <div className="text-center">
            {/* Error Icon */}
            <div className="mb-6">
              <div className="bg-red-100 p-6 rounded-full mx-auto w-24 h-24 flex items-center justify-center">
                <AlertCircle className="text-red-600" size={48} />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-red-600 mb-2">
              Connection Failed
            </h1>

            {/* Error Message */}
            <div className="bg-red-50 rounded-xl p-4 mb-6 border border-red-200">
              <p className="text-sm text-red-700 whitespace-pre-line leading-relaxed">
                {healthMessage}
              </p>
            </div>

            {/* Retry Button */}
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
            >
              🔄 Refresh Page
            </button>

            {/* Help Text */}
            <div className="mt-6 text-xs text-gray-500 space-y-1">
              <p>💡 Troubleshooting tips:</p>
              <ul className="text-left list-disc list-inside space-y-1 mt-2">
                <li>Check your internet connection</li>
                <li>Wait 2-3 minutes and refresh</li>
                <li>Backend may be temporarily down</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Chat Interface (when serverStatus === 'ready')
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-xl p-6 mb-4 border border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-3 rounded-xl shadow-lg">
                <BarChart3 className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Real Estate Analyst
                </h1>
                <p className="text-gray-600 flex items-center gap-2 mt-1">
                  <Sparkles size={16} className="text-yellow-500" />
                  Powered by Google Gemini AI + Qdrant Vector DB
                </p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Server Ready
                </p>
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
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Upload size={20} />
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </div>

          {/* File Info */}
          {uploadedFile && (
            <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-600 p-2 rounded-lg">
                  <File className="text-white" size={24} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {uploadedFile.size} • {uploadedFile.rows.toLocaleString()} rows • Embedded in Qdrant
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition"
                title="Remove file"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-xl shadow-xl flex flex-col border border-gray-100">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar h-[550px]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-4xl ${
                  msg.type === 'user' 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-gray-50 text-gray-800 border border-gray-200'
                } rounded-2xl p-5 shadow-md`}>
                  {msg.type === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  ) : (
                    <div>
                      <p className="whitespace-pre-wrap mb-4 leading-relaxed">{msg.text}</p>
                      
                      {/* Chart */}
                      {msg.chartData && msg.chartData.length > 0 && (
                        <div className="bg-white rounded-xl p-5 mb-4 shadow-md border border-gray-200">
                          <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={20} className="text-indigo-600" />
                            <h3 className="font-bold text-gray-800 text-lg">Visual Analysis</h3>
                          </div>
                          <ResponsiveContainer width="100%" height={350}>
                            {(() => {
                              const firstRow = msg.chartData[0];
                              const keys = Object.keys(firstRow);
                              
                              const xAxisKey = keys.find(key => {
                                const lowerKey = key.toLowerCase();
                                return lowerKey === 'year' ||
                                      lowerKey === 'date' ||
                                      lowerKey === 'month' ||
                                      lowerKey === 'time' ||
                                      lowerKey === 'location' || 
                                      lowerKey === 'locality' ||
                                      lowerKey === 'name' ||
                                      lowerKey === 'category' ||
                                      lowerKey === 'type';
                              }) || keys[0];
                              
                              const dataKeys = keys.filter(key => {
                                if (key === xAxisKey) return false;
                                const lowerKey = key.toLowerCase();
                                if (lowerKey.includes('id') || lowerKey.includes('index')) return false;
                                
                                const value = firstRow[key];
                                return typeof value === 'number' && !isNaN(value);
                              });
                              
                              const useBarChart = msg.chartType === 'bar';
                              
                              const colors = [
                                '#4f46e5', '#10b981', '#f59e0b', '#ef4444', 
                                '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
                              ];
                              
                              const formatKeyName = (key) => {
                                return key
                                  .replace(/_/g, ' ')
                                  .replace(/([A-Z])/g, ' $1')
                                  .split(' ')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                  .join(' ')
                                  .trim();
                              };
                              
                              const commonProps = {
                                data: msg.chartData,
                                margin: { top: 10, right: 30, left: 20, bottom: 70 }
                              };
                              
                              const xAxisProps = {
                                dataKey: xAxisKey,
                                stroke: '#6b7280',
                                angle: -45,
                                textAnchor: 'end',
                                height: 100,
                                tick: { fontSize: 11 },
                                interval: 0
                              };
                              
                              const yAxisProps = {
                                stroke: '#6b7280',
                                tick: { fontSize: 11 }
                              };
                              
                              const tooltipProps = {
                                contentStyle: { 
                                  backgroundColor: '#fff', 
                                  border: '1px solid #e5e7eb', 
                                  borderRadius: '8px',
                                  padding: '12px',
                                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                },
                                formatter: (value, name) => [
                                  typeof value === 'number' ? value.toLocaleString() : value,
                                  formatKeyName(name)
                                ],
                                labelFormatter: (label) => `${formatKeyName(xAxisKey)}: ${label}`
                              };
                              
                              const legendProps = {
                                wrapperStyle: { paddingTop: '10px', fontSize: '12px' },
                                formatter: (value) => formatKeyName(value)
                              };
                              
                              if (useBarChart) {
                                return (
                                  <BarChart {...commonProps}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis {...xAxisProps} />
                                    <YAxis {...yAxisProps} />
                                    <Tooltip {...tooltipProps} />
                                    <Legend {...legendProps} />
                                    {dataKeys.map((key, i) => (
                                      <Bar 
                                        key={key} 
                                        dataKey={key} 
                                        fill={colors[i % colors.length]} 
                                        radius={[8, 8, 0, 0]}
                                        name={formatKeyName(key)}
                                      />
                                    ))}
                                  </BarChart>
                                );
                              } else {
                                return (
                                  <LineChart {...commonProps}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis {...xAxisProps} />
                                    <YAxis {...yAxisProps} />
                                    <Tooltip {...tooltipProps} />
                                    <Legend {...legendProps} />
                                    {dataKeys.map((key, i) => (
                                      <Line 
                                        key={key} 
                                        type="monotone" 
                                        dataKey={key} 
                                        stroke={colors[i % colors.length]} 
                                        strokeWidth={3}
                                        dot={{ fill: colors[i % colors.length], r: 5 }}
                                        activeDot={{ r: 8 }}
                                        name={formatKeyName(key)}
                                      />
                                    ))}
                                  </LineChart>
                                );
                              }
                            })()}
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Table */}
                      {msg.tableData && msg.tableData.length > 0 && (
                        <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <MapPin size={20} className="text-indigo-600" />
                              <h3 className="font-bold text-gray-800 text-lg">Detailed Data</h3>
                            </div>
                            <button
                              onClick={() => downloadData(msg.tableData)}
                              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg text-sm font-medium"
                            >
                              <Download size={16} />
                              Export CSV
                            </button>
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                  {Object.keys(msg.tableData[0]).map(key => (
                                    <th key={key} className="px-4 py-3 text-left font-bold text-gray-700 capitalize whitespace-nowrap">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {msg.tableData.map((row, i) => (
                                  <tr key={i} className={`border-t border-gray-200 hover:bg-gray-50 transition ${i % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                                    {Object.values(row).map((val, j) => (
                                      <td key={j} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                        {typeof val === 'number' ? val.toLocaleString() : val}
                                      </td>
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
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 shadow-md border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    <span className="text-sm text-gray-600 font-medium">RAG AI is analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Queries */}
          <div className="border-t border-gray-200 p-3 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-gray-700">Quick Queries</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {quickQueries.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(query)}
                  className="bg-white hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 p-2 rounded-lg shadow-sm hover:shadow-md transition-all text-left text-xs text-gray-700 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 font-medium truncate"
                  title={query}
                >
                  💡 {query}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask anything about your real estate data..."
                className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 font-medium"
              >
                <Send size={20} />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
    </div>
  );
};

export default REC;