'use client';

import { useState } from 'react';
import { useTRPC } from '@/trpc/client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { useRouter } from "next/navigation";


export default function Home() {
  const router = useRouter();
  const [value, setvalue] = useState("");
  const trpc = useTRPC();
  const createProject = useMutation(trpc.projects.create.mutationOptions({
    onError: (error) => {
      toast.error(error.message)
    },
    onSuccess:(data) => {
      router.push(`/projects/${data.id}`);
    },

  }));




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

        <Input value={value} onChange={(e) => setvalue(e.target.value)} />

        <Button
          disabled={createProject.isPending}
          onClick={() => createProject.mutate({ content: value })}>
          Invoke BG Job
        </Button>


      </div>
    </div>
  );
}
