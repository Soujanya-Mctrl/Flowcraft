export const formatSuccessResponse = <T>(data: T, message?: string) => {
  return {
    success: true,
    data,
    message,
  };
};

export const formatErrorResponse = (
  code: string,
  message: string,
  details?: any
) => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
};

export const parseJSON = (str: string): any => {
  try {
    let cleanStr = str.trim();
    // Remove markdown codeblock wrapping
    const jsonBlockPattern = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const blockMatch = cleanStr.match(jsonBlockPattern);
    if (blockMatch && blockMatch[1]) {
      cleanStr = blockMatch[1].trim();
    }

    // Fix for specific Groq hallucination: {"{
    if (cleanStr.startsWith('{"{')) {
      cleanStr = '{' + cleanStr.substring(3);
    }
    if (cleanStr.startsWith('"{')) {
      cleanStr = cleanStr.substring(1);
    }
    if (cleanStr.endsWith('}"')) {
      cleanStr = cleanStr.substring(0, cleanStr.length - 1);
    }

    // Try finding the first { and last }
    const start = cleanStr.indexOf('{');
    const end = cleanStr.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end >= start) {
      cleanStr = cleanStr.substring(start, end + 1);
    }

    const result = JSON.parse(cleanStr);

    // AI models often over-escape newlines when outputting JSON containing markdown blocks
    // This safely unescapes literal '\\n' into actual newlines so Mermaid can parse it
    if (result && typeof result.chat === 'string') {
      result.chat = result.chat.replace(/\\n/g, '\n').replace(/\\r/g, '');
      result.chat = sanitizeMermaid(result.chat);
    }

    return result;
  } catch (e) {
    console.error("JSON parsing error:", e);
    
    // Fallback: Manual extraction to handle unescaped newlines inside JSON string values
    try {
      let title = "";
      let chat = "";

      // Extract title
      const titleMatch = str.match(/"title"\s*:\s*"((?:\\"|[^"])*?)"/);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1];
      }

      // Extract chat: find everything after "chat": " up to the last " before }
      const chatMatch = str.match(/"chat"\s*:\s*"([\s\S]*?)"\s*}/);
      if (chatMatch && chatMatch[1]) {
        chat = chatMatch[1];
        // Replace safely against LLM bad escapes
        chat = chat.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\r/g, '');
        chat = sanitizeMermaid(chat);
      }

      if (title || chat) {
        return { title, chat };
      }
    } catch (err) {
      console.error("Manual regex extraction failed:", err);
    }
    
    // Return empty object instead of null to prevent destructuring from throwing TypeError
    return {};
  }
};

export const sanitizePrompt = (prompt: string): string => {
  return prompt.trim().replace(/\s+/g, " ");
};

export const buildConversationContext = (
  conversationHistory: any[]
): string => {
  if (!conversationHistory || conversationHistory.length === 0) {
    return "";
  }

  const context = conversationHistory
    .map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      return `${role}: ${msg.content}`;
    })
    .join("\n\n");

  return `\n\nPrevious conversation:\n${context}\n\n`;
};

export const sanitizeMermaid = (code: string): string => {
  if (!code) return code;

  let sanitized = code;

  // 1. Fix common bracket/quote hallucinations in node definitions
  // Surgical fix: match a valid opening/closing pair and then strip any extra trailing closing characters
  // Fix id["Text"]] or id[Text]] -> id["Text"] or id[Text]
  sanitized = sanitized.replace(/(\b\w+\b\s*\[(?:".*?"|[^\]]+)\])\]+/g, '$1');
  // Fix id{Text}} or id{"Text"}} -> id{Text} or id{"Text"}
  sanitized = sanitized.replace(/(\b\w+\b\s*\{(?:"[^"]*"|[^\}]+)\})\}+/g, '$1');
  // Fix id(Text)) or id("Text")) -> id(Text) or id("Text")
  sanitized = sanitized.replace(/(\b\w+\b\s*\((?:"[^"]*"|[^\)]+)\)\))+/g, '$1');
  // Fix id([Text])) or id(["Text"])) -> id([Text])
  sanitized = sanitized.replace(/(\b\w+\b\s*\(\[\s*(.*?)\s*\]\)\s*)\)+/g, '$1');

  // 2. Fix arrow label hallucinations: --> |Label|> -> --> |Label|
  // Also handle ==> and other arrow types
  sanitized = sanitized.replace(/([-=]+>)\s*\|(.*?)\|\s*>\s*/g, '$1 |$2| ');

  // 3. Fix labels containing parentheses that the AI forgot to quote properly
  // This is a common failure. Mermaid breaks if it sees () inside unquoted labels.
  // We look for id[Some(Text)] and turn it into id["Some(Text)"]
  sanitized = sanitized.replace(/(\w+)\s*\[\s*([^"\[\]\(\)\n]*\([^"\[\]\n]*\)[^"\[\]\(\)\n]*)\s*\]/g, '$1["$2"]');
  
  // 4. Remove any loose backticks or markdown artifacts that might remain
  // Occasionally AI outputs ```mermaid ... ``` inside the chat field instead of just the code.
  // We already handle this in parsing, but this is a final cleanup for the code itself.
  sanitized = sanitized.replace(/```mermaid\n?/g, '').replace(/```/g, '');

  return sanitized.trim();
};
