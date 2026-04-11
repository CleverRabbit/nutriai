import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import MealPlan from './components/MealPlan';
import Family from './components/Family';
import Settings from './components/Settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Refrigerator, Utensils, Users, Settings as SettingsIcon, LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const handleLogin = (data: any) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    toast.success("Вход выполнен успешно");
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.info("Выход из системы");
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Auth onLogin={handleLogin} />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">N</div>
            <h1 className="text-xl font-semibold text-neutral-900">NutriAI</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-500">{user?.email}</span>
            <button 
              onClick={handleLogout}
              className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-xl mx-auto">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Статистика</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Refrigerator size={16} />
              <span className="hidden sm:inline">Продукты</span>
            </TabsTrigger>
            <TabsTrigger value="mealplan" className="flex items-center gap-2">
              <Utensils size={16} />
              <span className="hidden sm:inline">План</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="flex items-center gap-2">
              <Users size={16} />
              <span className="hidden sm:inline">Семья</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <SettingsIcon size={16} />
              <span className="hidden sm:inline">Настройки</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard token={token} />
          </TabsContent>
          <TabsContent value="inventory">
            <Inventory token={token} />
          </TabsContent>
          <TabsContent value="mealplan">
            <MealPlan token={token} />
          </TabsContent>
          <TabsContent value="family">
            <Family token={token} />
          </TabsContent>
          <TabsContent value="settings">
            <Settings token={token} />
          </TabsContent>
        </Tabs>
      </main>
      <Toaster />
    </div>
  );
}
