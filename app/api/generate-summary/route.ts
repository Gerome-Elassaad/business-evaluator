import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

interface AssessmentCriterion {
  name: string;
  rating: number;
  notes: string;
}

interface SummaryRequest {
  criteria: AssessmentCriterion[];
}

interface SummaryResponse {
  summary: string;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

export async function POST(request: Request): Promise<NextResponse<SummaryResponse | ErrorResponse>> {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  
  try {
    console.info(`[${requestId}] Processing summary generation request`);

    // Parse and validate request body with type safety
    const body = await request.json() as Partial<SummaryRequest>;
    const { criteria } = body;

    // Validate input with specific error messages
    if (!criteria) {
      console.warn(`[${requestId}] Missing criteria in request`);
      return NextResponse.json({ 
        error: "Assessment criteria are required" 
      }, { 
        status: 400 
      });
    }

    if (!Array.isArray(criteria)) {
      console.warn(`[${requestId}] Invalid criteria format - expected array, received ${typeof criteria}`);
      return NextResponse.json({ 
        error: "Criteria must be provided as an array" 
      }, { 
        status: 400 
      });
    }

    if (criteria.length === 0) {
      console.warn(`[${requestId}] Empty criteria array provided`);
      return NextResponse.json({ 
        error: "At least one assessment criterion is required" 
      }, { 
        status: 400 
      });
    }

    // Validate criteria structure
    const invalidCriteria = criteria.filter(
      criterion => 
        !criterion.name || 
        typeof criterion.rating !== 'number' || 
        criterion.rating < 0 || 
        criterion.rating > 10 ||
        !criterion.notes
    );

    if (invalidCriteria.length > 0) {
      console.warn(`[${requestId}] Invalid criteria structure detected, ${invalidCriteria.length} invalid items`);
      return NextResponse.json({ 
        error: "All criteria must have a name, valid rating (0-10), and notes" 
      }, { 
        status: 400 
      });
    }

    // Retrieve API key from secure environment
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      console.error(`[${requestId}] Gemini API key not configured`);
      return NextResponse.json(
        { error: "Server configuration error" }, 
        { status: 500 }
      );
    }

    try {
      // Initialize the Gemini AI client
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          }
        ],
      });
      
      console.debug(`[${requestId}] Configured Gemini model with safety settings for ${criteria.length} criteria`);

      // Construct a detailed prompt for Gemini
      const prompt = `
        Based on the following assessment criteria, generate a comprehensive
        evaluation summary in Markdown format. Include an overview, key strengths,
        areas for improvement, a recommendation, and an overall rating.
        
        Assessment criteria:
        ${JSON.stringify(criteria, null, 2)}
        
        Format your response as a Markdown document with these sections:
        1. Overview - A brief summary of the product based on the criteria
        2. Key Strengths - At least 3 bullet points highlighting the highest-rated aspects
        3. Areas for Improvement - At least 2 bullet points noting the lower-rated aspects
        4. Recommendation - A concise recommendation for potential users
        5. Overall Rating - A single numerical score out of 10 that represents the average with contextual weighting

        Ensure the writing is balanced, evidence-based, and professional. Use Markdown formatting features like headers (# and ##), bold, and bullet points.
        Focus on actionable insights rather than just restating the criteria.
      `;

      // Measure API call performance
      const apiStartTime = performance.now();
      
      // Generate content with Gemini
      const result = await model.generateContent(prompt);
      const response = result.response;
      const textResponse = response.text();
      
      const apiDuration = performance.now() - apiStartTime;
      
      console.info(`[${requestId}] Gemini API response received in ${apiDuration.toFixed(2)}ms, length: ${textResponse.length}`);

      // Validate the response format
      if (!textResponse || textResponse.length < 100) {
        console.warn(`[${requestId}] Insufficient response from Gemini API, length: ${textResponse.length}`);
        return NextResponse.json({ summary: getSimulatedSummary(criteria) });
      }

      // Return the generated summary
      return NextResponse.json({ summary: textResponse });
      
    } catch (aiError) {
      // Handle AI-specific errors
      console.error(`[${requestId}] Error generating content with Gemini:`, 
        aiError instanceof Error ? 
          { name: aiError.name, message: aiError.message } : 
          aiError
      );
      
      // Graceful degradation to simulated response
      return NextResponse.json({ 
        summary: getSimulatedSummary(criteria) 
      });
    }
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[${requestId}] Unhandled error in generate-summary API:`, 
      error instanceof Error ? 
        { message: error.message, stack: error.stack } : 
        error
    );
    
    return NextResponse.json(
      { 
        error: "Failed to generate summary",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      }, 
      { status: 500 }
    );
  } finally {
    // Log request completion metrics
    const duration = performance.now() - startTime;
    console.info(`[${requestId}] Summary generation request completed in ${duration.toFixed(2)}ms`);
  }
}

/**
 * Generates a simulated evaluation summary based on criteria
 * Used as a fallback when AI generation fails
 * 
 * @param criteria - The assessment criteria to base the summary on
 * @returns A markdown formatted summary
 */
function getSimulatedSummary(criteria: AssessmentCriterion[]): string {
  // Calculate average rating for overall score
  const totalRating = criteria.reduce((sum, item) => sum + item.rating, 0);
  const averageRating = (totalRating / criteria.length).toFixed(1);
  
  // Find strengths (highest rated criteria)
  const strengths = [...criteria]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, Math.min(3, criteria.length));
  
  // Find improvement areas (lowest rated criteria)
  const improvements = [...criteria]
    .sort((a, b) => a.rating - b.rating)
    .slice(0, Math.min(2, criteria.length));

  return `# Product Evaluation Summary

## Overview
This product demonstrates ${strengths[0]?.notes.toLowerCase() || "positive qualities"} with a balanced profile across assessed criteria. The evaluation highlights specific strengths while noting areas that could benefit from further development.

## Key Strengths
${strengths.map(item => `- **${item.name}**: ${item.notes}`).join('\n')}

## Areas for Improvement
${improvements.map(item => `- **${item.name}**: ${item.notes}`).join('\n')}

## Recommendation
This product is recommended for users who prioritize ${strengths[0]?.name.toLowerCase() || "quality"} and ${strengths[1]?.name.toLowerCase() || "performance"}. Potential users should weigh these advantages against the ${improvements[0]?.name.toLowerCase() || "limitations"} noted in this assessment.

## Overall Rating: ${averageRating}/10`;
}