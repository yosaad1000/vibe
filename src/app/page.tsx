'use client';

import { useState, useEffect, useRef } from 'react';
import { useTRPC } from '@/trpc/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


type Message = { role: string; content: string };

export default function Home() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invoke = useMutation(trpc.invoke.mutationOptions({}));
  const [value, setvalue] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch all projects for the sidebar
  const { data: projects } = useQuery(trpc.projects.getAll.queryOptions());

  // Create a new project
  const createProject = useMutation(trpc.projects.create.mutationOptions({
    onSuccess: (project) => {
      setSelectedProjectId(project.id);
      setOptimisticMessages([]);
      setSandboxUrl(null);
      queryClient.invalidateQueries(trpc.projects.getAll.queryOptions());
    },
  }));

  // Load selected project with messages
  const { data: projectData } = useQuery({
    ...trpc.projects.getbyId.queryOptions({ id: selectedProjectId! }),
    enabled: !!selectedProjectId,
  });

  // Sync messages and sandboxUrl when project loads
  useEffect(() => {
    if (projectData) {
      setOptimisticMessages((projectData.messages ?? []).map(m => ({ role: m.role, content: m.content })));
      setSandboxUrl(projectData.sandboxUrl ?? null);
    }
  }, [projectData]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [optimisticMessages.length]);

  // Send a message
  const sendMessage = useMutation(trpc.messages.send.mutationOptions({
    onMutate: () => {
      setOptimisticMessages(prev => [...prev, { role: 'user', content: inputValue }]);
      setInputValue('');
    },
    onSuccess: (data) => {
      setOptimisticMessages(prev => [...prev, { role: 'assistant', content: data.message.content }]);
      setSandboxUrl(data.sandboxUrl);
    },
  }));

  const handleSend = () => {
    if (!inputValue.trim() || !selectedProjectId || sendMessage.isPending) return;
    sendMessage.mutate({ projectId: selectedProjectId, content: inputValue });
  };

  const handleNewProject = () => {
    const name = `Project ${Date.now()}`;
    createProject.mutate({ name });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Vibe</h1>
        </div>
        <div className='p-4 max-w-7xl mx-auto'>

          <Input value={value} onChange={(e) => setvalue(e.target.value)} placeholder="Enter your name" />

          <Button onClick={() => invoke.mutate({ text: value })}>
            Invoke BG Job
          </Button>

        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <button
            onClick={handleNewProject}
            className="w-full mb-2 px-4 py-2 text-left rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            + New Project
          </button>
          <div className="mt-4 space-y-2">
            {projects?.map(project => (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={`px-4 py-2 rounded-lg cursor-pointer hover:bg-accent ${selectedProjectId === project.id ? 'bg-accent' : ''}`}
              >
                {project.name}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {!selectedProjectId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a project or create a new one to get started
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="max-w-3xl mx-auto space-y-4">
                {optimisticMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-lg px-4 py-2 max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.role === 'assistant' && (msg.content.startsWith('<!DOCTYPE') || msg.content.startsWith('<html'))
                        ? 'Generated app ✓'
                        : msg.content}
                    </div>
                  </div>
                ))}
                {sendMessage.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2 text-muted-foreground">Generating...</div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="border-t p-4">
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    disabled={sendMessage.isPending}
                    placeholder="Describe what you want to build..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sendMessage.isPending}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Preview Panel */}
      <aside className="w-96 border-l flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Preview</h2>
        </div>
        <div className="flex-1">
          {sandboxUrl ? (
            <iframe src={sandboxUrl} className="w-full h-full border-0" />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No preview available
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
