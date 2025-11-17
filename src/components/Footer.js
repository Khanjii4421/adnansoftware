import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
          <div className="mb-2 md:mb-0">
            <p className="font-semibold text-gray-800">© 2025 Adnan Khaddar House</p>
            <p className="text-xs text-gray-500 mt-1">High Quality Management System</p>
          </div>
          <div className="text-center md:text-right">
            <p className="font-medium text-gray-700">
              Dev By <span className="text-emerald-600 font-bold">Khalil Khan</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

