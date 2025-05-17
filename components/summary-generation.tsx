"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Download, Copy, RefreshCw, Check } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { generateSummary } from "@/app/actions"

export function SummaryGeneration() {
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string>("")
  const [analysis, setAnalysis] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Generate summary based on the analysis in sessionStorage
    const generateInitialSummary = async () => {
      try {
        setIsLoading(true)

        // Get analysis from sessionStorage
        const storedAnalysis = sessionStorage.getItem("analysis")
        const storedAssessment = sessionStorage.getItem("assessment")

        if (!storedAnalysis && !storedAssessment) {
          setError("No analysis found. Please complete the assessment step first.")
          return
        }

        // Use analysis if available, otherwise use assessment
        let analysisData
        if (storedAnalysis) {
          analysisData = JSON.parse(storedAnalysis)
          setAnalysis(analysisData)
        } else if (storedAssessment) {
          // Convert assessment format to analysis format
          const assessment = JSON.parse(storedAssessment)
          analysisData = {
            ratings: {},
            strengths: [],
            weaknesses: [],
            overallScore: 0,
          }

          let totalScore = 0
          assessment.forEach((criterion: any) => {
            analysisData.ratings[criterion.name.toLowerCase()] = {
              score: criterion.rating,
              reasoning: criterion.notes,
            }
            totalScore += criterion.rating

            // Add to strengths if rating is 7 or higher
            if (criterion.rating >= 7) {
              analysisData.strengths.push(`${criterion.name}: ${criterion.notes}`)
            }

            // Add to weaknesses if rating is 5 or lower
            if (criterion.rating <= 5) {
              analysisData.weaknesses.push(`${criterion.name}: ${criterion.notes}`)
            }
          })

          // Calculate overall score
          analysisData.overallScore = Math.round((totalScore / assessment.length) * 10) / 10
          setAnalysis(analysisData)
        }

        // Generate summary using the server action
        const summaryText = await generateSummary(analysisData)
        setSummary(summaryText)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    generateInitialSummary()
  }, [])

  const handleRegenerate = async () => {
    if (!analysis) {
      setError("No analysis data available. Please complete the assessment step first.")
      return
    }

    try {
      setIsRegenerating(true)
      setError(null)

      // Generate a new summary using the server action
      const summaryText = await generateSummary(analysis)
      setSummary(summaryText)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([summary], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "product-evaluation-summary.md"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Summary Generation</CardTitle>
            <CardDescription>Review and download the AI-generated evaluation summary</CardDescription>
          </div>
          <Badge variant="outline" className="ml-2">
            Markdown
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download as Markdown
              </Button>

              <Button variant="outline" onClick={handleRegenerate} disabled={isRegenerating}>
                {isRegenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate Summary
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => router.push("/?tab=assessment")}>
          Back to Assessment
        </Button>
        <Button onClick={() => router.push("/?tab=url-input")}>Start New Evaluation</Button>
      </CardFooter>
    </Card>
  )
}
