
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { QAPageContent, ExplanationStyle, CoverTheme } from "../types";

// Helper to get the client with the environment API key
const getClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};


// Helper to convert File to base64
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export async function generateCoverImage(basePrompt: string, theme: CoverTheme): Promise<string> {
    const ai = getClient();
    
    const fullPrompt = `A book cover with a ${theme} theme. The design should be vibrant, creative, and related to academic and technological topics. Title: "${basePrompt}". Author: "ICT Cafe".`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: fullPrompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
             return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        throw new Error("No image was generated.");
    } catch (error) {
        console.error("Error generating cover image:", error);
        return "https://picsum.photos/600/800?grayscale";
    }
}

export async function generateIllustration(prompt: string): Promise<string> {
    const ai = getClient();
    const cleanPrompt = prompt.length > 200 ? prompt.substring(0, 200) : prompt;
    const fullPrompt = `Create a simple, clean, educational vector illustration for: ${cleanPrompt}. Use a white background. Do not include text.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: fullPrompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
             return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        throw new Error("No illustration data found in response");
    } catch (error) {
        console.error("Error generating illustration:", error);
        // Fallback to placeholder or throw
        throw error;
    }
}

const paperAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A concise, academic title for the provided question paper. Use the main subject of the paper.",
      },
      questions: {
        type: Type.ARRAY,
        description: "An array of all questions identified in the paper.",
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            question_sinhala: { type: Type.STRING, description: "Sinhala translation of the question" },
            answer_sinhala: { type: Type.STRING, description: "Sinhala translation of the answer" },
            explanation_sinhala: { type: Type.STRING, description: "Sinhala translation of the explanation" },
            question_tamil: { type: Type.STRING, description: "Tamil translation of the question" },
            answer_tamil: { type: Type.STRING, description: "Tamil translation of the answer" },
            explanation_tamil: { type: Type.STRING, description: "Tamil translation of the explanation" },
          },
          required: ["question", "answer", "explanation", "question_sinhala", "answer_sinhala", "explanation_sinhala", "question_tamil", "answer_tamil", "explanation_tamil"],
        },
      },
    },
    required: ["title", "questions"],
};

interface PaperAnalysisResult {
    title: string;
    questions: QAPageContent[];
}


export async function analyzePaper(paperFile: File, explanationStyle: ExplanationStyle): Promise<PaperAnalysisResult> {
    const ai = getClient();
    const imagePart = await fileToGenerativePart(paperFile);
    const prompt = `Analyze this question paper. Create a title based on its subject. For each question, extract it, provide the correct answer, and then give a ${explanationStyle} explanation. Provide the Question, Answer, and Explanation in English, Sinhala, and Tamil. Adhere strictly to the JSON schema.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: paperAnalysisSchema,
            }
        });

        const jsonString = response.text;
        const result = JSON.parse(jsonString);
        
        if (!result.title || !Array.isArray(result.questions)) {
            throw new Error("Invalid JSON structure received from API.");
        }

        return result;

    } catch (error) {
        console.error("Error analyzing paper:", error);
        throw new Error("Failed to analyze the paper. Please try again with a clearer image.");
    }
}

export async function generateVideoFromImage(
    imageFile: File,
    aspectRatio: '16:9' | '9:16',
    onProgress: (message: string) => void
): Promise<string> {
    const ai = getClient();
    onProgress('Preparing image for animation...');
    const imagePart = {
        imageBytes: (await fileToGenerativePart(imageFile)).inlineData.data,
        mimeType: imageFile.type,
    };

    onProgress('Sending request to Veo model...');
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        image: imagePart,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
        }
    });

    onProgress('Video generation in progress... This may take a few minutes.');
    let pollCount = 0;
    while (!operation.done) {
        pollCount++;
        onProgress(`Video generation in progress... (Checking status ${pollCount})`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10s
        try {
            operation = await ai.operations.getVideosOperation({ operation: operation });
        } catch (error: any) {
             if (error.message?.includes('Requested entity was not found.')) {
                throw new Error('API key validation failed. Please select a valid API key and try again.');
            }
            throw error;
        }
    }

    onProgress('Finalizing video...');
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error('Video generation failed to produce a download link.');
    }
    
    const apiKey = process.env.API_KEY;
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Failed to download the generated video (status: ${response.status})`);
    }
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
}

const creativeBookSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A creative title for the book." },
        pages: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Title of the page/chapter." },
                    content: { type: Type.STRING, description: "The educational or story content for this page. About 150-200 words." },
                    imagePrompt: { type: Type.STRING, description: "A detailed prompt to generate an illustration for this page." }
                },
                required: ["title", "content", "imagePrompt"]
            }
        }
    },
    required: ["title", "pages"]
};

export interface CreativeBookResult {
    title: string;
    pages: { title: string; content: string; imagePrompt: string }[];
}

export async function generateCreativeBook(topic: string, audience: string, style: string): Promise<CreativeBookResult> {
    const ai = getClient();
    const prompt = `Create a mini flipbook about "${topic}" for an audience of "${audience}" in the style of "${style}". 
    Generate 5 interesting pages. Each page should have a title, engaging content, and a prompt for an illustration.
    Return valid JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: creativeBookSchema,
            }
        });

        const jsonString = response.text;
        return JSON.parse(jsonString) as CreativeBookResult;
    } catch (error) {
        console.error("Error generating creative book:", error);
        throw new Error("Failed to generate the book. Please try a different topic.");
    }
}
