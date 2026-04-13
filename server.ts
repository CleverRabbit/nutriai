import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import db from "./src/lib/db.js";
import { botManager } from "./src/lib/bot.js";
import { analyzeExercise, chatWithAI, generateMealPlan, checkGeminiHealth, analyzeFoodInput } from "./src/lib/ai.js";
import { utils, write, read } from "xlsx";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ error: "Неавторизован" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: "Неверный токен" });
    }
  };

  // --- API Routes ---

  // Family Members
  app.get("/api/family", authenticate, (req: any, res) => {
    const members = db.prepare("SELECT * FROM family_members WHERE user_id = ? AND is_active = 1").all(req.user.id);
    res.json(members);
  });

  app.post("/api/family", authenticate, (req: any, res) => {
    const { name, age, weight, activity_level, preferences } = req.body;
    const result = db.prepare(`
      INSERT INTO family_members (user_id, name, age, weight, activity_level, preferences)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, name, age, weight, activity_level, preferences);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/family/:id", authenticate, (req: any, res) => {
    db.prepare("UPDATE family_members SET is_active = 0 WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Auth
  app.post("/api/register", async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const result = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)").run(email, hashedPassword);
      // Create default family member for the user themselves
      db.prepare("INSERT INTO family_members (user_id, name) VALUES (?, ?)").run(result.lastInsertRowid, "Я");
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Пользователь уже существует" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email } });
  });

  // Inventory
  app.get("/api/inventory", authenticate, (req: any, res) => {
    const items = db.prepare("SELECT * FROM inventory WHERE user_id = ?").all(req.user.id);
    res.json(items);
  });

  app.post("/api/inventory", authenticate, (req: any, res) => {
    const { name, quantity, unit } = req.body;
    db.prepare("INSERT INTO inventory (user_id, name, quantity, unit) VALUES (?, ?, ?, ?)").run(req.user.id, name, quantity, unit);
    res.json({ success: true });
  });

  app.delete("/api/inventory/:id", authenticate, (req: any, res) => {
    db.prepare("DELETE FROM inventory WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Nutrition Plan
  app.get("/api/plan/:memberId", authenticate, (req: any, res) => {
    const plan = db.prepare(`
      SELECT p.* FROM nutrition_plan p
      JOIN family_members m ON p.member_id = m.id
      WHERE m.id = ? AND m.user_id = ?
    `).get(req.params.memberId, req.user.id);
    res.json(plan || {});
  });

  app.post("/api/plan/:memberId", authenticate, (req: any, res) => {
    const { daily_kcal, protein_g, fat_g, carbs_g, summary } = req.body;
    db.prepare(`
      INSERT INTO nutrition_plan (member_id, daily_kcal, protein_g, fat_g, carbs_g, summary)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(member_id) DO UPDATE SET
        daily_kcal = excluded.daily_kcal,
        protein_g = excluded.protein_g,
        fat_g = excluded.fat_g,
        carbs_g = excluded.carbs_g,
        summary = excluded.summary
    `).run(req.params.memberId, daily_kcal, protein_g, fat_g, carbs_g, summary);
    res.json({ success: true });
  });

  // Logs & Stats
  app.get("/api/logs", authenticate, (req: any, res) => {
    const { memberId } = req.query;
    let query = "SELECT * FROM logs WHERE user_id = ?";
    let params = [req.user.id];
    if (memberId) {
      query += " AND member_id = ?";
      params.push(memberId);
    }
    query += " ORDER BY timestamp DESC LIMIT 100";
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  });

  app.post("/api/logs/food", authenticate, (req: any, res) => {
    const { member_ids, description, kcal, protein_g, fat_g, carbs_g, consumed_items } = req.body;
    
    // Log for each member
    for (const memberId of member_ids) {
      db.prepare("INSERT INTO logs (user_id, member_id, type, description, kcal, protein_g, fat_g, carbs_g) VALUES (?, ?, 'food', ?, ?, ?, ?, ?)").run(
        req.user.id, memberId, description, kcal, protein_g, fat_g, carbs_g
      );
    }

    // Update shared inventory
    if (consumed_items) {
      for (const item of consumed_items) {
        db.prepare("UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND name = ?").run(item.amount, req.user.id, item.name);
      }
    }
    res.json({ success: true });
  });

  app.post("/api/logs/exercise", authenticate, async (req: any, res) => {
    const { member_id, description } = req.body;
    try {
      const result = await analyzeExercise(description);
      db.prepare("INSERT INTO logs (user_id, member_id, type, description, kcal) VALUES (?, ?, 'exercise', ?, ?)").run(
        req.user.id, member_id, result.description, -result.kcal
      );
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Ошибка анализа активности" });
    }
  });

  app.post("/api/logs/food/analyze", authenticate, async (req: any, res) => {
    const { input } = req.body;
    const inventory = db.prepare("SELECT * FROM inventory WHERE user_id = ?").all(req.user.id);
    const family = db.prepare("SELECT * FROM family_members WHERE user_id = ? AND is_active = 1").all(req.user.id);
    
    try {
      const result = await analyzeFoodInput(input, inventory, family);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Ошибка анализа еды" });
    }
  });

  app.get("/api/export/xlsx", authenticate, (req: any, res) => {
    const logs = db.prepare("SELECT type, description, kcal, protein_g, fat_g, carbs_g, timestamp FROM logs WHERE user_id = ? ORDER BY timestamp DESC").all(req.user.id);
    const inventory = db.prepare("SELECT name, quantity, unit FROM inventory WHERE user_id = ?").all(req.user.id);
    const family = db.prepare("SELECT name, age, weight, activity_level, preferences FROM family_members WHERE user_id = ? AND is_active = 1").all(req.user.id);

    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.json_to_sheet(logs), "Логи");
    utils.book_append_sheet(wb, utils.json_to_sheet(inventory), "Инвентарь");
    utils.book_append_sheet(wb, utils.json_to_sheet(family), "Семья");

    const buf = write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=nutriai_data.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  app.post("/api/import/xlsx", authenticate, upload.single("file"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "Файл не загружен" });

    try {
      const workbook = read(req.file.buffer, { type: "buffer" });
      const inventorySheet = workbook.Sheets["Инвентарь"];
      
      if (!inventorySheet) {
        return res.status(400).json({ error: "Лист 'Инвентарь' не найден в файле" });
      }

      const data = utils.sheet_to_json(inventorySheet) as any[];
      
      // Transaction for safety
      const deleteStmt = db.prepare("DELETE FROM inventory WHERE user_id = ?");
      const insertStmt = db.prepare("INSERT INTO inventory (user_id, name, quantity, unit) VALUES (?, ?, ?, ?)");

      const transaction = db.transaction((items: any[]) => {
        deleteStmt.run(req.user.id);
        for (const item of items) {
          if (item.name && item.quantity !== undefined) {
            insertStmt.run(req.user.id, item.name, item.quantity, item.unit || "г");
          }
        }
      });

      transaction(data);
      res.json({ success: true, count: data.length });
    } catch (e) {
      console.error("Import error:", e);
      res.status(500).json({ error: "Ошибка при импорте файла" });
    }
  });

  // AI Actions
  app.post("/api/ai/meal-plan", authenticate, async (req: any, res) => {
    try {
      const inventory = db.prepare("SELECT * FROM inventory WHERE user_id = ?").all(req.user.id);
      const family = db.prepare(`
        SELECT m.*, p.daily_kcal, p.protein_g, p.fat_g, p.carbs_g, p.summary as plan_summary
        FROM family_members m
        LEFT JOIN nutrition_plan p ON m.id = p.member_id
        WHERE m.user_id = ? AND m.is_active = 1
      `).all(req.user.id);
      const history = db.prepare("SELECT * FROM logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10").all(req.user.id);
      
      const result = await generateMealPlan(inventory, family, history);
      res.json(result);
    } catch (e) {
      console.error("Meal Plan Error:", e);
      res.status(500).json({ error: "Не удалось сгенерировать меню. Проверьте связь с Gemini." });
    }
  });

  // Settings & Bot
  app.get("/api/settings", authenticate, (req: any, res) => {
    const settings = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(req.user.id) as any;
    const user = db.prepare("SELECT telegram_chat_id FROM users WHERE id = ?").get(req.user.id) as any;
    res.json({ ...settings, telegram_chat_id: user.telegram_chat_id });
  });

  app.post("/api/settings", authenticate, async (req: any, res) => {
    const { tg_bot_token, telegram_chat_id } = req.body;
    db.prepare("INSERT INTO settings (user_id, tg_bot_token) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET tg_bot_token = excluded.tg_bot_token").run(req.user.id, tg_bot_token);
    db.prepare("UPDATE users SET telegram_chat_id = ? WHERE id = ?").run(telegram_chat_id, req.user.id);
    
    if (tg_bot_token) {
      await botManager.start(tg_bot_token);
    }
    res.json({ success: true });
  });

  // Self-Diagnostics
  app.get("/api/health", async (req, res) => {
    try {
      db.prepare("SELECT 1").get();
      const geminiStatus = await checkGeminiHealth();
      res.json({ 
        status: "ok", 
        database: "connected", 
        gemini: geminiStatus,
        bot: botManager ? "initialized" : "null" 
      });
    } catch (e) {
      res.status(500).json({ status: "error", message: String(e) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
