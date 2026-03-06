import { Star } from 'lucide-react';
import { TESTIMONIALS } from './data/landing-data';

export function TestimonialsSection() {
  return (
    <section id="reviews" className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          What our customers say
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Real songs, real moments, real reactions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TESTIMONIALS.map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-card rounded-xl p-6 shadow-subtle flex flex-col gap-4"
            >
              {/* Star rating */}
              <div className="flex gap-0.5">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 text-yellow-400 fill-current"
                    aria-hidden="true"
                  />
                ))}
              </div>
              {/* Quote */}
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              {/* Avatar + name */}
              <div className="flex items-center gap-3 mt-2">
                <div
                  className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground shrink-0"
                  aria-hidden="true"
                >
                  {testimonial.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {testimonial.relationship}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
