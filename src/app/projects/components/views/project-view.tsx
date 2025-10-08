"use client";
import { Suspense, useState } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { MessagesContainer } from "../ui/messages-container";
import { Fragment } from "@/generated/prisma";
import { ProjectHeader } from "../ui/project-header";
import { FragmentWeb } from "../ui/fragment-web";


interface Props {
    projectId: string;
};

export const ProjectView = ({ projectId }: Props) => {
    const [activeFragment ,setActiveFragment] = useState<Fragment | null>(null);

return (
    <div className="h-screen">
       <ResizablePanelGroup direction={"horizontal"}>
        <ResizablePanel
        defaultSize={35}
        minSize={30}
        className="flex flex-col min-h-0">
        <Suspense fallback={<p>Loading project...</p>}>
            <ProjectHeader projectId={projectId} />
        </Suspense>

        <Suspense fallback={<p>Loading messages...</p>}>
        <MessagesContainer 
        projectId={projectId}
        activeFragment={activeFragment}
        setActiveFragment={setActiveFragment} />
        </Suspense>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
        defaultSize={65}
        minSize={50}
        >
         {!!activeFragment && <FragmentWeb data={activeFragment} />}
        </ResizablePanel>
       </ResizablePanelGroup>
    </div>
);

};