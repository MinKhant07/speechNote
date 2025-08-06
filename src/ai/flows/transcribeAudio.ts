'use server';
/**
 * @fileOverview A flow for transcribing audio files.
 *
 * - transcribeAudio - A function that handles the audio transcription process.
 * - TranscribeAudioInput - The input type for the transcribeAudio function.
 * - TranscribeAudioOutput - The return type for the transcribeAudio function.
 */

import { z } from 'genkit';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  apiKey: z.string().describe('A Google AI API key.'),
});
type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  transcript: z.string().describe('The transcribed text from the audio.'),
});
type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export async function transcribeAudio(
  input: TranscribeAudioInput
): Promise<TranscribeAudioOutput> {
  if (!input.apiKey) {
    throw new Error('API key is required for transcription.');
  }

  try {
    const mimeType = input.audioDataUri.match(/data:(.*?);/)?.[1] ?? '';
    const base64Data = input.audioDataUri.split(',')[1];

    if (!mimeType || !base64Data) {
      throw new Error('Invalid audio data URI format.');
    }

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
                text: 'Transcribe the following audio recording.',
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
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
    const transcript = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return { transcript };

  } catch (error) {
    console.error('Transcription failed:', error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred during transcription.');
  }
}
