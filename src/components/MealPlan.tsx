import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Save, ChevronRight, ShoppingCart } from 'lucide-react';

export default function MealPlan({ token }: { token: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [plan, setPlan] = useState({
    daily_kcal: 2000,
    protein_g: 150,
    fat_g: 70,
    carbs_g: 200,
    summary: ''
  });
  const [suggestion, setSuggestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const fetchPlan = async (memberId: string) => {
    const res = await fetch(`/api/plan/${memberId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.daily_kcal) {
      setPlan(data);
    } else {
      setPlan({ daily_kcal: 2000, protein_g: 150, fat_g: 70, carbs_g: 200, summary: '' });
    }
  };

  useEffect(() => {
    fetchFamily();
  }, [token]);

  useEffect(() => {
    if (selectedMemberId) {
      fetchPlan(selectedMemberId);
    }
  }, [selectedMemberId, token]);

  const handleSavePlan = async () => {
    if (!selectedMemberId) return;
    setSaving(true);
    try {
      await fetch(`/api/plan/${selectedMemberId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(plan)
      });
      toast.success("План питания обновлен");
    } catch (err) {
      toast.error("Не удалось сохранить план");
    } finally {
      setSaving(false);
    }
  };

  const generateMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/meal-plan', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSuggestion(data);
      toast.success("ИИ-меню сформировано!");
    } catch (err) {
      toast.error("Не удалось сгенерировать меню");
    } finally {
      setLoading(false);
    }
  };

  const logMeal = async (meal: any) => {
    const memberIds = members
      .filter(m => meal.assigned_to.includes(m.name))
      .map(m => m.id);

    try {
      await fetch('/api/logs/food', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          member_ids: memberIds,
          description: meal.meal + ': ' + meal.recipe,
          kcal: meal.kcal_per_person,
          consumed_items: meal.ingredients
        })
      });
      toast.success(`Записано для: ${meal.assigned_to.join(', ')}`);
    } catch (err) {
      toast.error("Не удалось записать прием пищи");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Цели питания</CardTitle>
          <CardDescription>Установите цели для каждого члена семьи</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Выберите члена семьи</Label>
            <select 
              className="w-full p-2 rounded-md border border-neutral-200 text-sm"
              value={selectedMemberId || ''}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Дневная норма калорий (ккал)</Label>
            <Input 
              type="number" 
              value={plan.daily_kcal}
              onChange={(e) => setPlan({...plan, daily_kcal: parseInt(e.target.value)})}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label>Белки (г)</Label>
              <Input 
                type="number" 
                value={plan.protein_g}
                onChange={(e) => setPlan({...plan, protein_g: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Жиры (г)</Label>
              <Input 
                type="number" 
                value={plan.fat_g}
                onChange={(e) => setPlan({...plan, fat_g: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Углеводы (г)</Label>
              <Input 
                type="number" 
                value={plan.carbs_g}
                onChange={(e) => setPlan({...plan, carbs_g: parseInt(e.target.value)})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Резюме плана / Предпочтения</Label>
            <textarea 
              className="w-full min-h-[100px] p-3 rounded-md border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="например: Кето-диета, без морепродуктов, интервальное голодание..."
              value={plan.summary}
              onChange={(e) => setPlan({...plan, summary: e.target.value})}
            />
          </div>
          <Button onClick={handleSavePlan} className="w-full" disabled={saving}>
            <Save size={18} className="mr-2" /> {saving ? 'Сохранение...' : 'Сохранить план'}
          </Button>
          
          <Separator />
          
          <Button onClick={generateMenu} variant="outline" className="w-full border-orange-200 text-orange-600 hover:bg-orange-50" disabled={loading}>
            <Sparkles size={18} className="mr-2" /> {loading ? 'Генерация...' : 'Сгенерировать меню для семьи'}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Семейное ИИ меню</CardTitle>
          <CardDescription>Сбалансированные блюда с учетом общих запасов и индивидуальных целей</CardDescription>
        </CardHeader>
        <CardContent>
          {suggestion ? (
            <div className="space-y-6">
              <div className="space-y-4">
                {suggestion.menu.map((meal: any, idx: number) => (
                  <div key={idx} className="p-4 bg-white border border-neutral-200 rounded-xl shadow-sm hover:border-orange-200 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex gap-2 mb-1">
                          <Badge variant="outline" className="text-orange-600 border-orange-200">{meal.meal}</Badge>
                          {meal.is_shared && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Общее</Badge>}
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900">{meal.recipe}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {meal.assigned_to.map((name: string) => (
                            <span key={name} className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600 font-medium">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-neutral-900">{meal.kcal_per_person} ккал/чел</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="ml-2 text-orange-600 hover:bg-orange-50"
                          onClick={() => logMeal(meal)}
                        >
                          Записать <ChevronRight size={14} className="ml-1" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-neutral-500">
                      <span className="font-medium">Ингредиенты:</span> {meal.ingredients.map((i: any) => `${i.name} (${i.amount})`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>

              {suggestion.missing_ingredients.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                    <ShoppingCart size={18} />
                    Список покупок (Недостает)
                  </div>
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    {suggestion.missing_ingredients.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-neutral-400">
              <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
              <p>Нажмите "Сгенерировать меню", чтобы увидеть предложения для семьи</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
