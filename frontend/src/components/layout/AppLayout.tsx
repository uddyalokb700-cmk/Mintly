import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { AddTransactionModal } from '../../features/transactions/AddTransactionModal';
import { NotificationDrawer } from '../../features/notifications/NotificationDrawer';

export const AppLayout: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'expense' | 'income'>('expense');

  const handleOpenAddExpense = () => {
    setModalDefaultType('expense');
    setIsAddModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-[#080B0A] text-slate-100">
      {/* Desktop Sidebar */}
      <Sidebar onOpenAddExpense={handleOpenAddExpense} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onOpenAddExpense={handleOpenAddExpense} />

        <main className="flex-1 p-4 sm:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet context={{ openAddModal: handleOpenAddExpense }} />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenAddExpense={handleOpenAddExpense} />

      {/* Global Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultType={modalDefaultType}
        onTransactionAdded={() => {
          // Trigger a custom event so child query/views can invalidate if desired
          window.dispatchEvent(new CustomEvent('mintly_transaction_updated'));
        }}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer />
    </div>
  );
};
