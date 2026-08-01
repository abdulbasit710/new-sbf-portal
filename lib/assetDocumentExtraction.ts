export type ExtractedAssetFields = { assetOrMatchName: string; assetClass: string; geography: string; budget: string; contactDetails: string; notes: string };
const keys: (keyof ExtractedAssetFields)[] = ["assetOrMatchName", "assetClass", "geography", "budget", "contactDetails", "notes"];

export async function extractAssetDocument(file: File): Promise<ExtractedAssetFields> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured, so this document cannot be read automatically yet.");
  if (file.size > 20 * 1024 * 1024) throw new Error("The document is larger than the 20MB extraction limit.");
  if (!/pdf|image|text|word|officedocument/i.test(`${file.type} ${file.name}`)) throw new Error("Upload a PDF, image, text, or Word asset document.");
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({
    model: process.env.OPENAI_ASSISTANT_MODEL?.trim() || "gpt-4.1-mini",
    input: [{ role: "user", content: [{ type: "input_text", text: "Read this real-estate asset document. Extract only explicit facts. Return assetOrMatchName, assetClass, geography, budget (asking price/value), contactDetails, and concise notes. Use empty strings when absent and never guess." }, { type: "input_file", filename: file.name, file_data: `data:${file.type || "application/octet-stream"};base64,${base64}` }] }],
    text: { format: { type: "json_schema", name: "asset_document_fields", strict: true, schema: { type: "object", additionalProperties: false, properties: Object.fromEntries(keys.map((key) => [key, { type: "string" }])), required: keys } } },
  }) });
  const payload = await response.json() as { output_text?: string; error?: { message?: string }; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (!response.ok) throw new Error(payload.error?.message || "The document extraction service rejected this file.");
  const raw = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!raw) throw new Error("The document was read, but no asset fields were returned.");
  const parsed = JSON.parse(raw) as Partial<ExtractedAssetFields>;
  return Object.fromEntries(keys.map((key) => [key, String(parsed[key] || "").trim()])) as ExtractedAssetFields;
}
