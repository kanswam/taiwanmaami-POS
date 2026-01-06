/**
 * Converts plain text content to properly formatted HTML
 * Recognizes patterns like numbered sections, Q&A format, dates, etc.
 */
export function textToHtml(text: string): string {
  if (!text) return '';
  
  // If content already has HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }
  
  let html = text;
  
  // Split into paragraphs by double newlines or single newlines
  const paragraphs = html.split(/\n\n+|\n/).filter(p => p.trim());
  
  const formattedParagraphs = paragraphs.map(para => {
    const trimmed = para.trim();
    
    // Detect main headings (ALL CAPS with colon or specific patterns)
    if (/^[A-Z][A-Z\s&:]+$/.test(trimmed) && trimmed.length < 100) {
      return `<h1 class="text-2xl font-bold mt-8 mb-4">${trimmed}</h1>`;
    }
    
    // Detect section headings like "1. Agreement and Acceptance" or "1. Title"
    const sectionMatch = trimmed.match(/^(\d+)\.\s+([A-Z][^.]+)$/);
    if (sectionMatch && trimmed.length < 80) {
      return `<h2 class="text-xl font-semibold mt-8 mb-4">${trimmed}</h2>`;
    }
    
    // Detect subsection headings like "1.1 Subsection" or "2.1 Title"
    const subsectionMatch = trimmed.match(/^(\d+\.\d+)\s+(.+)$/);
    if (subsectionMatch && trimmed.length < 100) {
      return `<h3 class="text-lg font-medium mt-6 mb-3">${trimmed}</h3>`;
    }
    
    // Detect Q&A format like "Q1. Question here?"
    const qaMatch = trimmed.match(/^(Q\d+)\.\s+(.+)/);
    if (qaMatch) {
      return `<h3 class="text-lg font-semibold mt-6 mb-2">${trimmed}</h3>`;
    }
    
    // Detect "Effective Date:" or similar metadata
    if (/^(Effective Date|Last Updated|Version):/i.test(trimmed)) {
      return `<p class="text-sm text-muted-foreground mb-6">${trimmed}</p>`;
    }
    
    // Detect bullet points (lines starting with - or •)
    if (/^[-•]\s+/.test(trimmed)) {
      return `<li class="ml-4">${trimmed.replace(/^[-•]\s+/, '')}</li>`;
    }
    
    // Regular paragraph
    return `<p class="mb-4">${trimmed}</p>`;
  });
  
  // Wrap consecutive <li> elements in <ul>
  let result = formattedParagraphs.join('\n');
  result = result.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => {
    return `<ul class="list-disc pl-6 mb-4">\n${match}</ul>\n`;
  });
  
  return result;
}

/**
 * Formats Terms & Conditions style content with numbered sections
 * Also handles general content like About Us by detecting sentence patterns
 */
export function formatLegalContent(text: string): string {
  if (!text) return '';
  
  // If content already has HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }
  
  let html = text;
  
  // Check if content has numbered sections
  const hasNumberedSections = /\d+\.\s+[A-Z]/.test(html);
  
  if (hasNumberedSections) {
    // Add line breaks before major section numbers (1., 2., 3., etc.)
    html = html.replace(/\s+(\d+)\.\s+([A-Z])/g, '\n\n$1. $2');
    
    // Add line breaks before subsections (1.1, 2.1, etc.)
    html = html.replace(/\s+(\d+\.\d+)\s+/g, '\n\n$1 ');
  } else {
    // For non-numbered content, split by sentence patterns that indicate new paragraphs
    // Split on patterns like "Company Name is..." or "As a..." or "Complementing..." or "Supporting..."
    html = html.replace(/\.\s+(As a |Complementing |Supporting |Together,|Thamarai is |Our |We |The )/g, '.\n\n$1');
    
    // Also split on ALL CAPS phrases that look like headings
    html = html.replace(/([a-z.])\s+(THE [A-Z][A-Z\s]+:)/g, '$1\n\n$2');
  }
  
  // Add line breaks before Q&A
  html = html.replace(/\s+(Q\d+)\./g, '\n\n$1.');
  
  // Split and process
  const lines = html.split('\n\n').filter(l => l.trim());
  
  const formatted = lines.map(line => {
    const trimmed = line.trim();
    
    // ALL CAPS heading with colon (e.g., "THE HOUSE OF THAMARAI: CRAFTING...")
    if (/^THE [A-Z][A-Z\s]+:/.test(trimmed)) {
      const colonIndex = trimmed.indexOf(':');
      const heading = trimmed.substring(0, colonIndex + 1);
      const rest = trimmed.substring(colonIndex + 1).trim();
      return `<h2 class="text-xl font-semibold text-foreground mt-6 mb-4">${heading}</h2>\n<p class="mb-4">${rest}</p>`;
    }
    
    // Main section heading (e.g., "1. Agreement and Acceptance")
    if (/^\d+\.\s+[A-Z]/.test(trimmed) && !trimmed.includes('.1') && trimmed.split(' ').length < 10) {
      const match = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (match) {
        return `<h2 class="text-xl font-semibold text-foreground mt-8 mb-4">${match[1]}. ${match[2]}</h2>`;
      }
    }
    
    // Subsection (e.g., "1.1 These Terms form...")
    if (/^\d+\.\d+\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.\d+)\s+(.+)/);
      if (match) {
        return `<p class="mb-3"><strong>${match[1]}</strong> ${match[2]}</p>`;
      }
    }
    
    // Q&A heading
    if (/^Q\d+\./i.test(trimmed)) {
      return `<h3 class="text-lg font-semibold text-foreground mt-6 mb-2">${trimmed}</h3>`;
    }
    
    // Effective date / metadata
    if (/^(Effective Date|Last Updated|Regulatory Information|FSSAI|GSTIN)/i.test(trimmed)) {
      return `<p class="text-sm text-muted-foreground mb-4">${trimmed}</p>`;
    }
    
    // Regular paragraph
    return `<p class="mb-4">${trimmed}</p>`;
  });
  
  return formatted.join('\n');
}
