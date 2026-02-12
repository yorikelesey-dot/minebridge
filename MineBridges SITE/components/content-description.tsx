import { sanitizeHTML } from '@/lib/transformers';

interface ContentDescriptionProps {
  html: string;
}

/**
 * ContentDescription component
 * Displays sanitized HTML content with dark theme styling
 * Uses Tailwind Typography's prose-invert for automatic dark theme adaptation
 * 
 * @param html - Raw HTML string (will be sanitized before rendering)
 */
export function ContentDescription({ html }: ContentDescriptionProps) {
  const sanitizedHTML = sanitizeHTML(html);
  
  return (
    <div 
      className="prose prose-invert prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
}
