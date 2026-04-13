import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL_NAME = "gemini-3-flash-preview";

export async function checkGeminiHealth() {
  try {
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: "ping",
    });
    return result.text ? "connected" : "error";
  } catch (e) {
    console.error("Gemini Health Check Error:", e);
    return "error";
  }
}

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
    model: MODEL_NAME,
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
                      amount: { type: Type.STRING, description: "Количество с единицей измерения (например, 100г, 2шт)" }
                    }
                  }
                },
                kcal_per_person: { type: Type.NUMBER }
              },
              required: ["meal", "recipe", "is_shared", "assigned_to", "ingredients", "kcal_per_person"]
            }
          },
          missing_ingredients: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["menu", "missing_ingredients"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function analyzeFoodInput(input: string, inventory: any[], family: any[]) {
  const prompt = `
    Пользователь приготовил или съел блюдо: "${input}".
    Текущие запасы: ${JSON.stringify(inventory)}
    Семья: ${JSON.stringify(family)}

    Проанализируй ввод и верни JSON.
    Если неясно, кто ел, спроси. Если неясно количество продуктов, спроси.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Понятное описание блюда на русском" },
          kcal: { type: Type.NUMBER, description: "число (на одного человека)" },
          protein_g: { type: Type.NUMBER },
          fat_g: { type: Type.NUMBER },
          carbs_g: { type: Type.NUMBER },
          member_ids: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "id членов семьи, кто это ел" 
          },
          consumed_items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "название из инвентаря" },
                amount: { type: Type.NUMBER, description: "число" }
              }
            }
          },
          needs_clarification: { type: Type.STRING, description: "текст вопроса, если что-то непонятно, иначе null" }
        },
        required: ["description", "kcal", "protein_g", "fat_g", "carbs_g", "member_ids", "consumed_items"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function analyzeExercise(description: string) {
  const prompt = `Проанализируй это упражнение: "${description}". Оцени количество сожженных калорий.`;
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          kcal: { type: Type.NUMBER },
          description: { type: Type.STRING }
        },
        required: ["kcal", "description"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function chatWithAI(message: string, context: any) {
  const prompt = `
    Контекст: ${JSON.stringify(context)}
    Сообщение пользователя: ${message}
    Отвечай как дружелюбный и профессиональный помощник по питанию на русском языке.
  `;
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  });
  return response.text || "";
}
