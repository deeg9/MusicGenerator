# Notera Brand Kit

Design language reference for the team. Adapted from Notera's visual identity for a music generation app.

## Fonts

| Role | Family | Weights | Usage |
|------|--------|---------|-------|
| Body | DM Sans | 400, 500, 600, 700 | All body text, UI labels, buttons |
| Headings | Libre Baskerville | 400, 700 | h1, h2, h3 headings |
| Mono | Geist Mono | 400 | Code snippets, captions, technical values |

## Color Tokens

| Token | Light | Dark |
|-------|-------|------|
| background | hsl(210 30% 98%) | hsl(220 20% 8%) |
| foreground | hsl(220 20% 20%) | hsl(210 20% 95%) |
| primary | hsl(200 80% 50%) | hsl(200 80% 65%) |
| primary-foreground | hsl(0 0% 100%) | hsl(220 20% 8%) |
| accent | hsl(48 95% 55%) | hsl(48 95% 60%) |
| accent-foreground | hsl(220 20% 20%) | hsl(220 20% 8%) |
| secondary | hsl(45 90% 92%) | hsl(220 15% 15%) |
| secondary-foreground | hsl(220 20% 20%) | hsl(210 20% 95%) |
| muted | hsl(210 20% 94%) | hsl(220 15% 18%) |
| muted-foreground | hsl(220 10% 45%) | hsl(220 10% 55%) |
| destructive | hsl(0 84% 60%) | hsl(0 84% 65%) |
| card | hsl(0 0% 100%) | hsl(220 15% 12%) |
| card-foreground | hsl(220 20% 20%) | hsl(210 20% 95%) |
| border | hsl(210 20% 90%) | hsl(220 15% 20%) |
| ring | hsl(200 80% 50%) | hsl(200 80% 65%) |
| input | hsl(210 20% 90%) | hsl(220 15% 20%) |

## Radius

| Token | Value |
|-------|-------|
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 24px |

## Effects

- **Glassmorphic cards**: `bg-card/80 backdrop-blur-sm`
- **Subtle shadows**: `shadow-sm` for cards, `shadow-md` for elevated elements
- **Transitions**: `transition-colors duration-150` on interactive elements

## Icons

- **Library**: Lucide React (`lucide-react`)
- **Style**: Stroke width 1.5–2, consistent sizing

## Dark Mode

- Default via `prefers-color-scheme: dark`
- No manual toggle UI (deferred)
- Dark mode is the primary design target
