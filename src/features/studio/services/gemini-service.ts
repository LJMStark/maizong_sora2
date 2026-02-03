import { AspectRatio, ImageQuality } from "../types";

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const urlToBase64 = async (url: string): Promise<string> => {
  if (url.startsWith('data:')) {
    return url.split(',')[1];
  }
  const response = await fetch(url);
  const blob = await response.blob();
  return fileToBase64(blob as File);
};

export class GeminiService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  }

  async generateImage(
    prompt: string,
    aspectRatio: AspectRatio,
    quality: ImageQuality,
    referenceImage?: string,
    mode: 'generate' | 'edit' = 'generate'
  ): Promise<string> {
    // Mock implementation - replace with actual Gemini API call
    console.log('Generating image with:', { prompt, aspectRatio, quality, mode });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return a placeholder image
    return `https://picsum.photos/seed/${Date.now()}/800/800`;
  }

  async analyzeImage(prompt: string, imageBase64: string): Promise<string> {
    // Mock implementation
    console.log('Analyzing image with prompt:', prompt);

    await new Promise(resolve => setTimeout(resolve, 1500));

    return `Analysis Result:

This image showcases a professional product photography setup with excellent lighting and composition.

Key observations:
- Clean, minimalist aesthetic
- Soft, diffused lighting creating gentle shadows
- Neutral color palette enhancing product focus
- High-quality resolution suitable for e-commerce

Recommendations:
- Consider adding subtle props for lifestyle context
- The current lighting works well for luxury positioning
- Image is optimized for web and print use`;
  }

  async generateVideo(
    prompt: string,
    startImageBase64: string | undefined,
    aspectRatio: AspectRatio,
    isQualityMode: boolean
  ): Promise<string> {
    // Mock implementation
    console.log('Generating video with:', { prompt, aspectRatio, isQualityMode });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Return a sample video URL
    return 'https://www.w3schools.com/html/mov_bbb.mp4';
  }
}

export const geminiService = new GeminiService();
