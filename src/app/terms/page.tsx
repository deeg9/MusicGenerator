import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Notevra',
  description: 'The terms and conditions governing your use of Notevra.',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-6 py-20 max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-foreground mb-4">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Effective date: March 15, 2026 &nbsp;·&nbsp; Last updated: March 15, 2026
      </p>

      {/* 1. Acceptance of Terms */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">1. Acceptance of Terms</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        These Terms of Service ("Terms") constitute a legally binding agreement between you and Notevra
        ("we," "us," or "our"), governing your access to and use of the Notevra website located at{' '}
        <a href="https://www.notevra.net" className="text-primary hover:underline">
          www.notevra.net
        </a>{' '}
        and all associated services (collectively, the "Service").
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        By creating an account, accessing, or using any part of our Service, you confirm that you have
        read, understood, and agree to be bound by these Terms. If you do not agree to all of these
        Terms, you may not use the Service. If you are using the Service on behalf of an organization,
        you agree to these Terms on behalf of that organization.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        You must be at least 13 years of age to use this Service. By agreeing to these Terms, you
        represent that you are at least 13 years old.
      </p>

      {/* 2. Service Description */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">2. Service Description</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Notevra is an AI-powered personalized song creation and delivery service. We enable you to:
      </p>
      <ul className="list-disc list-inside text-muted-foreground leading-relaxed mb-4 space-y-1">
        <li>Complete a guided quiz describing a person, occasion, relationship, and personal story.</li>
        <li>Receive an AI-generated, personalized song created from your responses.</li>
        <li>Play and download your generated song.</li>
        <li>Optionally send the song as a gift via email to a recipient.</li>
        <li>Access and manage your song library through your account dashboard.</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The Service uses artificial intelligence, including large language models and AI music generation
        models, to create song lyrics and audio. AI-generated output is probabilistic and may not always
        meet your expectations. Results may vary based on the information you provide.
      </p>

      {/* 3. User Accounts */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">3. User Accounts</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        You may use certain features of the Service without an account (anonymous song generation).
        Creating an account unlocks additional features including song history, dashboard access, and
        email delivery of songs.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        When you create an account, you agree to:
      </p>
      <ul className="list-disc list-inside text-muted-foreground leading-relaxed mb-4 space-y-1">
        <li>Provide accurate, current, and complete information.</li>
        <li>Maintain and promptly update your account information.</li>
        <li>Keep your password confidential and not share your credentials with others.</li>
        <li>Be responsible for all activity that occurs under your account.</li>
        <li>Notify us immediately of any unauthorized use of your account.</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        We reserve the right to suspend or terminate accounts that violate these Terms, provide false
        information, or engage in abusive behavior. You may close your account at any time by contacting
        us; however, termination does not relieve you of any obligations incurred prior to termination.
      </p>

      {/* 4. Acceptable Use */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">4. Acceptable Use</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        You agree to use Notevra only for lawful purposes and in accordance with these Terms. You must not:
      </p>
      <ul className="list-disc list-inside text-muted-foreground leading-relaxed mb-4 space-y-1">
        <li>
          Submit quiz responses or content that is hateful, harassing, threatening, defamatory,
          obscene, pornographic, or otherwise objectionable.
        </li>
        <li>
          Attempt to generate songs that target, denigrate, or harm specific individuals without
          their consent.
        </li>
        <li>
          Use the Service to generate content for commercial redistribution or resale without our
          written permission.
        </li>
        <li>
          Attempt to circumvent rate limits, quotas, or usage restrictions through automated scripts,
          bots, or other means.
        </li>
        <li>
          Interfere with or disrupt the integrity or performance of the Service or its underlying
          infrastructure.
        </li>
        <li>
          Attempt to gain unauthorized access to any part of the Service or its related systems.
        </li>
        <li>
          Use the Service in any manner that could violate applicable laws or regulations, including
          privacy laws, intellectual property laws, or anti-spam regulations.
        </li>
        <li>
          Misrepresent your identity or impersonate another person or entity.
        </li>
        <li>
          Use the Service to send unsolicited communications or spam.
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        We reserve the right to investigate and take appropriate legal action against anyone who, in our
        sole discretion, violates this provision, including removing offending content, suspending
        access, and reporting to law enforcement authorities.
      </p>

      {/* 5. Intellectual Property */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">5. Intellectual Property</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong>Platform IP:</strong> The Notevra platform, including its software, user interface,
        design, logo, trademarks, and all technology underlying the Service, is owned by Notevra and
        protected by applicable intellectual property laws. You may not copy, modify, distribute, sell,
        or create derivative works from our platform without our express written permission.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong>Your generated songs:</strong> We grant you a personal, non-exclusive, royalty-free
        license to use, play, download, and share songs generated for you through the Service for
        personal, non-commercial purposes. This license includes sharing songs privately as gifts.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong>AI-generated content limitations:</strong> Songs generated by Notevra are produced
        using artificial intelligence. The legal landscape around AI-generated content ownership is
        evolving. We do not guarantee that AI-generated songs are free from copyright claims by third
        parties. You assume full responsibility for how you use generated songs beyond personal use.
        We recommend consulting legal counsel before using AI-generated music for commercial purposes.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong>Your quiz inputs:</strong> You retain ownership of any personal stories, descriptions,
        or other content you submit through our quiz. By submitting content, you grant us a limited
        license to process it through our AI systems for the sole purpose of generating your song.
        We do not use your personal stories to train AI models without your explicit consent.
      </p>

      {/* 6. Content Guidelines */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">6. Content Guidelines</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        All content submitted through the quiz must comply with these guidelines. Content must not:
      </p>
      <ul className="list-disc list-inside text-muted-foreground leading-relaxed mb-4 space-y-1">
        <li>Contain hate speech, slurs, or discriminatory language targeting individuals or groups.</li>
        <li>Describe, glorify, or solicit violence, self-harm, or illegal activity.</li>
        <li>Include sexually explicit material, particularly involving minors.</li>
        <li>
          Contain personal information about third parties without their consent (e.g., another
          person's contact details, financial information, or private health information).
        </li>
        <li>Attempt to deceive or manipulate our AI systems to produce prohibited content.</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        We reserve the right to refuse to generate songs from content that violates these guidelines
        and to remove or decline any submission without prior notice. Repeated violations may result
        in account suspension or termination.
      </p>

      {/* 7. Service Availability */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">7. Service Availability and Modifications</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        We strive to provide a reliable service, but we do not guarantee uninterrupted, error-free
        availability. The Service may be temporarily unavailable due to maintenance, technical issues,
        third-party service outages (including AI compute providers), or factors outside our control.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any
        time, with or without notice. We will make reasonable efforts to provide advance notice of
        significant changes or discontinuation. We shall not be liable to you or any third party for
        any modification, suspension, or discontinuation of the Service.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Song generation depends on third-party AI services. Generation times, quality, and availability
        may vary. We do not guarantee specific generation times or song quality outcomes.
      </p>

      {/* 8. Limitation of Liability */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">8. Disclaimer and Limitation of Liability</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong>Disclaimer of warranties:</strong> THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE"
        WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
        WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO
        NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR
        OTHER HARMFUL COMPONENTS.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong>Limitation of liability:</strong> TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW,
        NOTEVRA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
        DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF OR INABILITY TO
        USE THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        IN NO EVENT SHALL NOTEVRA'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM YOUR USE OF THE
        SERVICE EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO NOTEVRA IN THE 12 MONTHS PRECEDING THE
        CLAIM, OR (B) $50 USD.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Some jurisdictions do not allow the exclusion or limitation of certain warranties or liabilities,
        so some of the above limitations may not apply to you.
      </p>

      {/* 9. Indemnification */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">9. Indemnification</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        You agree to defend, indemnify, and hold harmless Notevra and its officers, directors,
        employees, contractors, agents, licensors, and suppliers from and against any claims,
        liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable
        attorneys' fees) arising out of or relating to:
      </p>
      <ul className="list-disc list-inside text-muted-foreground leading-relaxed mb-4 space-y-1">
        <li>Your violation of these Terms.</li>
        <li>Your use of the Service in a manner not authorized by these Terms.</li>
        <li>
          Any content you submit through the Service that infringes the rights of a third party or
          violates applicable law.
        </li>
        <li>Your violation of any applicable laws or regulations.</li>
      </ul>

      {/* 10. Governing Law */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">10. Governing Law and Dispute Resolution</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        These Terms shall be governed by and construed in accordance with the laws of the United States
        and the state of Delaware, without regard to conflict of law principles. You agree that any
        legal action or proceeding arising under these Terms shall be brought exclusively in the federal
        or state courts located in the United States.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Before initiating any formal legal proceedings, you agree to first contact us and attempt to
        resolve any dispute informally by providing written notice describing the nature of the dispute
        and your proposed resolution. We will attempt to resolve any dispute through good-faith
        negotiation within 30 days.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        If you are an EU consumer, you may also have the right to submit a complaint to your local
        consumer protection authority or use the EU Online Dispute Resolution platform.
      </p>

      {/* 11. Changes to Terms */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">11. Changes to These Terms</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        We reserve the right to modify these Terms at any time. When we make material changes, we will:
      </p>
      <ul className="list-disc list-inside text-muted-foreground leading-relaxed mb-4 space-y-1">
        <li>Update the "Last updated" date at the top of these Terms.</li>
        <li>Send an email notification to registered users for significant changes.</li>
        <li>Display a notice on our website for a reasonable period after the change.</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Your continued use of the Service after any changes to these Terms constitutes your acceptance
        of the revised Terms. If you disagree with the changes, you must stop using the Service. We
        encourage you to review these Terms periodically.
      </p>

      {/* 12. General Provisions */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">12. General Provisions</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong>Entire agreement:</strong> These Terms, together with our{' '}
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
        , constitute the entire agreement between you and Notevra regarding your use of the Service.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong>Severability:</strong> If any provision of these Terms is found to be unenforceable or
        invalid, that provision shall be limited or eliminated to the minimum extent necessary so that
        the remaining Terms shall remain in full force and effect.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong>Waiver:</strong> Our failure to enforce any right or provision of these Terms will not
        be considered a waiver of those rights.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong>Assignment:</strong> You may not assign or transfer these Terms or any rights hereunder
        without our prior written consent. We may freely assign these Terms in connection with a merger,
        acquisition, or sale of assets.
      </p>

      {/* 13. Contact */}
      <h2 className="font-display text-xl font-bold text-foreground mt-10 mb-3">13. Contact Us</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        If you have questions about these Terms of Service, please contact us:
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong>Notevra</strong><br />
        Website:{' '}
        <a href="https://www.notevra.net" className="text-primary hover:underline">
          www.notevra.net
        </a>
        <br />
        Contact form:{' '}
        <Link href="/contact" className="text-primary hover:underline">
          notevra.net/contact
        </Link>
      </p>

      <div className="border-t border-border mt-14 pt-8 text-sm text-muted-foreground">
        <p>
          Related:{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
