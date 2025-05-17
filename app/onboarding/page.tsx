"use client"

import { useEffect } from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

const expertiseLevels = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "expert", label: "Expert" },
]

const productTypes = [
  { id: "electronics", label: "Electronics" },
  { id: "software", label: "Software" },
  { id: "services", label: "Services" },
  { id: "physical", label: "Physical Products" },
  { id: "digital", label: "Digital Products" },
  { id: "other", label: "Other" },
]

const evaluationCriteria = [
  { id: "quality", label: "Quality" },
  { id: "value", label: "Value for Money" },
  { id: "usability", label: "Usability" },
  { id: "innovation", label: "Innovation" },
  { id: "performance", label: "Performance" },
  { id: "design", label: "Design" },
  { id: "sustainability", label: "Sustainability" },
  { id: "support", label: "Customer Support" },
]

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [expertise, setExpertise] = useState("")
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([])
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([])
  const [customCriteria, setCustomCriteria] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updateUserPreferences, completeOnboarding, user, isLoading } = useAuth()
  const router = useRouter()

  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/signin")
    }
  }, [user, isLoading, router])

  // Redirect if onboarding already completed
  useEffect(() => {
    if (user?.onboardingCompleted) {
      router.push("/dashboard")
    }
  }, [user, router])

  // Initialize from existing preferences if available
  useEffect(() => {
    if (user?.preferences) {
      if (user.preferences.expertise) {
        setExpertise(user.preferences.expertise)
      }
      if (user.preferences.productTypes) {
        setSelectedProductTypes(user.preferences.productTypes)
      }
      if (user.preferences.evaluationCriteria) {
        // Filter out any custom criteria (not in our predefined list)
        const standardCriteria = user.preferences.evaluationCriteria.filter((c) =>
          evaluationCriteria.some((ec) => ec.id === c),
        )

        // Find any custom criteria
        const custom = user.preferences.evaluationCriteria.find((c) => !evaluationCriteria.some((ec) => ec.id === c))

        setSelectedCriteria(standardCriteria)
        if (custom) {
          setCustomCriteria(custom)
        }
      }
    }
  }, [user])

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      // Save preferences and complete onboarding
      try {
        setIsSubmitting(true)
        setError(null)

        const preferences = {
          expertise,
          productTypes: selectedProductTypes,
          evaluationCriteria: [...selectedCriteria, ...(customCriteria ? [customCriteria] : [])],
        }

        await updateUserPreferences(preferences)
        await completeOnboarding()
      } catch (err) {
        setError("Failed to save preferences. Please try again.")
        console.error(err)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleProductTypeToggle = (id: string) => {
    setSelectedProductTypes((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handleCriteriaToggle = (id: string) => {
    setSelectedCriteria((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to AI Evaluator</h1>
        <p className="text-muted-foreground">Let's personalize your experience with a few quick questions</p>
      </div>

      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>
            Step {step} of {totalSteps}
          </span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>What's your level of expertise?</CardTitle>
            <CardDescription>This helps us tailor the evaluation process to your knowledge level</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={expertise} onValueChange={setExpertise} className="space-y-3">
              {expertiseLevels.map((level) => (
                <div key={level.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={level.id} id={level.id} />
                  <Label htmlFor={level.id} className="cursor-pointer">
                    {level.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack} disabled={step === 1}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleNext} disabled={!expertise}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>What types of products do you evaluate?</CardTitle>
            <CardDescription>Select all that apply to your evaluation needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {productTypes.map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.id}
                    checked={selectedProductTypes.includes(type.id)}
                    onCheckedChange={() => handleProductTypeToggle(type.id)}
                  />
                  <Label htmlFor={type.id} className="cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleNext} disabled={selectedProductTypes.length === 0}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>What evaluation criteria are important to you?</CardTitle>
            <CardDescription>Select the criteria you typically use when evaluating products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {evaluationCriteria.map((criterion) => (
                <div key={criterion.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={criterion.id}
                    checked={selectedCriteria.includes(criterion.id)}
                    onCheckedChange={() => handleCriteriaToggle(criterion.id)}
                  />
                  <Label htmlFor={criterion.id} className="cursor-pointer">
                    {criterion.label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-criteria">Add custom criteria (optional)</Label>
              <Input
                id="custom-criteria"
                placeholder="Enter your own evaluation criteria"
                value={customCriteria}
                onChange={(e) => setCustomCriteria(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleNext} disabled={selectedCriteria.length === 0 || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Complete <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
