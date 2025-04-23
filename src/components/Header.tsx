'use client';

import { useState, useEffect } from 'react';
import { Cog6ToothIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettingsStore } from '@/store/settingsStore';

interface HeaderProps {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Fecha o menu mobile quando a rota muda
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Studar
              </h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`${
                  pathname === '/'
                    ? 'border-primary-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Início
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <button
              type="button"
              onClick={onSettingsClick}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              title="Configurações"
            >
              <Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:focus:ring-offset-gray-900"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className={`${
                pathname === '/'
                  ? 'bg-primary-50 dark:bg-gray-800 border-primary-500 text-primary-700 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Início
            </Link>
            <button
              type="button"
              onClick={onSettingsClick}
              className="flex items-center w-full pl-3 pr-4 py-2 border-l-4 border-transparent text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-base font-medium"
            >
              <Cog6ToothIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Configurações
            </button>
          </div>
        </div>
      )}
    </header>
  );
} 