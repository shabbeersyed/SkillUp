
import { GoogleGenAI, Type } from "@google/genai";
import { CareerAnalysisResponse } from "../types";

export const analyzeCareerPath = async (resumeText: string): Promise<CareerAnalysisResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the following resume text and provide a detailed career path analysis. 
    Resume Text: ${resumeText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          currentProfile: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              extractedSkills: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    level: { type: Type.NUMBER },
                    category: { type: Type.STRING }
                  },
                  required: ["name", "level", "category"]
                }
              }
            },
            required: ["title", "summary", "extractedSkills"]
          },
          recommendedPaths: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING },
                description: { type: Type.STRING },
                salaryExpectation: { type: Type.STRING },
                matchScore: { type: Type.NUMBER },
                gapAnalysis: { type: Type.ARRAY, items: { type: Type.STRING } },
                roadmap: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      phase: { type: Type.STRING },
                      objective: { type: Type.STRING },
                      skillsToLearn: { type: Type.ARRAY, items: { type: Type.STRING } },
                      duration: { type: Type.STRING },
                      resources: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            title: { type: Type.STRING },
                            type: { type: Type.STRING },
                            provider: { type: Type.STRING },
                            link: { type: Type.STRING },
                            relevance: { type: Type.STRING }
                          },
                          required: ["title", "type", "relevance"]
                        }
                      }
                    },
                    required: ["phase", "objective", "skillsToLearn", "duration", "resources"]
                  }
                }
              },
              required: ["role", "description", "salaryExpectation", "matchScore", "gapAnalysis", "roadmap"]
            }
          }
        },
        required: ["currentProfile", "recommendedPaths"]
      },
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text) as CareerAnalysisResponse;
};
