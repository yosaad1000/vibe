'use client';

import { useState} from 'react';
import { useTRPC } from '@/trpc/client';
import { useMutation ,useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


export default function Home() {
  const trpc = useTRPC();
  const {data:messages} = useQuery(trpc.messages.getmany.queryOptions());
  const message = useMutation(trpc.messages.create.mutationOptions({}));
  const [value, setvalue] = useState("");




  // Fetch all projects for the sidebar

  // Sync messages and sandboxUrl when project loads


  // Auto-scroll to bottom on new messages

  // Send a message




  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}

        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Vibe</h1>
        </div>
        <div className='p-4 max-w-7xl mx-auto'>

          <Input value={value} onChange={(e) => setvalue(e.target.value)} placeholder="Enter your name" />

          <Button onClick={() => message.mutate({ content: value })}>
            Invoke BG Job
          </Button>

          <div className="mt-4">
            <h2 className="text-lg font-bold mb-2">Messages</h2>
            <ul className="space-y-2">
              {messages?.map((msg) => (
                <li key={msg.id} className="p-2 border rounded">
                  <strong>{msg.role}:</strong> {msg.content}
                </li>
              ))}
            </ul>
          </div>
        </div>
    </div>
  );
}
