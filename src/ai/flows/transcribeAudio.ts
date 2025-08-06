'use server';
/**
 * @fileOverview A flow for transcribing audio files.
 *
 * - transcribeAudio - A function that handles the audio transcription process.
 * - TranscribeAudioInput - The input type for the transcribeAudio function.
 * - TranscribeAudioOutput - The return type for the transcribeAudio function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  apiKey: z.string().optional().describe('An optional Google AI API key.'),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  transcript: z.string().describe('The transcribed text from the audio.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

const transcriptionPrompt = ai.definePrompt({
  name: 'transcriptionPrompt',
  input: { schema: z.object({ audioDataUri: z.string() }) },
  output: { schema: TranscribeAudioOutputSchema },
  prompt: `Transcribe the following audio recording.
  
  Audio: {{media url=audioDataUri}}`,
});

const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async (input) => {
    let model = googleAI.model('gemini-2.0-flash');

    if (input.apiKey) {
      // If a user-provided API key exists, initialize a new Google AI plugin
      // instance with that key and get the model from it.
      const userGoogleAI = new (googleAI as any).GoogleAI({ apiKey: input.apiKey });
      model = userGoogleAI.model('gemini-2.0-flash');
    } else {
        // For self-hosted deployments, you might have a default key set up.
        // If no key is available at all, this will fail.
        // For this app, the frontend ensures a key is always provided.
    }

    const { output } = await transcriptionPrompt(
      { audioDataUri: input.audioDataUri },
      { model }
    );
    
    return {
      transcript: output?.transcript ?? '',
    };
  }
);

export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
  if (!input.apiKey) {
    throw new Error('API key is required for transcription.');
  }
  return await transcribeAudioFlow(input);
}
