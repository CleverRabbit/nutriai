import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';

interface FamilyMember {
  id: number;
  name: string;
  age?: number;
  weight?: number;
  activity_level?: string;
  preferences?: string;
}

export default function Family({ token }: { token: string }) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    age: '',
    weight: '',
    activity_level: 'medium',
    preferences: ''
  });

  const fetchFamily = async () => {
    try {
      const res = await fetch('/api/family', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
        return;
      }
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch family error:", err);
      setMembers([]);
    }
  };

  useEffect(() => {
    fetchFamily();
  }, [token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/family', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newMember,
          age: newMember.age ? parseInt(newMember.age) : null,
          weight: newMember.weight ? parseFloat(newMember.weight) : null
        })
      });
      setNewMember({ name: '', age: '', weight: '', activity_level: 'medium', preferences: '' });
      fetchFamily();
      toast.success("Член семьи добавлен");
    } catch (err) {
      toast.error("Не удалось добавить члена семьи");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/family/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchFamily();
    toast.info("Член семьи удален");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus size={20} className="text-orange-500" />
            Добавить члена семьи
          </CardTitle>
          <CardDescription>Добавьте информацию о члене семьи для персональных рекомендаций</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Имя</Label>
              <Input 
                placeholder="Иван" 
                value={newMember.name}
                onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Возраст</Label>
                <Input 
                  type="number" 
                  placeholder="30" 
                  value={newMember.age}
                  onChange={(e) => setNewMember({...newMember, age: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Вес (кг)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  placeholder="75" 
                  value={newMember.weight}
                  onChange={(e) => setNewMember({...newMember, weight: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Уровень активности</Label>
              <select 
                className="w-full p-2 rounded-md border border-neutral-200 text-sm"
                value={newMember.activity_level}
                onChange={(e) => setNewMember({...newMember, activity_level: e.target.value})}
              >
                <option value="low">Низкий (сидячий)</option>
                <option value="medium">Средний (умеренный)</option>
                <option value="high">Высокий (активный)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Предпочтения / Аллергии</Label>
              <Input 
                placeholder="без лактозы, вегетарианец..." 
                value={newMember.preferences}
                onChange={(e) => setNewMember({...newMember, preferences: e.target.value})}
              />
            </div>
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
              Добавить в семью
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users size={20} className="text-neutral-400" />
            Состав семьи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-start justify-between p-4 bg-white border border-neutral-200 rounded-xl shadow-sm">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">{member.name}</p>
                    <p className="text-xs text-neutral-500">
                      {member.age ? `${member.age} лет` : ''} 
                      {member.weight ? `, ${member.weight} кг` : ''}
                    </p>
                    {member.preferences && (
                      <p className="text-xs text-orange-600 mt-1 italic">{member.preferences}</p>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-neutral-400 hover:text-red-500"
                  onClick={() => handleDelete(member.id)}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
            {members.length === 0 && (
              <div className="col-span-full text-center py-12 text-neutral-400">
                Семья пока не добавлена.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
