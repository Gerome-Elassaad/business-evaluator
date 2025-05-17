import type { google } from "@google-cloud/language/build/protos/protos"
import { JSDOM } from "jsdom"
import { Readability } from "@mozilla/readability"

// Type for the Google Cloud Natural Language API response
type AnalyzeEntitiesResponse = {
  entities: google.cloud.language.v1.IEntity[]
}

type AnalyzeSyntaxResponse = {
  sentences: google.cloud.language.v1.ISentence[]
  tokens: google.cloud.language.v1.IToken[]
}

type UserPreferences = {
  expertise?: string
  productTypes?: string[]
  evaluationCriteria?: string[]
}

/**
 * Fetches HTML content from a URL
 */
async function fetchHtmlFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ProductEvaluationBot/1.0)",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }

    return await response.text()
  } catch (error) {
    console.error("Error fetching HTML:", error)
    throw new Error(`Failed to fetch content from URL: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extracts main content from HTML using Readability
 */
function extractMainContent(html: string): string {
  try {
    const dom = new JSDOM(html)
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article || !article.textContent) {
      throw new Error("Failed to extract main content from HTML")
    }

    return article.textContent
  } catch (error) {
    console.error("Error extracting main content:", error)
    throw new Error(`Failed to extract main content: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Analyzes entities in text using Google Cloud Natural Language API
 */
async function analyzeEntities(text: string): Promise<AnalyzeEntitiesResponse> {
  try {
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY

    if (!apiKey) {
      throw new Error("Google Cloud API key is not configured")
    }

    const url = `https://language.googleapis.com/v1/documents:analyzeEntities?key=${apiKey}`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document: {
          type: "PLAIN_TEXT",
          content: text,
        },
        encodingType: "UTF8",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google Cloud API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error analyzing entities:", error)
    throw new Error(`Failed to analyze entities: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Analyzes syntax in text using Google Cloud Natural Language API
 */
async function analyzeSyntax(text: string): Promise<AnalyzeSyntaxResponse> {
  try {
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY

    if (!apiKey) {
      throw new Error("Google Cloud API key is not configured")
    }

    const url = `https://language.googleapis.com/v1/documents:analyzeSyntax?key=${apiKey}`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document: {
          type: "PLAIN_TEXT",
          content: text,
        },
        encodingType: "UTF8",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google Cloud API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error analyzing syntax:", error)
    throw new Error(`Failed to analyze syntax: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extracts product information from entities, customized by user preferences
 */
function extractProductInfo(
  entities: google.cloud.language.v1.IEntity[],
  preferences?: UserPreferences,
): Record<string, any> {
  const productInfo: Record<string, any> = {
    name: "",
    price: "",
    features: [],
    specifications: {},
    description: "",
  }

  // Process entities to extract product information
  for (const entity of entities) {
    const type = entity.type
    const name = entity.name
    const salience = entity.salience

    if (!name) continue

    // Extract product name (usually a CONSUMER_GOOD with high salience)
    if (type === "CONSUMER_GOOD" && salience && salience > 0.1 && !productInfo.name) {
      productInfo.name = name
    }

    // Extract price (PRICE entities)
    if (type === "PRICE" && !productInfo.price) {
      productInfo.price = name
    }

    // Extract features and specifications
    if (type === "OTHER" && entity.mentions && entity.mentions.length > 0) {
      // Check if it looks like a feature
      if (name.includes(" ") && name.length > 10) {
        productInfo.features.push(name)
      }
      // Check if it looks like a specification
      else if (name.includes(":")) {
        const [key, value] = name.split(":").map((s) => s.trim())
        if (key && value) {
          productInfo.specifications[key] = value
        }
      }
    }
  }

  // Prioritize features based on user preferences if available
  if (preferences?.evaluationCriteria && productInfo.features.length > 0) {
    // Sort features to prioritize those that match user's evaluation criteria
    productInfo.features.sort((a: string, b: string) => {
      const aMatchesPreference = preferences.evaluationCriteria!.some((criterion) =>
        a.toLowerCase().includes(criterion.toLowerCase()),
      )
      const bMatchesPreference = preferences.evaluationCriteria!.some((criterion) =>
        b.toLowerCase().includes(criterion.toLowerCase()),
      )

      if (aMatchesPreference && !bMatchesPreference) return -1
      if (!aMatchesPreference && bMatchesPreference) return 1
      return 0
    })
  }

  return productInfo
}

/**
 * Extracts sentences that are likely to be product descriptions
 */
function extractDescriptions(sentences: google.cloud.language.v1.ISentence[], preferences?: UserPreferences): string[] {
  const descriptions: string[] = []

  for (const sentence of sentences) {
    const text = sentence.text?.content
    if (!text) continue

    // Look for sentences that are likely to be descriptions
    // (longer sentences that don't look like reviews or navigation elements)
    if (
      text.length > 40 &&
      !text.includes("click") &&
      !text.includes("login") &&
      !text.includes("sign in") &&
      !text.includes("cookie") &&
      !text.includes("review by")
    ) {
      descriptions.push(text)
    }
  }

  // If user has preferences, prioritize sentences that mention their criteria
  if (preferences?.evaluationCriteria && descriptions.length > 0) {
    return descriptions.sort((a, b) => {
      const aRelevanceScore = preferences.evaluationCriteria!.reduce((score, criterion) => {
        return score + (a.toLowerCase().includes(criterion.toLowerCase()) ? 1 : 0)
      }, 0)

      const bRelevanceScore = preferences.evaluationCriteria!.reduce((score, criterion) => {
        return score + (b.toLowerCase().includes(criterion.toLowerCase()) ? 1 : 0)
      }, 0)

      return bRelevanceScore - aRelevanceScore
    })
  }

  return descriptions
}

/**
 * Main function to extract text from a URL using Google Cloud Natural Language API
 * Now accepts user preferences to customize the extraction
 */
export async function extractTextFromUrl(url: string, preferences?: UserPreferences): Promise<string> {
  try {
    console.log(`Extracting text from URL: ${url}`)
    console.log(`Using user preferences:`, preferences)

    // Step 1: Fetch HTML content from the URL
    const html = await fetchHtmlFromUrl(url)
    console.log("HTML content fetched successfully")

    // Step 2: Extract main content using Readability
    const mainContent = extractMainContent(html)
    console.log("Main content extracted successfully")

    // Step 3: Analyze entities using Google Cloud Natural Language API
    // We'll use a smaller portion of the text for API efficiency
    const truncatedContent = mainContent.slice(0, 5000)
    const entityResponse = await analyzeEntities(truncatedContent)
    console.log(`Analyzed ${entityResponse.entities?.length || 0} entities`)

    // Step 4: Analyze syntax to get sentences
    const syntaxResponse = await analyzeSyntax(truncatedContent)
    console.log(`Analyzed ${syntaxResponse.sentences?.length || 0} sentences`)

    // Step 5: Extract product information from entities, using preferences
    const productInfo = extractProductInfo(entityResponse.entities || [], preferences)

    // Step 6: Extract descriptions from sentences, using preferences
    const descriptions = extractDescriptions(syntaxResponse.sentences || [], preferences)

    // Step 7: Combine the information into a structured format
    // Customize the output based on user expertise level
    const isExpert = preferences?.expertise === "expert" || preferences?.expertise === "advanced"

    const extractedText = `
Product Name: ${productInfo.name || "Unknown Product"}
${productInfo.price ? `Price: ${productInfo.price}` : ""}

Product Description:
${descriptions.slice(0, isExpert ? 5 : 3).join("\n\n") || productInfo.description || "No description available."}

Key Features:
${
  productInfo.features.length > 0
    ? productInfo.features
        .slice(0, isExpert ? 10 : 5)
        .map((f: string) => `- ${f}`)
        .join("\n")
    : "- No features extracted."
}

Technical Specifications:
${
  Object.keys(productInfo.specifications).length > 0
    ? Object.entries(productInfo.specifications)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join("\n")
    : "- No specifications extracted."
}

${
  isExpert
    ? `
Additional Information:
${mainContent.slice(0, 2000)}...
`
    : `
Additional Information:
${mainContent.slice(0, 1000)}...
`
}
    `

    console.log("Text extraction completed successfully")
    return extractedText
  } catch (error) {
    console.error("Error in extractTextFromUrl:", error)
    throw new Error(`Failed to extract text from URL: ${error instanceof Error ? error.message : String(error)}`)
  }
}
