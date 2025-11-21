import { ProjectView } from "../ui/views/project-view";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";

const Page = async ({params}: {
  params: Promise<{ projectsId: string }>;
}) => {
    const { projectsId: projectId } = await params;
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(trpc.messages.getMany.queryOptions({
        projectId
    }))
    void queryClient.prefetchQuery(trpc.projects.getOne.queryOptions({
        id:projectId
    }))
    console.log(projectId);
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ErrorBoundary fallback={<p>Error!</p>}>
                <Suspense fallback={<p>loading...</p>}>
                    <ProjectView projectId={projectId}/>
                </Suspense>
            </ErrorBoundary>
        </HydrationBoundary>
    )
}

export default Page;