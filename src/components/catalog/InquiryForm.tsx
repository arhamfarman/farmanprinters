"use client";

import { useRef, useState } from "react";
import { createInquiry } from "@/server/actions/inquiry-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Posts straight to the `createInquiry` server action via the form's
 * `action` prop (native progressive-enhancement form submission) so file
 * attachments work without any client-side upload plumbing — Next.js
 * serializes the multipart FormData for us.
 */
export function InquiryForm({ categoryId }: { categoryId?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(formData: FormData) {
    await createInquiry(formData);
    formRef.current?.reset();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="rounded-md border border-border bg-muted/40 p-4 text-sm">
        Thanks — we&apos;ve received your request and will be in touch shortly.
      </p>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
      {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
      <label className="text-sm">
        Name
        <Input name="contactName" required />
      </label>
      <label className="text-sm">
        Company (optional)
        <Input name="companyName" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Phone
          <Input name="phone" type="tel" />
        </label>
        <label className="text-sm">
          Email
          <Input name="email" type="email" />
        </label>
      </div>
      <label className="text-sm">
        What do you need?
        <textarea name="message" required rows={4} className="w-full rounded-md border border-border bg-background p-2 text-sm" />
      </label>
      <label className="text-sm">
        Reference artwork / photos (optional)
        <input type="file" name="attachments" multiple accept="image/*,.pdf,.ai,.cdr,.psd" className="block w-full text-sm" />
      </label>
      <Button type="submit" className="self-start">Submit Request</Button>
    </form>
  );
}
