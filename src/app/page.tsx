"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { AudioLines, Mic, MicOff, Save, Trash2, Upload, FilePlus, AlertTriangle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";

type Note = {
  id: string;
  title: string;
  content: string;
  date: string;
};

// Check for SpeechRecognition API
let SpeechRecognition: any = null;
if (typeof window !== 'undefined') {
  SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
}

export default function LinguaNotePage() {
  const { toast } = useToast();
  const [language, setLanguage] = useState('en-US');
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Welcome to SpeechNoteMm.');
  const [isMounted, setIsMounted] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const editorContentRef = useRef('');

  useEffect(() => {
    editorContentRef.current = editorContent;
  }, [editorContent]);

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedNotes = localStorage.getItem('linguanotes');
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error("Failed to load notes from localStorage", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load saved notes.' });
    }

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast({ variant: 'destructive', title: 'Speech Recognition Error', description: `Error: ${event.error}. Please check microphone permissions.` });
        setIsRecording(false);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript.trim() + ' ';
          }
        }
        if (finalTranscript) {
          setEditorContent(prev => prev + finalTranscript);
        }
      };
    }
  }, [toast]);

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem('linguanotes', JSON.stringify(notes));
      } catch (error) {
        console.error("Failed to save notes to localStorage", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save your notes.' });
      }
    }
  }, [notes, isMounted, toast]);

  const handleStartRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (isRecording || !recognition) return;
    try {
      recognition.lang = language;
      recognition.start();
      setStatusMessage('Listening...');
    } catch (e) {
      console.error("Could not start recording", e);
      toast({ variant: 'destructive', title: 'Recording Error', description: 'Could not start recording. Another app might be using the microphone.' });
    }
  }, [isRecording, language, toast]);

  const handleStopRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!isRecording || !recognition) return;
    recognition.stop();
    setStatusMessage('Recording stopped.');
  }, [isRecording]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'audio/mpeg') {
      toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an .mp3 file.' });
      return;
    }
    
    setStatusMessage(`Uploading "${file.name}"...`);
    await new Promise(res => setTimeout(res, 1500));
    setStatusMessage(`Transcribing audio... (demo)`);
    await new Promise(res => setTimeout(res, 2000));

    const dummyText = `\n(Dummy transcription for ${file.name}. Server-side logic is needed for real transcription.)\n`;
    setEditorContent(prev => prev + dummyText);
    setStatusMessage(`Transcription for "${file.name}" complete.`);
    event.target.value = '';
    toast({ title: 'Success', description: 'Dummy transcription complete.' });
  }, [toast]);

  const handleNewNote = useCallback(() => {
    if (isRecording) handleStopRecording();
    setActiveNoteId(null);
    setEditorContent('');
    setStatusMessage('Started a new note.');
  }, [isRecording, handleStopRecording]);

  const handleSaveNote = useCallback(() => {
    if (!editorContent.trim()) {
      toast({ variant: 'destructive', title: 'Empty Note', description: 'Cannot save a blank note.' });
      return;
    }
    const date = new Date().toISOString();
    const title = editorContent.substring(0, 40).split('\n')[0] || 'Untitled Note';

    if (activeNoteId) {
      setNotes(notes.map(note =>
        note.id === activeNoteId ? { ...note, content: editorContent, title, date } : note
      ));
      toast({ title: 'Note Updated', description: `"${title}" has been updated.` });
    } else {
      const newNote: Note = { id: `note-${Date.now()}`, content: editorContent, title, date };
      setNotes(prevNotes => [newNote, ...prevNotes]);
      setActiveNoteId(newNote.id);
      toast({ title: 'Note Saved', description: `"${title}" has been saved.` });
    }
    setStatusMessage('Note saved successfully.');
  }, [editorContent, activeNoteId, notes, toast]);

  const handleSelectNote = useCallback((note: Note) => {
    if (isRecording) {
      toast({ variant: 'destructive', title: 'Action Denied', description: 'Stop recording before switching notes.' });
      return;
    }
    setActiveNoteId(note.id);
    setEditorContent(note.content);
    setStatusMessage(`Viewing note: "${note.title}"`);
  }, [isRecording, toast]);

  const handleDeleteNote = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (isRecording) {
      toast({ variant: 'destructive', title: 'Action Denied', description: 'Stop recording before deleting a note.' });
      return;
    }
    const deletedNote = notes.find(n => n.id === noteId);
    setNotes(notes.filter(note => note.id !== noteId));
    if (activeNoteId === noteId) {
      handleNewNote();
    }
    toast({ title: 'Note Deleted', description: `"${deletedNote?.title}" has been deleted.` });
  }, [isRecording, notes, activeNoteId, toast, handleNewNote]);

  const handleCopyNote = useCallback((e: React.MouseEvent, content: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied!', description: 'Note content copied to clipboard.' });
  }, [toast]);
  
  if (!isMounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4 md:p-8">
        <div className="w-full max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-12 w-1/4" />
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-2/3 space-y-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-64" />
            </div>
            <div className="w-full md:w-1/3 space-y-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <header className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AudioLines className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline text-primary">SpeechNoteMm</h1>
          </div>
        </header>

        <main className="flex flex-col md:flex-row gap-6 p-4 md:p-6 max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="flex-grow md:w-2/3 flex flex-col gap-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline">Create a New Note</CardTitle>
                <CardDescription>{statusMessage}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="my-MM">Burmese (Myanmar)</SelectItem>
                    <SelectItem value="th-TH">Thai</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  {!SpeechRecognition ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Button variant="destructive" disabled><AlertTriangle className="mr-2 h-4 w-4"/> Not Supported</Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Speech recognition is not supported in your browser.</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : isRecording ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="destructive" size="icon" onClick={handleStopRecording} aria-label="Stop recording">
                          <MicOff />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Stop recording</p></TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="secondary" size="icon" onClick={handleStartRecording} aria-label="Start recording">
                          <Mic />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Start recording</p></TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <Button variant="secondary" size="icon" asChild aria-label="Upload MP3 file">
                           <label htmlFor="file-upload"><Upload /><input id="file-upload" type="file" className="hidden" accept=".mp3" onChange={handleFileUpload} /></label>
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent><p>Upload MP3 (Demo)</p></TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>

            <Textarea
              placeholder="Your transcript will appear here. You can also type directly."
              className="flex-grow min-h-[400px] text-base p-4 rounded-lg shadow-lg"
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
            />
            <div className="flex justify-end gap-2">
               <Button variant="outline" onClick={handleNewNote}>
                  <FilePlus className="mr-2 h-4 w-4" />
                  New Note
               </Button>
               <Button onClick={handleSaveNote} className="bg-accent hover:bg-accent/90">
                  <Save className="mr-2 h-4 w-4" />
                  {activeNoteId ? 'Update Note' : 'Save Note'}
               </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="md:w-1/3 flex flex-col">
            <Card className="flex-grow flex flex-col shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline">My Saved Notes</CardTitle>
                <CardDescription>You have {notes.length} notes.</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="p-0 flex-grow">
                <ScrollArea className="h-[550px]">
                  <div className="p-4 space-y-2">
                    {notes.length === 0 ? (
                      <div className="text-center text-muted-foreground py-10">No notes saved yet.</div>
                    ) : (
                      notes.map(note => (
                        <div
                          key={note.id}
                          onClick={() => handleSelectNote(note)}
                          className={`group p-3 rounded-lg border cursor-pointer transition-colors ${activeNoteId === note.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold truncate max-w-[200px]">{note.title}</h3>
                              <time dateTime={note.date} className="text-xs text-muted-foreground">
                                {format(new Date(note.date), "PPP p")}
                              </time>
                            </div>
                            <div className="flex items-center opacity-50 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary shrink-0"
                                    onClick={(e) => handleCopyNote(e, note.content)}
                                    aria-label="Copy note"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Copy note</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                                    onClick={(e) => handleDeleteNote(e, note.id)}
                                    aria-label="Delete note"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Delete note</p></TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
