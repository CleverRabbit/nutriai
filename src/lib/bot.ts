import { Telegraf } from 'telegraf';
import db from './db.js';
import { chatWithAI, generateMealPlan } from './ai.js';

export class BotManager {
  private bot: Telegraf | null = null;

  async start(token: string) {
    if (this.bot) {
      await this.bot.stop();
    }

    this.bot = new Telegraf(token);

    this.bot.start((ctx) => {
      ctx.reply('Добро пожаловать в NutriAI Bot! Пожалуйста, привяжите свой аккаунт в настройках веб-приложения.');
    });

    this.bot.on('text', async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const user = db.prepare('SELECT * FROM users WHERE telegram_chat_id = ?').get(chatId) as any;

      if (!user) {
        return ctx.reply('Пожалуйста, сначала привяжите свой аккаунт Telegram в веб-приложении, используя ваш Chat ID: ' + chatId);
      }

      const text = ctx.message.text;

      if (text.toLowerCase().includes('меню')) {
        const inventory = db.prepare('SELECT * FROM inventory WHERE user_id = ?').all(user.id);
        const family = db.prepare(`
          SELECT m.*, p.daily_kcal, p.protein_g, p.fat_g, p.carbs_g, p.summary as plan_summary
          FROM family_members m
          LEFT JOIN nutrition_plan p ON m.id = p.member_id
          WHERE m.user_id = ? AND m.is_active = 1
        `).all(user.id);
        const history = db.prepare('SELECT * FROM logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5').all(user.id);
        
        ctx.reply('Планирую ваше меню...');
        const result = await generateMealPlan(inventory, family as any[], history);
        
        let menuText = '🥗 Предложенное меню:\n\n';
        result.menu.forEach((m: any) => {
          menuText += `🔹 *${m.meal}*: ${m.recipe} (${m.kcal} ккал)\n`;
          menuText += `   Ингредиенты: ${m.ingredients.map((i: any) => `${i.name} ${i.amount}`).join(', ')}\n\n`;
        });

        if (result.missing_ingredients.length > 0) {
          menuText += `🛒 Нужно докупить: ${result.missing_ingredients.join(', ')}`;
        }

        ctx.replyWithMarkdown(menuText);
        return;
      }

      const response = await chatWithAI(text, { userId: user.id });
      ctx.reply(response);
    });

    this.bot.launch().catch(err => console.error('Ошибка запуска бота:', err));
    console.log('Telegram Bot запущен');
  }

  stop() {
    if (this.bot) {
      this.bot.stop();
      this.bot = null;
    }
  }
}

export const botManager = new BotManager();
