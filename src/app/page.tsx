"use client";

import dynamic from "next/dynamic";

const GraphExplorer = dynamic(() => import("@/components/GraphExplorer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen w-screen bg-[#0a0a0f] text-amber-400 text-xl">
      Loading the web of belief...
    </div>
  ),
});

export default function Home() {
  return <GraphExplorer />;
}
