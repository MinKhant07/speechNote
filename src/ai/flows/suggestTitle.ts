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
  language: z.string().describe('The language of the content, e.g., "en-US", "my-MM".'),
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
                text: `Based on the following note content, suggest one single, short, and concise title in the same language as the content (${input.language}). The title should be 5-10 words maximum. IMPORTANT: Do not add any introductory text, explanations, or bullet points. Only return the title text itself. Content: "${input.content}"`,
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
    
    // Clean up the title to remove any introductory phrases, bullet points, or quotes.
    // This makes the output more reliable.
    title = title
      .split('\n') // Split by new lines in case it returns a list
      .map(line => line.trim()) // Trim whitespace from each line
      .filter(line => !!line) // Remove empty lines
      .map(line => line.replace(/^[\*\-\s"']+|[\s"']+$/g, '')) // Remove leading/trailing junk
      .pop() || title; // Take the last plausible line as the title

    return { title };

  } catch (error) {
    console.error('Title suggestion failed:', error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred during title suggestion.');
  }
}
