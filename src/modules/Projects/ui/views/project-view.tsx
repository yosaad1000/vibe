"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { EyeIcon, CodeIcon, CrownIcon } from "lucide-react";

import { Fragment } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { FileExplorer } from "@/components/file-explorer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";

import { FragmentWeb } from "../components/fragment-web";
import { ProjectHeader } from "../components/project-header";
import { MessagesContainer } from "../components/message-container";

interface Props {
  projectId: string;
};

export const ProjectView = ({ projectId }: Props) => {
  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
  const [tabState, setTabState] = useState<"chat" | "preview" | "code">("preview");
  const isMobile = useIsMobile();

  // On mobile, if tab state is "chat" initially but preview is default, let's just use tabState
  // But wait, if they are on mobile, maybe default to "chat"? We can just let tabState be "chat" if mobile, but we handle it via useEffect or just let it stay whatever it is.

  const chatPanel = (
    <div className="flex flex-col h-full min-h-0">
      <Suspense fallback={<p>Loading project...</p>}>
        <ProjectHeader projectId={projectId} />
      </Suspense>
      <Suspense fallback={<p>Loading messages...</p>}>
        <MessagesContainer
          projectId={projectId}
          activeFragment={activeFragment}
          setActiveFragment={setActiveFragment}
        />
      </Suspense>
    </div>
  );

  const previewCodePanel = (
    <Tabs
      className="h-full flex flex-col"
      defaultValue="preview"
      value={tabState === "chat" && !isMobile ? "preview" : tabState} // Force valid tab on desktop
      onValueChange={(value) => setTabState(value as "chat" | "preview" | "code")}
    >
      <div className="w-full flex items-center p-2 border-b gap-x-2 shrink-0">
        <TabsList className="h-8 p-0 border rounded-md">
          {isMobile && (
            <TabsTrigger value="chat" className="rounded-md">
              <span>Chat</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="preview" className="rounded-md">
            <EyeIcon className="w-4 h-4 mr-2 hidden md:block" /> <span>Demo</span>
          </TabsTrigger>
          <TabsTrigger value="code" className="rounded-md">
            <CodeIcon className="w-4 h-4 mr-2 hidden md:block" /> <span>Code</span>
          </TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-x-2">
          <Button asChild size="sm" variant="default" className="hidden md:flex">
            <Link href="/pricing">
              <CrownIcon className="w-4 h-4 mr-2" /> Upgrade
            </Link>
          </Button>
          <UserControl />
        </div>
      </div>
      
      {isMobile && (
        <TabsContent value="chat" className="flex-1 min-h-0 m-0 overflow-hidden">
          {chatPanel}
        </TabsContent>
      )}

      <TabsContent value="preview" className="flex-1 min-h-0 m-0 overflow-hidden">
        {!!activeFragment && <FragmentWeb data={activeFragment} />}
      </TabsContent>
      <TabsContent value="code" className="flex-1 min-h-0 m-0 overflow-hidden">
        {!!activeFragment?.files && (
          <FileExplorer
            files={activeFragment.files as { [path: string]: string }}
          />
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="h-screen">
      {isMobile ? (
        previewCodePanel
      ) : (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            defaultSize={35}
            minSize={20}
            className="flex flex-col min-h-0"
          >
            {chatPanel}
          </ResizablePanel>
          <ResizableHandle className="hover:bg-primary transition-colors" />
          <ResizablePanel
            defaultSize={65}
            minSize={50}
            className="flex flex-col min-h-0"
          >
            {previewCodePanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
};
