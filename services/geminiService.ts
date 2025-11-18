
import { GoogleGenAI, Type } from "@google/genai";
import type { QAPageContent, ExplanationStyle, CoverTheme } from "../types";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // In a real app, you'd handle this more gracefully.
  // The environment is expected to have this set.
  console.error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY! });

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
    const fullPrompt = `A book cover with a ${theme} theme. The design should be vibrant, creative, and related to academic and technological topics. Title: "${basePrompt}"`;
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '3:4',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        throw new Error("No image was generated.");
    } catch (error) {
        console.error("Error generating cover image:", error);
        // Return a placeholder image on error
        return "https://picsum.photos/600/800?grayscale";
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
            question: {
              type: Type.STRING,
              description: "The full text of the question, including any sub-parts.",
            },
            answer: {
              type: Type.STRING,
              description: "A correct and concise answer to the question.",
            },
            explanation: {
              type: Type.STRING,
              description: "A detailed explanation of how to arrive at the correct answer. The style of this explanation should be appropriate for the user's request. Use markdown for formatting if needed.",
            },
          },
          required: ["question", "answer", "explanation"],
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
    const imagePart = await fileToGenerativePart(paperFile);
    const prompt = `Analyze this question paper. Create a title based on its subject. For each question, extract it, provide the correct answer, and then give a ${explanationStyle} explanation. Adhere strictly to the JSON schema.`;

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
    onProgress('Preparing image for animation...');
    const imagePart = {
        imageBytes: (await fileToGenerativePart(imageFile)).inlineData.data,
        mimeType: imageFile.type,
    };

    const veoAi = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    onProgress('Sending request to Veo model...');
    let operation = await veoAi.models.generateVideos({
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
            operation = await veoAi.operations.getVideosOperation({ operation: operation });
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
    
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        throw new Error(`Failed to download the generated video (status: ${response.status})`);
    }
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
}
