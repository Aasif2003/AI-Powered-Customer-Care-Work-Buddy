'use client';

import { usePathname } from 'next/navigation';
import { useModalContext } from '@/app/context/modalcontext';
import { useIDContext } from '@/app/context/booleancontext';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  UserCircleIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  ArrowRightOnRectangleIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';

export default function Header() {
  const pathname = usePathname();
  const { openModal, modalType } = useModalContext();
  const { getOrgname } = useIDContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const organame = getOrgname();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let pageContent;

  // Home Page Header
  if (pathname === '/') {
    pageContent = (
      <div className="flex space-x-3">
        <button
          onClick={() => openModal('login')}
          className="px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors font-medium"
        >
          Log in
        </button>
        <button
          onClick={() => openModal('signup')}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
        >
          Sign up
        </button>
      </div>
    );
  }

  // Organizer Dashboard Header
  else if (pathname === '/dashboardo/monitor' || pathname === '/dashboardo/call-records' || pathname === '/dashboardo/requests') {
    pageContent = (
      <div className="flex justify-between items-center w-full">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <NavLink href="/dashboardo/monitor" pathname={pathname}>
            Monitor
          </NavLink>
          <NavLink href="/dashboardo/call-records" pathname={pathname}>
            Call Records
          </NavLink>
          <NavLink href="/dashboardo/requests" pathname={pathname}>
            Requests
          </NavLink>
        </div>

        {getOrgname() !== null ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <div className="bg-white text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                {organame ? organame.charAt(0) : '?'}
              </div>
              <span className="font-medium">{organame || 'Organization'}</span>
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-20">
                <div className="py-2">
                  <DropdownItem
                    href="/createorg"
                    icon={<PlusCircleIcon className="w-5 h-5" />}
                  >
                    Add organization
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => openModal('organizer')}
                    icon={<BuildingOfficeIcon className="w-5 h-5" />}
                  >
                    Change organization
                  </DropdownItem>
                  <DropdownItem
                    href="/settings"
                    icon={<Cog6ToothIcon className="w-5 h-5" />}
                  >
                    Settings
                  </DropdownItem>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/createorg">
            <button className="flex items-center space-x-2 bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 transition-colors">
              <PlusCircleIcon className="w-5 h-5" />
              <span>Create Organization</span>
            </button>
          </Link>
        )}
      </div>
    );
  }

  // Member Dashboard Header
  else if (pathname === '/dashboardm/chatbot' || pathname === '/dashboardm/train' || pathname === '/dashboardm/analyze') {
    pageContent = (
      <div className="flex justify-between items-center w-full">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <NavLink href="/dashboardm/chatbot" pathname={pathname}>
            ChatBot
          </NavLink>
          <NavLink href="/dashboardm/train" pathname={pathname}>
            Train
          </NavLink>
          <NavLink href="/dashboardm/analyze" pathname={pathname}>
            Analyze & Prompts
          </NavLink>
        </div>

        {getOrgname() !== '' ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <div className="bg-white text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                {organame ? organame.charAt(0) : '?'}
              </div>
              <span className="font-medium">{organame || 'Organization'}</span>
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-20">
                <div className="py-2">
                  <DropdownItem
                    href="/joinorg"
                    icon={<PlusCircleIcon className="w-5 h-5" />}
                  >
                    Add organization
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => openModal('member')}
                    icon={<BuildingOfficeIcon className="w-5 h-5" />}
                  >
                    Change organization
                  </DropdownItem>
                  <DropdownItem
                    href="/settings"
                    icon={<Cog6ToothIcon className="w-5 h-5" />}
                  >
                    Settings
                  </DropdownItem>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/joinorg">
            <button className="flex items-center space-x-2 bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 transition-colors">
              <PlusCircleIcon className="w-5 h-5" />
              <span>Join Organization</span>
            </button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <header className="bg-gradient-to-r from-blue-700 to-blue-800 w-full h-16 px-6 flex items-center justify-between shadow-md">
      <Link href="/" className="text-white font-bold text-xl tracking-tight flex items-center">
        <BuildingOfficeIcon className="w-6 h-6 mr-2" />
        Customer Care Work Buddy
      </Link>

      <div className="flex items-center">
        {pageContent}
      </div>
    </header>
  );
}

// Helper Components
const NavLink = ({ href, pathname, children }: { href: string, pathname: string, children: React.ReactNode }) => (
  <Link href={href}>
    <div className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      pathname === href
        ? 'bg-white shadow-sm text-blue-700'
        : 'text-gray-600 hover:bg-gray-200'
    }`}>
      {children}
    </div>
  </Link>
);

const DropdownItem = ({ href, onClick, icon, children }: {
  href?: string,
  onClick?: () => void,
  icon: React.ReactNode,
  children: React.ReactNode
}) => (
  href ? (
    <Link href={href} className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 transition-colors">
      <span className="text-blue-500 mr-3">{icon}</span>
      <span>{children}</span>
    </Link>
  ) : (
    <button
      onClick={onClick}
      className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 transition-colors text-left"
    >
      <span className="text-blue-500 mr-3">{icon}</span>
      <span>{children}</span>
    </button>
  )
);
