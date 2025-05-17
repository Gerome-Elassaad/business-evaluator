"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ExternalLink, Check } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/auth-context"
import { extractProductInfo } from "@/app/actions"

export function UrlInput() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const router = useRouter()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url) {
      setError("Please enter a URL")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setSuccess(false)
      setExtractedText(null)

      // Start progress animation
      setProgress(10)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 5
        })
      }, 1000)

      // Extract product info using the server action
      const productInfo = await extractProductInfo(url)

      clearInterval(progressInterval)
      setProgress(100)

      // Format the extracted info as text
      const formattedText = `
Product Name: ${productInfo.productName}

Description:
${productInfo.description}

Specifications:
${Object.entries(productInfo.specifications)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

Reviews:
${productInfo.reviews.map((review: any) => `- Rating: ${review.rating}/5 - "${review.comment}"`).join("\n")}
      `

      setExtractedText(formattedText)
      setSuccess(true)

      // Store the extracted info in sessionStorage
      sessionStorage.setItem("extractedText", formattedText)
      sessionStorage.setItem("productInfo", JSON.stringify(productInfo))

      // Navigate to the assessment tab after a short delay
      setTimeout(() => {
        router.push("?tab=assessment")
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Information Gathering</CardTitle>
        <CardDescription>Enter a product URL to extract relevant information for evaluation</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Text extracted successfully! Redirecting to assessment...</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              Product URL
            </label>
            <div className="flex w-full items-center space-x-2">
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/product"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Extract
                  </>
                )}
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Extracting and analyzing content... This may take a moment.
              </p>
            </div>
          )}
        </form>

        {extractedText && (
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-medium">Extracted Text Preview:</h3>
            <div className="bg-muted p-3 rounded-md max-h-60 overflow-y-auto text-sm">
              <pre className="whitespace-pre-wrap">{extractedText}</pre>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">How it works:</h3>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>Enter the URL of the product you want to evaluate</li>
            <li>Our system extracts and analyzes text from the URL</li>
            <li>The system identifies product details, specifications, and reviews</li>
            <li>The extracted information is processed and prepared for assessment based on your preferences</li>
          </ol>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Personalized for {user?.preferences?.expertise || "your"} expertise level
      </CardFooter>
    </Card>
  )
}
