import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateMealPlan(inventory: any[], family: any[], history: any[]) {
  const prompt = `
    Ты — помощник по питанию для семьи. 
    Текущие запасы в холодильнике: ${JSON.stringify(inventory)}
    Состав семьи и их цели/предпочтения: ${JSON.stringify(family)}
    Последняя история приемов пищи семьи: ${JSON.stringify(history)}

    Предложи меню на день. Учти:
    1. Холодильник общий.
    2. В основном готовят общее блюдо на всех (Shared), но если у кого-то специфические цели или предпочтения, предложи индивидуальную корректировку или отдельное блюдо.
    3. Укажи, кто именно ест каждое блюдо.
    4. Если какие-то ингредиенты отсутствуют, перечисли их.
    
    Отвечай строго в формате JSON. Все текстовые поля должны быть на русском языке.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          menu: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                meal: { type: Type.STRING, description: "Название приема пищи (Завтрак, Обед...)" },
                recipe: { type: Type.STRING, description: "Название блюда" },
                is_shared: { type: Type.BOOLEAN, description: "Общее ли это блюдо для всех" },
                assigned_to: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Имена членов семьи, для которых это блюдо" 
                },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      amount: { type: Type.STRING }
                    }
                  }
                },
                kcal_per_person: { type: Type.NUMBER }
              }
            }
          },
          missing_ingredients: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function analyzeExercise(description: string) {
  const prompt = `Проанализируй это упражнение: "${description}". Оцени количество сожженных калорий. Верни JSON: { "kcal": number, "description": "string (на русском)" }`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          kcal: { type: Type.NUMBER },
          description: { type: Type.STRING }
        }
      }
    }
  });
  return JSON.parse(response.text);
}

export async function chatWithAI(message: string, context: any) {
  const prompt = `
    Контекст: ${JSON.stringify(context)}
    Сообщение пользователя: ${message}
    Отвечай как дружелюбный и профессиональный помощник по питанию на русском языке.
  `;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });
  return response.text;
}
