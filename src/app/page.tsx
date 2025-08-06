"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { AudioLines, Mic, MicOff, Save, Trash2, Upload, FilePlus, AlertTriangle, Copy, Loader2, KeyRound, Pencil, LogOut, Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { transcribeAudio } from '@/ai/flows/transcribeAudio';
import { suggestTitle } from '@/ai/flows/suggestTitle';

type Note = {
  id: string;
  title: string;
  content: string;
  date: string;
};

let SpeechRecognition: any = null;
if (typeof window !== 'undefined') {
  SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
}

function ApiKeyEntry({ onApiKeySubmit }: { onApiKeySubmit: (key: string) => void }) {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = () => {
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <KeyRound className="text-primary" />
            Enter Your Google AI API Key
          </CardTitle>
          <CardDescription>
            To use SpeechNoteMm, please provide your Google AI API key. Your key will be saved securely in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="Enter your API key here..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="text-base"
          />
          <Button onClick={handleSubmit} className="w-full bg-accent hover:bg-accent/90">
            Start Using SpeechNoteMm
          </Button>
          <p className="text-xs text-center text-muted-foreground pt-2">
            Get your key from{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline text-primary">
              Google AI Studio
            </a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


export default function LinguaNotePage() {
  const { toast } = useToast();
  const [language, setLanguage] = useState('en-US');
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Welcome! Your notes are saved in this browser.');
  const [isMounted, setIsMounted] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedApiKey = localStorage.getItem('geminiApiKey');
      if (savedApiKey) {
        setApiKey(savedApiKey);
      }
      
      const savedNotes = localStorage.getItem('linguanotes');
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load saved data.' });
    }
  }, [toast]);
  
  useEffect(() => {
    if (!apiKey || !SpeechRecognition) return;

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
  }, [apiKey, toast]);

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
  
  const handleApiKeySubmit = (newApiKey: string) => {
    setApiKey(newApiKey);
    try {
      localStorage.setItem('geminiApiKey', newApiKey);
      toast({ title: 'API Key Saved!', description: 'You can now start using the app.' });
    } catch (error) {
       console.error("Failed to save API key to localStorage", error);
       toast({ variant: 'destructive', title: 'Error', description: 'Could not save your API key.' });
    }
  };

  const handleChangeApiKey = () => {
     setApiKey(null);
     localStorage.removeItem('geminiApiKey');
     toast({ title: 'API Key Removed', description: 'Please enter a new API key to continue.' });
  }

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
    if (!file || !apiKey) return;
  
    if (!file.type.startsWith('audio/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an audio file.' });
        return;
    }
  
    setIsTranscribing(true);
    setStatusMessage(`Uploading "${file.name}"...`);
  
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const audioDataUri = reader.result as string;
        setStatusMessage(`Transcribing audio... This may take a moment.`);
        try {
            const result = await transcribeAudio({ audioDataUri, apiKey });
            setEditorContent(prev => prev + result.transcript + '\n');
            setStatusMessage('Transcription complete.');
            toast({ title: 'Success', description: 'Audio transcribed successfully.' });
        } catch (error) {
            console.error('Transcription error:', error);
            const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred.';
            setStatusMessage('Transcription failed. Please try again.');
            toast({ variant: 'destructive', title: 'Transcription Error', description: `Failed to transcribe. Reason: ${errorMessage}` });
        } finally {
            setIsTranscribing(false);
            event.target.value = '';
        }
    };
    reader.onerror = (error) => {
        console.error('File reader error:', error);
        setStatusMessage('Failed to read file.');
        toast({ variant: 'destructive', title: 'File Error', description: 'Could not read the selected file.' });
        setIsTranscribing(false);
    };
  }, [toast, apiKey]);
  
  const handleSuggestTitle = useCallback(async () => {
    if (!editorContent.trim() || !apiKey) {
      toast({ variant: 'destructive', title: 'Cannot Suggest Title', description: 'Note content is empty. Please type or dictate something first.' });
      return;
    }
    
    setIsSuggestingTitle(true);
    setStatusMessage('Generating a title for your note...');
    try {
      const result = await suggestTitle({ content: editorContent, apiKey });
      setEditorTitle(result.title);
      setStatusMessage('Title suggestion complete.');
      toast({ title: 'Title Suggested!', description: 'A new title has been generated.' });
    } catch(error) {
      console.error('Title suggestion error:', error);
      const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred.';
      setStatusMessage('Title suggestion failed.');
      toast({ variant: 'destructive', title: 'Suggestion Error', description: `Failed to suggest a title. Reason: ${errorMessage}` });
    } finally {
      setIsSuggestingTitle(false);
    }
  }, [editorContent, apiKey, toast]);

  const handleNewNote = useCallback(() => {
    if (isRecording) handleStopRecording();
    setActiveNoteId(null);
    setEditorTitle('');
    setEditorContent('');
    setStatusMessage('Started a new note.');
  }, [isRecording, handleStopRecording]);

  const handleSaveNote = useCallback(() => {
    if (!editorContent.trim()) {
      toast({ variant: 'destructive', title: 'Empty Note', description: 'Cannot save a blank note.' });
      return;
    }
    const date = new Date().toISOString();
    const title = editorTitle.trim() || editorContent.substring(0, 40).split('\n')[0] || 'Untitled Note';

    if (activeNoteId) {
      setNotes(notes.map(note =>
        note.id === activeNoteId ? { ...note, title, content: editorContent, date } : note
      ));
      toast({ title: 'Note Updated', description: `"${title}" has been updated.` });
    } else {
      const newNote: Note = { id: `note-${Date.now()}`, title, content: editorContent, date };
      setNotes(prevNotes => [newNote, ...prevNotes]);
      setActiveNoteId(newNote.id);
      toast({ title: 'Note Saved', description: `"${title}" has been saved.` });
    }
    setStatusMessage('Note saved to this browser successfully.');
  }, [editorTitle, editorContent, activeNoteId, notes, toast]);

  const handleSelectNote = useCallback((note: Note) => {
    if (isRecording || isTranscribing) {
      toast({ variant: 'destructive', title: 'Action Denied', description: 'Please wait for the current action to finish before switching notes.' });
      return;
    }
    setActiveNoteId(note.id);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setStatusMessage(`Viewing note: "${note.title}"`);
  }, [isRecording, isTranscribing, toast]);

  const handleDeleteNote = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (isRecording || isTranscribing) {
      toast({ variant: 'destructive', title: 'Action Denied', description: 'Please wait for the current action to finish before deleting a note.' });
      return;
    }
    const deletedNote = notes.find(n => n.id === noteId);
    setNotes(notes.filter(note => note.id !== noteId));
    if (activeNoteId === noteId) {
      handleNewNote();
    }
    toast({ title: 'Note Deleted', description: `"${deletedNote?.title}" has been deleted.` });
  }, [isRecording, isTranscribing, notes, activeNoteId, toast, handleNewNote]);

  const handleCopyNote = useCallback((e: React.MouseEvent, content: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied!', description: 'Note content copied to clipboard.' });
  }, [toast]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    return notes.filter(note => 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notes, searchQuery]);
  
  if (!isMounted) {
    return null; // or a loading spinner
  }

  if (!apiKey) {
    return <ApiKeyEntry onApiKeySubmit={handleApiKeySubmit} />;
  }

  const isActionInProgress = isRecording || isTranscribing || isSuggestingTitle;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <header className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
             <div className="flex items-center gap-3">
                <AudioLines className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold font-headline text-primary">SpeechNoteMm</h1>
             </div>
             <Tooltip>
                <TooltipTrigger asChild>
                   <Button variant="outline" size="sm" onClick={handleChangeApiKey}>
                      <KeyRound className="mr-2 h-4 w-4" /> Change API Key
                   </Button>
                </TooltipTrigger>
                <TooltipContent>
                   <p>Remove current API Key and enter a new one.</p>
                </TooltipContent>
             </Tooltip>
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
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <Select value={language} onValueChange={setLanguage} disabled={isActionInProgress}>
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
                          <Button variant="secondary" size="icon" onClick={handleStartRecording} disabled={isActionInProgress} aria-label="Start recording">
                            <Mic />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Start recording</p></TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                       <TooltipTrigger asChild>
                          <Button variant="secondary" size="icon" asChild aria-label="Upload audio file" disabled={isActionInProgress}>
                             <label htmlFor="file-upload" className={isActionInProgress ? 'cursor-not-allowed' : 'cursor-pointer'}>
                              {isTranscribing ? <Loader2 className="animate-spin"/> : <Upload />}
                              <input id="file-upload" type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} disabled={isActionInProgress}/>
                             </label>
                          </Button>
                       </TooltipTrigger>
                       <TooltipContent><p>Upload Audio File</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="relative">
              <Input
                type="text"
                placeholder="Enter note title here..."
                className="text-lg font-semibold pr-12"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                disabled={isActionInProgress}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground" onClick={handleSuggestTitle} disabled={isActionInProgress || !editorContent}>
                    {isSuggestingTitle ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Suggest Title (AI)</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Textarea
              placeholder="Your transcript will appear here. You can also type directly."
              className="flex-grow min-h-[400px] text-base p-4 rounded-lg shadow-inner bg-background/50"
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              disabled={isActionInProgress}
            />
            <div className="flex justify-end gap-2">
               <Button variant="outline" onClick={handleNewNote} disabled={isActionInProgress}>
                  <FilePlus className="mr-2 h-4 w-4" />
                  New Note
               </Button>
               <Button onClick={handleSaveNote} className="bg-accent hover:bg-accent/90" disabled={isActionInProgress}>
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
                <CardDescription>You have {notes.length} notes. Notes are saved in your browser.</CardDescription>
              </CardHeader>
              <div className="px-4 pb-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search notes..." 
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
              </div>
              <Separator />
              <CardContent className="p-0 flex-grow">
                <ScrollArea className="h-[500px]">
                  <div className="p-4 space-y-2">
                    {notes.length > 0 && filteredNotes.length === 0 ? (
                      <div className="text-center text-muted-foreground py-10">
                        No notes found for "{searchQuery}".
                      </div>
                    ) : notes.length === 0 ? (
                      <div className="text-center text-muted-foreground py-10">No notes saved yet.</div>
                    ) : (
                      filteredNotes.map(note => (
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
