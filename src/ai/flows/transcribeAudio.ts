'use server';
/**
 * @fileOverview A flow for transcribing audio files with word-level timestamps.
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

const WordTimestampSchema = z.object({
  word: z.string(),
  startTime: z.number(),
  endTime: z.number(),
});

const TranscribeAudioOutputSchema = z.object({
  transcript: z.string().describe('The full transcribed text from the audio.'),
  words: z.array(WordTimestampSchema).describe('Array of words with their timestamps.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

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
    
    const prompt = `Transcribe the following audio. Provide the full transcript as a single string. Also, provide an array of objects, where each object represents a word and contains 'word', 'startTime', and 'endTime' in seconds.

Return the result as a valid JSON object with two keys: "transcript" and "words".

Example:
{
  "transcript": "Hello world.",
  "words": [
    { "word": "Hello", "startTime": 0.1, "endTime": 0.5 },
    { "word": "world.", "startTime": 0.6, "endTime": 1.0 }
  ]
}
`;


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
                text: prompt,
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
        "generationConfig": {
          "response_mime_type": "application/json",
        }
      }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error('Google AI API Error:', errorBody);
        const errorDetails = errorBody.error?.message || response.statusText;
        throw new Error(`API request failed: ${errorDetails}`);
    }

    const responseData = await response.json();
    const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsedResult = JSON.parse(responseText);

    const validatedResult = TranscribeAudioOutputSchema.parse(parsedResult);

    return validatedResult;

  } catch (error) {
    console.error('Transcription failed:', error);
    if (error instanceof Error) {
        // Check for specific Zod error to provide more context
        if (error.name === 'ZodError') {
             throw new Error('AI returned an unexpected format. Please try again.');
        }
        throw error;
    }
    throw new Error('An unknown error occurred during transcription.');
  }
}
