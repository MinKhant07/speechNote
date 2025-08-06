'use server';
/**
 * @fileOverview A flow for suggesting a title for a note.
 *
 * - suggestTitle - A function that suggests a title based on note content.
 * - SuggestTitleInput - The input type for the suggestTitle function.
 * - SuggestTitleOutput - The return type for the suggestTitle function.
 */
import { z } from 'genkit';

const SuggestTitleInputSchema = z.object({
  content: z.string().describe('The content of the note.'),
  apiKey: z.string().describe('A Google AI API key.'),
});
type SuggestTitleInput = z.infer<typeof SuggestTitleInputSchema>;

const SuggestTitleOutputSchema = z.object({
  title: z.string().describe('The suggested title for the note.'),
});
type SuggestTitleOutput = z.infer<typeof SuggestTitleOutputSchema>;


export async function suggestTitle(input: SuggestTitleInput): Promise<SuggestTitleOutput> {
  if (!input.apiKey) {
    throw new Error('API key is required for title suggestion.');
  }
  
  try {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${input.apiKey}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Based on the following note content, suggest a short, concise title (5-10 words maximum). Content: "${input.content}"`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error('Google AI API Error:', errorBody);
        const errorDetails = errorBody.error?.message || response.statusText;
        throw new Error(`API request failed: ${errorDetails}`);
    }

    const responseData = await response.json();
    let title = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean up the title (remove quotes, etc.)
    title = title.replace(/^"|"$/g, '').trim();

    return { title };

  } catch (error) {
    console.error('Title suggestion failed:', error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred during title suggestion.');
  }
}
