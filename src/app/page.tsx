
import { useTRPC } from "@/trpc/client";
import { HydrationBoundary, useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Client } from "./client";
import { getQueryClient, trpc } from "@/trpc/server";
const Page  = async () => {
const queryClient = getQueryClient();
void queryClient.prefetchQuery(trpc.createAi.queryOptions({ text: "Yash"}));

  return (
    <HydrationBoundary state={undefined}>
      <Suspense fallback={<p>Loading....</p>}>
      <Client />
      </Suspense>
    </HydrationBoundary>
  );
}

export default Page; 