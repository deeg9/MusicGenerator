import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resend } from '@/lib/resend';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  message: z.string().min(1, 'Message is required').max(5000),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = contactSchema.safeParse(body);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
  }

  const { name, email, message } = result.data;

  const replyTo = email || undefined;
  const fromLine = email ? `${name} <${email}>` : name;

  const { error } = await resend.emails.send({
    from: 'Notevra Contact <hello@notevra.net>',
    to: ['hello@notevra.net'],
    subject: `Contact form: ${name}`,
    replyTo,
    text: `From: ${fromLine}\n\n${message}`,
  });

  if (error) {
    console.error('Resend contact error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
