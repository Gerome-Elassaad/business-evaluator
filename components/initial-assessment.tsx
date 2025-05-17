"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Loader2, Save } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { analyzeProduct } from "@/app/actions"

type CriteriaType = {
  name: string
  description: string
  rating: number
  notes: string
}

export function InitialAssessment() {
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string>("")
  const [productInfo, setProductInfo] = useState<any>(null)
  const [criteria, setCriteria] = useState<CriteriaType[]>([
    {
      name: "Quality",
      description: "Overall product quality and craftsmanship",
      rating: 0,
      notes: "",
    },
    {
      name: "Value",
      description: "Price relative to quality and competitors",
      rating: 0,
      notes: "",
    },
    {
      name: "Innovation",
      description: "Uniqueness and innovative features",
      rating: 0,
      notes: "",
    },
    {
      name: "Usability",
      description: "Ease of use and user experience",
      rating: 0,
      notes: "",
    },
  ])
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    // Try to get the extracted text and product info from sessionStorage
    const storedText = sessionStorage.getItem("extractedText")
    const storedProductInfo = sessionStorage.getItem("productInfo")

    if (storedText) {
      setExtractedText(storedText)
    }

    if (storedProductInfo) {
      setProductInfo(JSON.parse(storedProductInfo))
    }

    // Customize criteria based on user preferences
    if (user?.preferences?.evaluationCriteria?.length) {
      const userCriteria = user.preferences.evaluationCriteria.map((criterion) => {
        // Map standard criteria
        const standardCriterion = evaluationCriteriaMap[criterion]
        if (standardCriterion) {
          return {
            name: standardCriterion.label,
            description: standardCriterion.description,
            rating: 0,
            notes: "",
          }
        }

        // Handle custom criteria
        return {
          name: criterion,
          description: "Custom evaluation criterion",
          rating: 0,
          notes: "",
        }
      })

      // Only update if we have user criteria
      if (userCriteria.length > 0) {
        setCriteria(userCriteria)
      }
    }
  }, [user])

  const handleGenerateAssessment = async () => {
    if (!productInfo) {
      setError("No product information available. Please go back to the URL input step.")
      return
    }

    try {
      setIsGenerating(true)
      setError(null)

      // Get criteria names as a comma-separated string
      const criteriaString = criteria.map((c) => c.name).join(", ")

      // Use the server action to analyze the product
      const analysis = await analyzeProduct(productInfo, criteriaString)

      // Update criteria with AI-generated assessments
      if (analysis.ratings) {
        setCriteria((prevCriteria) =>
          prevCriteria.map((c) => {
            const match = analysis.ratings[c.name.toLowerCase()]
            if (match) {
              return {
                ...c,
                rating: match.score,
                notes: match.reasoning,
              }
            }
            return c
          }),
        )
      }

      // Store the analysis in sessionStorage for the summary step
      sessionStorage.setItem("analysis", JSON.stringify(analysis))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCriteriaChange = (index: number, field: keyof CriteriaType, value: any) => {
    const updatedCriteria = [...criteria]
    updatedCriteria[index] = { ...updatedCriteria[index], [field]: value }
    setCriteria(updatedCriteria)
  }

  const handleSaveAndContinue = () => {
    // Save the assessment to sessionStorage
    sessionStorage.setItem("assessment", JSON.stringify(criteria))

    // Navigate to the summary tab
    router.push("?tab=summary")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Initial Assessment</CardTitle>
        <CardDescription>
          Review and refine the AI-generated assessment based on the extracted information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="extracted-text">
          <TabsList className="mb-4">
            <TabsTrigger value="extracted-text">Extracted Text</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
          </TabsList>

          <TabsContent value="extracted-text">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea value={extractedText} readOnly className="min-h-[300px] font-mono text-sm" />
                <Button onClick={handleGenerateAssessment} disabled={isGenerating || !extractedText}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Assessment
                    </>
                  ) : (
                    "Generate Initial Assessment"
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="assessment">
            <div className="space-y-6">
              {criteria.map((criterion, index) => (
                <div key={criterion.name} className="space-y-2 pb-4 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{criterion.name}</h3>
                      <p className="text-sm text-muted-foreground">{criterion.description}</p>
                    </div>
                    <div className="text-xl font-bold">{criterion.rating}/10</div>
                  </div>

                  <Slider
                    value={[criterion.rating]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(value) => handleCriteriaChange(index, "rating", value[0])}
                  />

                  <Textarea
                    placeholder={`Notes about ${criterion.name.toLowerCase()}`}
                    value={criterion.notes}
                    onChange={(e) => handleCriteriaChange(index, "notes", e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => router.push("/?tab=url-input")}>
          Back to URL Input
        </Button>
        <Button onClick={handleSaveAndContinue}>
          <Save className="mr-2 h-4 w-4" />
          Save and Continue
        </Button>
      </CardFooter>
    </Card>
  )
}

// Mapping of criteria IDs to display names and descriptions
const evaluationCriteriaMap: Record<string, { label: string; description: string }> = {
  quality: {
    label: "Quality",
    description: "Overall product quality and craftsmanship",
  },
  value: {
    label: "Value",
    description: "Price relative to quality and competitors",
  },
  usability: {
    label: "Usability",
    description: "Ease of use and user experience",
  },
  innovation: {
    label: "Innovation",
    description: "Uniqueness and innovative features",
  },
  performance: {
    label: "Performance",
    description: "Speed, efficiency, and reliability",
  },
  design: {
    label: "Design",
    description: "Aesthetics and visual appeal",
  },
  sustainability: {
    label: "Sustainability",
    description: "Environmental impact and longevity",
  },
  support: {
    label: "Customer Support",
    description: "Quality of customer service and support",
  },
}
