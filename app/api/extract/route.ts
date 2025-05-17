import { NextResponse } from "next/server"
import { extractTextFromUrl } from "@/lib/extract-text"

export async function POST(request: Request) {
  try {
    const { url, preferences } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch (e) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    console.log(`Processing extraction request for URL: ${url}`)
    console.log(`User preferences:`, preferences)

    // Extract text from the URL using Google Cloud Natural Language API
    // Pass user preferences to customize the extraction
    const extractedText = await extractTextFromUrl(url, preferences)

    console.log(`Extraction completed successfully for URL: ${url}`)
    return NextResponse.json({ success: true, text: extractedText })
  } catch (error) {
    console.error("Error in extract API:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
