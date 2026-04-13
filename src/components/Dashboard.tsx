import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Activity, Flame, UtensilsCrossed, Plus, ListPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Dashboard({ token }: { token: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>({});
  const [exerciseDesc, setExerciseDesc] = useState('');
  const [foodInput, setFoodInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzingFood, setAnalyzingFood] = useState(false);
  const [manualFood, setManualFood] = useState({
    description: '',
    kcal: '',
    protein: '',
    fat: '',
    carbs: '',
    members: [] as string[]
  });
  const [isManualOpen, setIsManualOpen] = useState(false);

  const fetchFamily = async () => {
    const res = await fetch('/api/family', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setMembers(data);
    if (data.length > 0 && !selectedMemberId) {
      setSelectedMemberId(data[0].id.toString());
    }
  };

  const fetchData = async (memberId: string) => {
    try {
      const [logsRes, planRes] = await Promise.all([
        fetch(`/api/logs?memberId=${memberId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/plan/${memberId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (logsRes.status === 401 || planRes.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
        return;
      }

      const logsData = await logsRes.json();
      const planData = await planRes.json();

      setLogs(Array.isArray(logsData) ? logsData : []);
      setPlan(planData || {});
    } catch (err) {
      console.error(err);
      setLogs([]);
      setPlan({});
    }
  };

  useEffect(() => {
    fetchFamily();
  }, [token]);

  useEffect(() => {
    if (selectedMemberId) {
      fetchData(selectedMemberId);
    }
  }, [selectedMemberId, token]);

  const handleExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/logs/exercise', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ member_id: selectedMemberId, description: exerciseDesc })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Записано: ${data.description} (${data.kcal} ккал)`);
      setExerciseDesc('');
      fetchData(selectedMemberId);
    } catch (err) {
      toast.error("Не удалось записать упражнение");
    } finally {
      setLoading(false);
    }
  };

  const handleManualFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualFood.members.length === 0) {
      toast.error("Выберите хотя бы одного члена семьи");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/logs/food', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          member_ids: manualFood.members,
          description: manualFood.description,
          kcal: parseInt(manualFood.kcal) || 0,
          protein_g: parseInt(manualFood.protein) || 0,
          fat_g: parseInt(manualFood.fat) || 0,
          carbs_g: parseInt(manualFood.carbs) || 0
        })
      });
      if (!res.ok) throw new Error();
      toast.success("Запись добавлена");
      setManualFood({ description: '', kcal: '', protein: '', fat: '', carbs: '', members: [] });
      setIsManualOpen(false);
      if (selectedMemberId) fetchData(selectedMemberId);
    } catch (err) {
      toast.error("Ошибка при сохранении");
    } finally {
      setLoading(false);
    }
  };

  const handleFoodAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzingFood(true);
    try {
      const res = await fetch('/api/logs/food/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ input: foodInput })
      });
      const data = await res.json();
      
      // Fallback: if member_ids contains names instead of IDs, map them
      if (data.member_ids && data.member_ids.length > 0) {
        data.member_ids = data.member_ids.map((idOrName: string) => {
          const member = members.find(m => m.id.toString() === idOrName || m.name.toLowerCase() === idOrName.toLowerCase());
          return member ? member.id.toString() : idOrName;
        });
      }
      
      if (data.needs_clarification) {
        toast.info(data.needs_clarification);
        setFoodInput(foodInput + " "); // Keep input for user to clarify
      } else {
        // Auto-log if clear
        const logRes = await fetch('/api/logs/food', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        
        if (logRes.ok) {
          toast.success(`Записано: ${data.description}`);
          setFoodInput('');
          if (selectedMemberId) fetchData(selectedMemberId);
        } else {
          const errData = await logRes.json();
          toast.error(errData.error || "Ошибка при сохранении лога");
        }
      }
    } catch (err) {
      toast.error("Ошибка анализа еды");
    } finally {
      setAnalyzingFood(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/export/xlsx?token=${token}`, '_blank');
  };

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.timestamp.startsWith(today));
  
  const consumedKcal = todayLogs.reduce((acc, l) => acc + (l.type === 'food' ? l.kcal : 0), 0);
  const burnedKcal = Math.abs(todayLogs.reduce((acc, l) => acc + (l.type === 'exercise' ? l.kcal : 0), 0));
  const netKcal = consumedKcal - burnedKcal;

  const protein = todayLogs.reduce((acc, l) => acc + (l.protein_g || 0), 0);
  const fat = todayLogs.reduce((acc, l) => acc + (l.fat_g || 0), 0);
  const carbs = todayLogs.reduce((acc, l) => acc + (l.carbs_g || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Обзор активности</h2>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => selectedMemberId && fetchData(selectedMemberId)}>
            Обновить
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            Экспорт в Excel
          </Button>
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">Показать для:</Label>
            <select 
              className="p-2 rounded-md border border-neutral-200 text-sm bg-white"
              value={selectedMemberId || ''}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-orange-50 border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
              <Flame size={16} />
              Калории
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{netKcal} / {plan.daily_kcal || 0}</div>
            <p className="text-xs text-orange-600 mt-1">
              {consumedKcal} съедено, {burnedKcal} сожжено
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <UtensilsCrossed size={16} />
              БЖУ (Б/Ж/У)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{protein}г / {fat}г / {carbs}г</div>
            <p className="text-xs text-blue-600 mt-1">
              Цель: {plan.protein_g || 0}г / {plan.fat_g || 0}г / {plan.carbs_g || 0}г
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <Activity size={16} />
              Быстрая запись
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <form onSubmit={handleExercise} className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  placeholder="Активность (бег 5км...)" 
                  value={exerciseDesc}
                  onChange={(e) => setExerciseDesc(e.target.value)}
                  className="bg-white border-green-200 text-xs pr-8 w-full"
                />
                {exerciseDesc && (
                  <button 
                    type="button"
                    onClick={() => setExerciseDesc('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-lg"
                  >
                    ×
                  </button>
                )}
              </div>
              <Button size="icon" className="bg-green-600 hover:bg-green-700 shrink-0" disabled={loading}>
                {loading ? <Activity size={18} className="animate-spin" /> : <Plus size={18} />}
              </Button>
            </form>
            <form onSubmit={handleFoodAnalyze} className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  placeholder="Еда (съел 2 яйца...)" 
                  value={foodInput}
                  onChange={(e) => setFoodInput(e.target.value)}
                  className="bg-white border-orange-200 text-xs pr-8 w-full"
                />
                {foodInput && (
                  <button 
                    type="button"
                    onClick={() => setFoodInput('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-lg"
                  >
                    ×
                  </button>
                )}
              </div>
              <Button size="icon" className="bg-orange-600 hover:bg-orange-700 shrink-0" disabled={analyzingFood}>
                {analyzingFood ? <Activity size={18} className="animate-spin" /> : <Plus size={18} />}
              </Button>
              
              <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
                <DialogTrigger render={
                  <Button size="icon" variant="outline" className="border-orange-200 text-orange-600 shrink-0">
                    <ListPlus size={18} />
                  </Button>
                } />
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Ручной ввод еды</DialogTitle>
                    <DialogDescription>
                      Введите данные о приеме пищи вручную без использования ИИ.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleManualFood} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Описание</Label>
                      <Input 
                        placeholder="Обед: Курица с рисом" 
                        value={manualFood.description}
                        onChange={(e) => setManualFood({...manualFood, description: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Калории (на чел)</Label>
                        <Input 
                          type="number" 
                          placeholder="500" 
                          value={manualFood.kcal}
                          onChange={(e) => setManualFood({...manualFood, kcal: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Белки (г)</Label>
                        <Input 
                          type="number" 
                          placeholder="30" 
                          value={manualFood.protein}
                          onChange={(e) => setManualFood({...manualFood, protein: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Жиры (г)</Label>
                        <Input 
                          type="number" 
                          placeholder="15" 
                          value={manualFood.fat}
                          onChange={(e) => setManualFood({...manualFood, fat: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Углеводы (г)</Label>
                        <Input 
                          type="number" 
                          placeholder="50" 
                          value={manualFood.carbs}
                          onChange={(e) => setManualFood({...manualFood, carbs: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Кто ел?</Label>
                      <div className="flex flex-wrap gap-2">
                        {members.map(m => (
                          <Badge 
                            key={m.id} 
                            variant={manualFood.members.includes(m.id.toString()) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const id = m.id.toString();
                              if (manualFood.members.includes(id)) {
                                setManualFood({...manualFood, members: manualFood.members.filter(mid => mid !== id)});
                              } else {
                                setManualFood({...manualFood, members: [...manualFood.members, id]});
                              }
                            }}
                          >
                            {m.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
                        {loading ? 'Сохранение...' : 'Записать'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последняя активность</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.type === 'food' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {log.type === 'food' ? <UtensilsCrossed size={18} /> : <Activity size={18} />}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">{log.description}</p>
                      <p className="text-xs text-neutral-500">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={log.type === 'food' ? 'default' : 'secondary'} className={log.type === 'food' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' : 'bg-green-100 text-green-700 hover:bg-green-100'}>
                      {log.type === 'food' ? `+${log.kcal}` : `${log.kcal}`} ккал
                    </Badge>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-8 text-neutral-400">Активность пока не записана.</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
