import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, ShieldCheck, HelpCircle } from 'lucide-react';

export default function Settings({ token }: { token: string }) {
  const [settings, setSettings] = useState({
    tg_bot_token: '',
    telegram_chat_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setSettings({
          tg_bot_token: data.tg_bot_token || '',
          telegram_chat_id: data.telegram_chat_id || ''
        });
      });
    
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data));
  }, [token]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      toast.success("Настройки сохранены, Бот перезапущен");
    } catch (err) {
      toast.error("Не удалось сохранить настройки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send size={20} className="text-blue-500" />
            Интеграция с Telegram
          </CardTitle>
          <CardDescription>Подключите своего Telegram-бота для мобильного доступа</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Токен бота (от @BotFather)</Label>
            <Input 
              type="password"
              placeholder="123456:ABC-DEF..." 
              value={settings.tg_bot_token}
              onChange={(e) => setSettings({...settings, tg_bot_token: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Ваш Telegram Chat ID</Label>
            <Input 
              placeholder="123456789" 
              value={settings.telegram_chat_id}
              onChange={(e) => setSettings({...settings, telegram_chat_id: e.target.value})}
            />
            <p className="text-xs text-neutral-500 flex items-center gap-1">
              <HelpCircle size={12} />
              Напишите своему боту, чтобы узнать свой Chat ID, если вы его не знаете.
            </p>
          </div>
          <Button onClick={handleSave} className="w-full" disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить и подключить'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-green-500" />
            Диагностика системы
          </CardTitle>
          <CardDescription>Статус работоспособности системы в реальном времени</CardDescription>
        </CardHeader>
        <CardContent>
          {health ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500">Статус базы данных:</span>
                <span className={health.database === 'connected' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {health.database === 'connected' ? 'Подключено' : 'Ошибка'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500">Менеджер бота:</span>
                <span className="text-blue-600 font-medium">{health.bot === 'initialized' ? 'Инициализирован' : 'Не запущен'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500">Окружение:</span>
                <span className="text-neutral-900 font-medium">{process.env.NODE_ENV === 'production' ? 'Продакшн' : 'Разработка'}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-neutral-400">Загрузка диагностики...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
