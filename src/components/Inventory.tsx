import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Trash2, Plus, Package } from 'lucide-react';

export default function Inventory({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'g' });
  const [loading, setLoading] = useState(false);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Fetch inventory error:", err);
      setItems([]);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...newItem, quantity: parseFloat(newItem.quantity) })
      });
      setNewItem({ name: '', quantity: '', unit: 'г' });
      fetchInventory();
      toast.success("Продукт добавлен в кладовую");
    } catch (err) {
      toast.error("Не удалось добавить продукт");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/inventory/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchInventory();
    toast.info("Продукт удален");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const res = await fetch('/api/import/xlsx', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      toast.success(`Импортировано продуктов: ${data.count}`);
      fetchInventory();
    } catch (err: any) {
      toast.error(err.message || "Ошибка при импорте");
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Добавить продукт</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Название продукта</Label>
              <Input 
                placeholder="Куриная грудка" 
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Количество</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  placeholder="500" 
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Ед. изм.</Label>
                <Input 
                  placeholder="г, мл, шт" 
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  required 
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
              <Plus size={18} className="mr-2" /> Добавить в кладовую
            </Button>
          </form>

          <div className="pt-4 border-t border-neutral-100">
            <Label className="block mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Массовый импорт</Label>
            <div className="relative">
              <Input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleImport}
                className="hidden" 
                id="excel-import"
                disabled={loading}
              />
              <Button 
                variant="outline" 
                className="w-full border-dashed border-2"
                onClick={() => document.getElementById('excel-import')?.click()}
                disabled={loading}
              >
                {loading ? 'Загрузка...' : 'Загрузить из Excel'}
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-neutral-400 text-center">
              Файл должен содержать лист "Инвентарь" с колонками: name, quantity, unit
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Текущие запасы</CardTitle>
          <Package className="text-neutral-400" size={20} />
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-lg shadow-sm">
                  <div>
                    <p className="font-medium text-neutral-900">{item.name}</p>
                    <p className="text-sm text-neutral-500">{item.quantity} {item.unit}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-neutral-400 hover:text-red-500"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
              {items.length === 0 && (
                <div className="col-span-full text-center py-12 text-neutral-400">
                  Ваша кладовая пуста. Начните добавлять продукты!
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
