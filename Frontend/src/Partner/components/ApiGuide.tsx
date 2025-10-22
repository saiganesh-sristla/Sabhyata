// Partner/components/ApiGuide.jsx
import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  ExternalLink, 
  Play, 
  Code, 
  Key, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Book, 
  Calendar, 
  Users, 
  ChevronDown,
  ChevronRight,
  Terminal,
  FileText,
  Zap,
  Lock,
  Menu,
  X
} from 'lucide-react';
import { Eye, EyeOff } from "lucide-react";

import { API_URL as API_BASE } from '../utils/apiUrl';

const ApiGuide = ({ sessionToken }) => {
  const [apiToken, setApiToken] = useState(localStorage.getItem('apiToken') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eventsData, setEventsData] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [activeTab, setActiveTab] = useState('readme');
  const [expandedEndpoints, setExpandedEndpoints] = useState({});
  const [showToken, setShowToken] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function maskToken(token) {
    if (!token) return "";
    const visibleStart = token.slice(0, 7);
    const masked = "*".repeat(token.length - 8);
    return `${visibleStart}${masked}`;
  }

  useEffect(() => {
    const ensureToken = async () => {
      if (!apiToken && sessionToken) {
        setLoading(true);
        try {
          const res = await fetch(`${API_BASE}/partners/regenerate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${sessionToken}` }
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          setApiToken(data.apiToken);
          localStorage.setItem('apiToken', data.apiToken);
        } catch (err) {
          setError('Failed to fetch token: ' + err.message);
        } finally {
          setLoading(false);
        }
      }
    };
    ensureToken();
  }, [apiToken, sessionToken]);

  const handleTestFetch = async () => {
    if (!apiToken) {
      setFetchError('No API token available. Regenerate first.');
      return;
    }
    setFetchLoading(true);
    setFetchError('');
    setEventsData(null);
    try {
      const res = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      setEventsData(data);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  const toggleEndpoint = (endpoint) => {
    setExpandedEndpoints(prev => ({
      ...prev,
      [endpoint]: !prev[endpoint]
    }));
  };

  const tabs = [
    { id: 'readme', label: 'README', icon: Book },
    { id: 'authentication', label: 'Auth', icon: Key },
    { id: 'api', label: 'API', icon: Terminal },
    { id: 'errors', label: 'Errors', icon: AlertCircle },
    { id: 'rate-limits', label: 'Limits', icon: Clock }
  ];

  const apiEndpoints = [
    // Monuments
    {
      id: 'monuments-list',
      method: 'GET',
      path: '/partner-events/monuments',
      title: 'Get All Monuments',
      description: 'Retrieve monuments with optional filters (page/limit/search)',
      response: { 200: { description: 'Success', example: { success: true, data: { monuments: [], pagination: {} } } } }
    },
    {
      id: 'monument-details',
      method: 'GET',
      path: '/partner-events/monuments/{id}',
      title: 'Monument Details',
      description: 'Get monument details and populated events',
      parameters: [{ name: 'id', type: 'string', required: true }],
      response: { 200: { description: 'Success', example: { success: true, data: { /* monument */ } } } }
    },
    {
      id: 'monument-events',
      method: 'GET',
      path: '/partner-events/monuments/{id}/events',
      title: 'Events For Monument',
      description: 'List events that belong to a monument',
      parameters: [{ name: 'id', type: 'string', required: true }],
      response: { 200: { description: 'Success', example: { success: true, data: [] } } }
    },

    // Events
    {
      id: 'events-list',
      method: 'GET',
      path: '/partner-events',
      title: 'Get All Events',
      description: 'Retrieve a paginated list of events. You can also use /partner-events/events',
      parameters: [
        { name: 'page', type: 'integer', required: false, default: '1', description: 'Page number' },
        { name: 'limit', type: 'integer', required: false, default: '20', description: 'Items per page' },
        { name: 'search', type: 'string', required: false, description: 'Search term for name/description' },
        { name: 'status', type: 'string', required: false, description: 'Filter by event status (published/draft)' }
      ],
      response: {
        200: {
          description: 'Success',
          example: { success: true, data: { events: [], pagination: {} } }
        }
      }
    },

    // Single event
    {
      id: 'event-details',
      method: 'GET',
      path: '/partner-events/events/{eventId}',
      title: 'Get Event Details',
      description: 'Retrieve detailed information for an event',
      parameters: [{ name: 'eventId', type: 'string', required: true, description: 'Event ObjectId or ID' }],
      response: { 200: { description: 'Success', example: { success: true, data: { /* event object */ } } } }
    },

    // Seat layouts & locking
    {
      id: 'seat-layout',
      method: 'GET',
      path: '/partner-events/seat-layout/{event_id}',
      title: 'Get Seat Layout / Show Layout',
      description: 'Get template seat layout when date/time omitted, or show-scoped layout when date & time provided',
      parameters: [
        { name: 'event_id', type: 'string', required: true },
        { name: 'date', type: 'string', required: false, description: 'ISO date (optional)' },
        { name: 'time', type: 'string', required: false, description: 'Show time (optional)' }
      ],
      response: { 200: { description: 'Success', example: { success: true, data: { seatLayout: { layout_data: [] } } } } }
    },
    {
      id: 'lock-seats',
      method: 'POST',
      path: '/partner-events/seat-layout/{event_id}/lock-seats',
      title: 'Lock Seats (hold)',
      description: 'Temporarily lock seats for a session and receive a bookingId to complete payment',
      requestBody: {
        seat_ids: 'array of seatIds',
        date: 'YYYY-MM-DD (required)',
        time: 'HH:mm (required)',
      },
      response: { 200: { description: 'Success', example: { success: true, data: { bookingId: 'BOOKING_ID', held_seats: [] } } } }
    },

    // Booking details
    {
      id: 'get-booking',
      method: 'GET',
      path: '/partner-events/bookings/{id}',
      title: 'Get Booking by ID/Reference',
      description: 'Retrieve booking by bookingReference or Mongo _id. Returns booking data and tickets',
      parameters: [{ name: 'id', type: 'string', required: true }],
      response: { 200: { description: 'Success', example: { success: true, data: { /* booking */ } } } }
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-screen">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading API documentation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 bg-red-50 border border-red-200 rounded-lg m-4">
        <div className="flex items-center space-x-2 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium">Error loading API token</span>
        </div>
        <p className="text-red-600 mt-2 text-sm">{error}</p>
      </div>
    );
  }

  const renderReadme = () => (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg border">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 flex items-center">
          <Book className="mr-2 flex-shrink-0" size={24} />
          <span className="truncate">Sabhayata Foundation API</span>
        </h3>
        <p className="text-gray-700 mb-4 text-sm sm:text-base leading-relaxed">
          Welcome to the Sabhayata Foundation Partner API! This RESTful API allows third-party developers 
          to integrate with our event booking system, enabling you to fetch events, manage bookings, 
          and provide seamless ticket purchasing experiences to your users.
        </p>
        
        <div className="grid  grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <Calendar className="text-[#982A3D] mb-2" size={32} />
            <h4 className="font-semibold mb-1">Event Management</h4>
            <p className="text-xs sm:text-sm text-gray-600">Access comprehensive event data with real-time availability</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <Users className="text-green-600 mb-2" size={32} />
            <h4 className="font-semibold mb-1">Booking System</h4>
            <p className="text-xs sm:text-sm text-gray-600">Complete booking flow with seat locking and payment processing</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <Shield className="text-purple-600 mb-2" size={32} />
            <h4 className="font-semibold mb-1">Secure & Reliable</h4>
            <p className="text-xs sm:text-sm text-gray-600">Enterprise-grade security with comprehensive error handling</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg border">
        <h4 className="text-lg font-semibold mb-3 flex items-center">
          <Zap className="mr-2 text-yellow-500 flex-shrink-0" size={20} />
          Quick Start Test
        </h4>
        <p className="text-gray-600 mb-4 text-sm">Test the API connection and see sample data from our events endpoint.</p>
        
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <button 
            onClick={handleTestFetch} 
            disabled={fetchLoading || !apiToken}
            className="bg-[#982A3D] hover:bg-gray-800 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center"
          >
            {fetchLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Play className="mr-2 flex-shrink-0" size={16} />
            )}
            <span className="truncate">{fetchLoading ? 'Testing...' : 'Test API Connection'}</span>
          </button>
        </div>

        {fetchError && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
            <p className="text-red-700 flex items-center text-sm">
              <AlertCircle className="mr-2 flex-shrink-0" size={16} />
              <span className="break-words">{fetchError}</span>
            </p>
          </div>
        )}

        {eventsData && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-semibold flex items-center">
                <CheckCircle className="mr-2 text-green-500 flex-shrink-0" size={16} />
                API Response
              </h5>
              <button
                onClick={() => copyToClipboard(JSON.stringify(eventsData, null, 2), 'Response')}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <Copy className="mr-1 flex-shrink-0" size={14} />
                Copy
              </button>
            </div>
            <div className="overflow-x-auto">
              <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono whitespace-pre-wrap break-words min-w-0">
                {JSON.stringify(eventsData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg border">
        <h4 className="text-lg font-semibold mb-3">Getting Started</h4>
        <div className="space-y-4">
          {[
            { step: 1, title: 'Get Your API Token', desc: 'Navigate to the Authentication tab to get your API token' },
            { step: 2, title: 'Explore API Endpoints', desc: 'Check the API tab for detailed endpoint documentation' },
            { step: 3, title: 'Use Code Examples', desc: 'Copy ready-to-use code from the Examples tab' },
            { step: 4, title: 'Handle Errors', desc: 'Implement proper error handling using our Errors guide' }
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {step}
              </div>
              <div className="min-w-0">
                <h5 className="font-semibold">{title}</h5>
                <p className="text-gray-600 text-sm break-words">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAuthentication = () => (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg border">
        <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center">
          <Key className="mr-2 text-[#982A3D] flex-shrink-0" size={24} />
          <span className="truncate">Authentication</span>
        </h3>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-[#982A3D]">
            <h4 className="font-semibold mb-2">API Token Required</h4>
            <p className="text-[#982A3D] mb-3 text-sm sm:text-base">
              All API requests require authentication using a Bearer token in the Authorization header.
            </p>
            
            {apiToken ? (
              <div className="bg-white p-3 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Your API Token:</span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="text-gray-600 hover:text-gray-800 flex items-center"
                      title={showToken ? "Hide Token" : "Show Token"}
                    >
                      {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(apiToken, "API Token")}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <Copy className="mr-1 flex-shrink-0" size={14} />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <code className="text-xs font-mono bg-gray-100 p-2 rounded block break-all">
                    {showToken ? apiToken : "•".repeat(apiToken.length)}
                  </code>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-red-700 text-sm">No API token available. Please regenerate your token.</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Authentication Headers</h4>
            <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
              <pre className="font-mono text-sm whitespace-pre">
{`Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json`}
              </pre>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">cURL Example</h4>
            <div className="bg-gray-900 p-4 rounded-lg relative overflow-x-auto">
              <button
                onClick={() =>
                  copyToClipboard(
                    `curl -X GET "${API_BASE}/partner-events" \\\n  -H "Authorization: Bearer ${apiToken}" \\\n  -H "Content-Type: application/json"`,
                    "cURL Example"
                  )
                }
                className="absolute top-2 right-2 text-gray-400 hover:text-white z-10"
                title="Copy cURL Command"
              >
                <Copy size={16} />
              </button>
              <pre className="text-green-400 text-xs font-mono whitespace-pre overflow-x-auto">
{`curl -X GET "${API_BASE}/partner-events" \\
  -H "Authorization: Bearer ${maskToken(apiToken)}" \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg border">
        <h4 className="font-semibold mb-3 flex items-center text-lg">
          <Lock className="mr-2 text-red-500 flex-shrink-0" size={20} />
          Security Best Practices
        </h4>
        <ul className="space-y-2 text-gray-700 text-sm">
          {[
            'Keep your API token secure and never expose it in client-side code',
            'Use HTTPS for all API requests',
            'Implement proper token storage and rotation',
            'Monitor API usage and implement rate limiting'
          ].map((practice, index) => (
            <li key={index} className="flex items-start">
              <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
              <span className="break-words">{practice}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderAPI = () => (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg border">
        <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center">
          <Terminal className="mr-2 text-green-600 flex-shrink-0" size={24} />
          <span className="truncate">API Endpoints</span>
        </h3>
        <p className="text-gray-600 mb-6 text-sm sm:text-base">
          Comprehensive list of all available endpoints with detailed parameters and response examples.
        </p>

        <div className="space-y-4">
          {apiEndpoints.map((endpoint) => (
            <div key={endpoint.id} className="border rounded-lg overflow-hidden">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleEndpoint(endpoint.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded text-white flex-shrink-0 ${
                      endpoint.method === 'GET' ? 'bg-green-500' :
                      endpoint.method === 'POST' ? 'bg-blue-500' :
                      endpoint.method === 'PUT' ? 'bg-yellow-500' :
                      endpoint.method === 'DELETE' ? 'bg-red-500' : 'bg-gray-500'
                    }`}>
                      {endpoint.method}
                    </span>
                    <div className="min-w-0 flex-1">
                      <code className="font-mono text-xs sm:text-sm bg-gray-100 px-2 py-1 rounded block break-all">
                        {endpoint.path}
                      </code>
                      <span className="font-medium text-sm sm:text-base mt-1 hidden md:block">{endpoint.title}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {expandedEndpoints[endpoint.id] ? 
                      <ChevronDown size={20} /> : 
                      <ChevronRight size={20} />
                    }
                  </div>
                </div>
                <p className="text-gray-600 text-sm mt-2 break-words">{endpoint.description}</p>
              </div>

              {expandedEndpoints[endpoint.id] && (
                <div className="border-t p-4 space-y-6">
                  {/* Request Body */}
                  {endpoint.requestBody && (
                    <div>
                      <h5 className="font-semibold mb-3">Request Body</h5>
                      <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm whitespace-pre-wrap break-words">
                          {typeof endpoint.requestBody === 'string' 
                            ? endpoint.requestBody 
                            : JSON.stringify(endpoint.requestBody, null, 2)
                          }
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* cURL Example */}
                  <div>
                    <h5 className="font-semibold mb-3">cURL Example</h5>
                    <div className="bg-gray-900 p-4 rounded-lg relative overflow-x-auto">
                      {(() => {
                        const curlCommand = endpoint.method === 'GET' 
                          ? `curl -X ${endpoint.method} "${API_BASE}${endpoint.path.replace('{eventId}', 'EVENT_ID_HERE')}" \\\n  -H "Authorization: Bearer ${apiToken}" \\\n  -H "Content-Type: application/json"`
                          : `curl -X ${endpoint.method} "${API_BASE}${endpoint.path}" \\\n  -H "Authorization: Bearer ${apiToken}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(endpoint.requestBody || {}, null, 2)}'`;
                        
                        return (
                          <>
                            <button
                              onClick={() => copyToClipboard(curlCommand, 'cURL Command')}
                              className="absolute top-2 right-2 text-gray-400 hover:text-white z-10"
                            >
                              <Copy size={16} />
                            </button>
                            <pre className="text-green-400 text-xs font-mono whitespace-pre overflow-x-auto pr-8">
                              {curlCommand}
                            </pre>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Response */}
                  {endpoint.response && (
                    <div>
                      <h5 className="font-semibold mb-3">Response Examples</h5>
                      {Object.entries(endpoint.response).map(([statusCode, response]) => (
                        <div key={statusCode} className="mb-4">
                          <div className="flex items-center mb-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded text-white mr-2 flex-shrink-0 ${
                              statusCode.startsWith('2') ? 'bg-green-500' :
                              statusCode.startsWith('4') ? 'bg-yellow-500' :
                              statusCode.startsWith('5') ? 'bg-red-500' : 'bg-gray-500'
                            }`}>
                              {statusCode}
                            </span>
                            <span className="text-sm font-medium break-words">{response.description}</span>
                          </div>
                          <div className="bg-gray-900 p-4 rounded-lg relative overflow-x-auto">
                            <button
                              onClick={() => copyToClipboard(JSON.stringify(response.example, null, 2), 'Response Example')}
                              className="absolute top-2 right-2 text-gray-400 hover:text-white z-10"
                            >
                              <Copy size={16} />
                            </button>
                            <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap break-words pr-8">
                              {JSON.stringify(response.example, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Parameters */}
                  {endpoint.parameters && endpoint.parameters.length > 0 && (
                    <div>
                      <h5 className="font-semibold mb-3">Parameters</h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-900">Name</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-900">Type</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-900">Required</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-900">Default</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-900">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {endpoint.parameters.map((param, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-2 sm:px-4 py-2 font-mono text-blue-600 break-all">{param.name}</td>
                                <td className="px-2 sm:px-4 py-2 text-gray-600">{param.type}</td>
                                <td className="px-2 sm:px-4 py-2">
                                  <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                                    param.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {param.required ? 'Required' : 'Optional'}
                                  </span>
                                </td>
                                <td className="px-2 sm:px-4 py-2 font-mono text-gray-500 break-all">
                                  {param.default || '-'}
                                </td>
                                <td className="px-2 sm:px-4 py-2 text-gray-600 break-words">{param.description}</td>
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
          ))}
        </div>
      </div>
    </div>
  );

  const renderErrors = () => (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg border">
        <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center">
          <AlertCircle className="mr-2 text-red-600 flex-shrink-0" size={24} />
          <span className="truncate">Error Handling</span>
        </h3>
        <p className="text-gray-600 mb-6 text-sm sm:text-base">
          Understanding error responses and implementing proper error handling in your applications.
        </p>

        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">Standard Error Response Format</h4>
            <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
              <pre className="text-red-400 text-xs font-mono whitespace-pre">
{`{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "eventId",
      "issue": "Event ID is required"
    },
    "timestamp": "2025-10-06T19:40:00Z",
    "requestId": "req_abc123"
  }
}`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Common Error Codes</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-900">HTTP Status</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-900">Error Code</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-900">Description</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-900">Common Causes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { status: '400', code: 'VALIDATION_ERROR', desc: 'Invalid request parameters', causes: 'Missing required fields, invalid data format' },
                    { status: '401', code: 'UNAUTHORIZED', desc: 'Authentication failed', causes: 'Invalid or expired API token' },
                    { status: '403', code: 'FORBIDDEN', desc: 'Access denied', causes: 'Insufficient permissions for resource' },
                    { status: '404', code: 'NOT_FOUND', desc: 'Resource not found', causes: 'Invalid event ID or endpoint' },
                    { status: '409', code: 'SEAT_UNAVAILABLE', desc: 'Requested seats not available', causes: 'Seats already booked or locked' },
                    { status: '429', code: 'RATE_LIMITED', desc: 'Rate limit exceeded', causes: 'Too many requests in time window' },
                    { status: '500', code: 'INTERNAL_ERROR', desc: 'Server error', causes: 'Unexpected server issue' }
                  ].map((error, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-2 font-mono text-red-600">{error.status}</td>
                      <td className="px-2 sm:px-4 py-2 font-mono break-all">{error.code}</td>
                      <td className="px-2 sm:px-4 py-2 break-words">{error.desc}</td>
                      <td className="px-2 sm:px-4 py-2 break-words">{error.causes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRateLimits = () => (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg border">
        <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center">
          <Clock className="mr-2 text-orange-600 flex-shrink-0" size={24} />
          <span className="truncate">Rate Limits & Usage</span>
        </h3>
        <p className="text-gray-600 mb-6 text-sm sm:text-base">
          Understanding API usage limits and implementing proper throttling to ensure optimal performance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
            <h4 className="font-semibold text-orange-900 mb-3">Current Rate Limits</h4>
            <ul className="space-y-2 text-orange-800 text-sm">
              {[
                { label: 'Requests per minute:', value: '100' },
                { label: 'Requests per hour:', value: '5,000' },
                { label: 'Requests per day:', value: '100,000' }
              ].map((limit, index) => (
                <li key={index} className="flex justify-between">
                  <span>{limit.label}</span>
                  <span className="font-semibold">{limit.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
            <h4 className="font-semibold text-blue-900 mb-3">Response Headers</h4>
            <div className="text-xs font-mono text-blue-800 space-y-1 overflow-x-auto">
              <div className="whitespace-nowrap">X-RateLimit-Limit: 100</div>
              <div className="whitespace-nowrap">X-RateLimit-Remaining: 95</div>
              <div className="whitespace-nowrap">X-RateLimit-Reset: 1696608000</div>
              <div className="whitespace-nowrap">Retry-After: 60</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h5 className="font-semibold text-green-900 mb-2">Best Practices</h5>
            <ul className="text-green-800 text-sm space-y-1">
              {[
                'Monitor rate limit headers',
                'Implement exponential backoff',
                'Cache responses when appropriate',
                'Use webhooks instead of polling'
              ].map((practice, index) => (
                <li key={index} className="break-words">• {practice}</li>
              ))}
            </ul>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h5 className="font-semibold text-red-900 mb-2">Avoid</h5>
            <ul className="text-red-800 text-sm space-y-1">
              {[
                'Making unnecessary API calls',
                'Ignoring 429 responses',
                'Aggressive retry logic',
                'Excessive polling'
              ].map((avoid, index) => (
                <li key={index} className="break-words">• {avoid}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'readme': return renderReadme();
      case 'authentication': return renderAuthentication();
      case 'api': return renderAPI();
      case 'errors': return renderErrors();
      case 'rate-limits': return renderRateLimits();
      default: return renderReadme();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Sabhayata Foundation API</h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">Complete API documentation for partner integration</p>
            </div>
            <div className="md:hidden ml-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden">
          <div className="bg-white w-64 h-full p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">Navigation</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-gray-600 hover:text-gray-900"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center py-3 px-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#982A3D] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="mr-3 flex-shrink-0" size={16} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Tab Navigation */}
      <div className="bg-white border-b hidden md:block">
        <div className="px-4 sm:px-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-[#982A3D] text-[#982A3D]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2 flex-shrink-0" size={16} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default ApiGuide;
