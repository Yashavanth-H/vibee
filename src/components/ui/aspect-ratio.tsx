"use client"

// Fallback: inline aspect-ratio wrapper without external dependency
const AspectRatioPrimitive = {
  Root: ({ ratio = 1, children, ...props }: { ratio?: number; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) => (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: `${(1 / ratio) * 100}%`,
      }}
      {...props}
    >
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  ),
}

function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />
}

export { AspectRatio }
