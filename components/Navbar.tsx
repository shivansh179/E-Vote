import Link from 'next/link';
import React, { useState } from 'react';
import Image from 'next/image';
import { useTheme } from './ThemeContext';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toggle mobile menu visibility
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="flex items-center justify-between p-4 bg-white shadow-md dark:bg-gray-800 transition-all duration-300">
      {/* Logo */}
      <div className="flex-shrink-0">
        <Link href="/" aria-label="Home">
          <div className="w-10 h-10">
            <Image
              className="rounded-full"
              src="/vote.png"
              alt="Logo"
              width={40}
              height={40}
              layout="fixed"
              priority
            />
          </div>
        </Link>
      </div>

      {/* Desktop Navigation Links */}
      <div className="hidden md:flex items-center space-x-8">
        <Link href="/face_verification">
          <p className="text-gray-800 font-semibold hover:text-blue-600 dark:text-white dark:hover:text-blue-400 transition-colors duration-300">
            User
          </p>
        </Link>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`relative inline-flex items-center h-6 w-12 rounded-full transition-all duration-300 ${
            theme === 'light' ? 'bg-gray-200' : 'bg-indigo-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
              theme === 'light' ? 'translate-x-1' : 'translate-x-6'
            }`}
          ></span>
        </button>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <button
          aria-label="Open Menu"
          onClick={toggleMobileMenu}
          className="text-gray-700 dark:text-white hover:text-blue-600 focus:outline-none transition-all duration-300"
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-end">
          <div className="w-64 bg-white dark:bg-gray-800 shadow-lg p-6 z-50">
            {/* Close Button */}
            <button
              aria-label="Close Menu"
              onClick={closeMobileMenu}
              className="text-gray-700 dark:text-white hover:text-blue-600 focus:outline-none transition-all duration-300"
            >
              ✕
            </button>

            <div className="mt-8 space-y-6">
              <Link href="/face_verification" onClick={closeMobileMenu}>
                <p className="text-gray-800 font-semibold hover:text-blue-600 dark:text-white dark:hover:text-blue-400 transition-colors duration-300">
                  User
                </p>
              </Link>
            </div>

            {/* Theme Toggle */}
            <div className="mt-8">
              <button
                onClick={toggleTheme}
                className={`relative inline-flex items-center h-6 w-12 rounded-full transition-all duration-300 ${
                  theme === 'light' ? 'bg-gray-200' : 'bg-indigo-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    theme === 'light' ? 'translate-x-1' : 'translate-x-6'
                  }`}
                ></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
