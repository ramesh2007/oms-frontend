import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      duration={4500}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border/70 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:font-sans group-[.toaster]:p-3.5 group-[.toaster]:gap-2.5",
          description: "group-[.toast]:text-muted-foreground text-xs leading-relaxed font-normal mt-0.5",
          title: "font-bold text-sm tracking-tight text-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-semibold rounded-lg text-xs",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-semibold rounded-lg text-xs",
          closeButton: "group-[.toast]:border-border/40 group-[.toast]:bg-background/80 group-[.toast]:hover:bg-accent group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground transition-colors",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
