interface QuizCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function QuizCard({ title, subtitle, children }: QuizCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto bg-card rounded-2xl shadow-medium p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-base text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
