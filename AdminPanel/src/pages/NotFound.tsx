import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="h-screen bg-[#E5E5E5] flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full -mt-20">
        <img 
          src="/404.jpg" 
          alt="404 Not Found" 
          className=" mx-auto mb-4" />
        <p className="text-lg md:text-xl text-gray-600 mb-8">Page Not Found</p>
      <div className="flex sm:flex-row justify-center items-center gap-4">
        <button
          onClick={handleGoBack}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-[#8B1538] text-white rounded-lg hover:bg-red-800 transition-colors text-sm md:text-base">
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>

        <button
          onClick={handleGoHome}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 border-2 border-[#8B1538] text-[#8B1538] rounded-lg hover:bg-[#8B1538] hover:text-white transition-colors text-sm md:text-base">
          <Home className="w-4 h-4" />
          Go Home
        </button>
      </div>
      </div>
    </div>
  );
};

export default NotFoundPage;