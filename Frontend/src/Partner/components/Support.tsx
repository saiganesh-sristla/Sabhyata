// Partner/components/Support.jsx
import React, { useState } from 'react';
import { 
  Search, 
  MessageCircle, 
  Mail, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight,
  Book,
  Code,
  Settings,
  Shield,
  Zap,
  CheckCircle,
  ExternalLink,
  Clock,
  AlertCircle
} from 'lucide-react';

const Support = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

const faqs = [
  {
    id: 1,
    question: 'How do I get started with the API?',
    answer: 'Register as a partner, obtain your API token from the dashboard, and check our API documentation for integration examples.',
    category: 'getting-started'
  },
  {
    id: 2,
    question: 'How do I authenticate API requests?',
    answer: 'Include your API token in the Authorization header as "Bearer YOUR_API_TOKEN" for all API requests.',
    category: 'authentication'
  },
  {
    id: 3,
    question: 'What are the API rate limits?',
    answer: 'Free tier: 100 requests/minute. Premium tier: 1,000 requests/minute. Rate limit headers are included in responses.',
    category: 'limits'
  },
  {
    id: 4,
    question: 'Why am I getting 401 Unauthorized errors?',
    answer: 'Check that your API token is valid and included in the Authorization header. Regenerate your token if needed.',
    category: 'troubleshooting'
  },
  {
    id: 5,
    question: 'How does seat locking work?',
    answer: 'Locked seats are reserved for 5 minutes. Use the lockId to complete booking within this timeframe.',
    category: 'booking'
  },
  {
    id: 7,
    question: 'What happens if a booking fails after seats are locked?',
    answer: 'If payment fails or booking encounters an error, locked seats are automatically released back to available inventory. You can retry the booking process or lock different seats.',
    category: 'booking'
  },  
  {
    id: 8,
    question: 'How can I check booking status and get updates?',
    answer: 'Use the GET /api/bookings/{bookingId} endpoint to check booking status. You can also poll this endpoint periodically or implement status checks in your application flow.',
    category: 'booking'
  },
  {
    id: 9,
    question: 'What customer information is required for creating bookings?',
    answer: 'Required fields include customer name, email, and phone number. Optional fields may include address details depending on event requirements. All data is encrypted and handled securely.',
    category: 'booking'
  }
];


  const contactOptions = [
    {
      type: 'Technical Support',
      contact: 'support@sabhayata.in',
      description: 'API issues, integration help',
      response: '24 hours',
      icon: Mail
    },
    {
      type: 'Developer Contact',
      contact: 'info@unsquare.in',
      description: 'Urgent issues, direct assistance',
      response: '4-8 hours',
      icon: MessageCircle
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    searchQuery === '' || 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFaq = (faqId) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className=" border-b">
        <div className=" px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Support & Help Center</h1>
          <p className="text-gray-600 mt-1">Get help with API integration and troubleshooting</p>
        </div>
      </div>

      <div className=" px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - FAQs */}
          <div className="lg:col-span-2 space-y-6">

            {/* Quick Links */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <a href="https://sabhyata.onrender.com/api/docs/" target='_blank' className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                  <Book className="text-[#982A3D] mr-3" size={20} />
                  <div>
                    <div className="font-medium text-[#982A3D]">API Docs</div>
                    <div className="text-xs text-[#982A3D]">Complete reference</div>
                  </div>
                </a>
                <a href="https://sabhyata.onrender.com/api/health" target='_blank' className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                  <CheckCircle className="text-green-600 mr-3" size={20} />
                  <div>
                    <div className="font-medium text-green-900">Status</div>
                    <div className="text-xs text-green-700">System health</div>
                  </div>
                </a>
              </div>
            </div>

            {/* FAQs */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
              <div className="space-y-3">
                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <HelpCircle className="mx-auto mb-2" size={32} />
                    No FAQs found matching your search.
                  </div>
                ) : (
                  filteredFaqs.map(faq => (
                    <div key={faq.id} className="border rounded-lg">
                      <button
                        onClick={() => toggleFaq(faq.id)}
                        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <HelpCircle className="text-[#982A3D] mr-3 flex-shrink-0" size={18} />
                          <span className="font-medium text-gray-900">{faq.question}</span>
                        </div>
                        {expandedFaq === faq.id ? 
                          <ChevronDown size={18} className="text-gray-400" /> : 
                          <ChevronRight size={18} className="text-gray-400" />
                        }
                      </button>
                      {expandedFaq === faq.id && (
                        <div className="px-4 pb-4 border-t bg-gray-50">
                          <p className="text-gray-700 pt-3">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Support */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MessageCircle className="text-[#982A3D] mr-2" size={20} />
                Contact Support
              </h3>
              <div className="space-y-4">
                {contactOptions.map((option, index) => {
                  const Icon = option.icon;
                  return (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start">
                        <Icon className="text-[#982A3D] mr-3 mt-1" size={18} />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{option.type}</h4>
                          <a 
                            href={`mailto:${option.contact}`} 
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {option.contact}
                          </a>
                          <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                          <div className="flex items-center text-xs text-gray-500 mt-2">
                            <Clock size={12} className="mr-1" />
                            Response: {option.response}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CheckCircle className="text-green-600 mr-2" size={20} />
                System Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Status</span>
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="text-sm font-medium text-gray-900">~150ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uptime (30d)</span>
                  <span className="text-sm font-medium text-gray-900">99.9%</span>
                </div>
                <a 
                  href="https://sabhyata.onrender.com/api/health" target='_blank' rel='noreferrer'
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2">
                  View status page
                  <ExternalLink size={14} className="ml-1" />
                </a>
              </div>
            </div>

            {/* Support Hours */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="text-orange-600 mr-2" size={20} />
                Support Hours
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mon - Sat</span>
                  <span className="font-medium">9 AM - 6 PM IST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sunday</span>
                  <span className="text-gray-500">Closed</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle size={16} className="text-yellow-600 mr-2 mt-0.5" />
                  <p className="text-yellow-800 text-sm">
                    For urgent issues, add "URGENT" to email subject.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
