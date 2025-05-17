"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { AuthTabs, Ripple, TechOrbitDisplay } from "@/components/ui/modern-animated-sign-in"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Image from "next/image"
import { FirebaseError } from "firebase/app"

// Define the icons for the orbit display
const iconsArray = [
  {
    component: () => <Image width={100} height={100} src="/placeholder.svg?height=100&width=100" alt="AI" />,
    className: "size-[30px] border-none bg-transparent",
    duration: 20,
    delay: 20,
    radius: 100,
    path: false,
    reverse: false,
  },
  {
    component: () => <Image width={100} height={100} src="/placeholder.svg?height=100&width=100" alt="NLP" />,
    className: "size-[30px] border-none bg-transparent",
    duration: 20,
    delay: 10,
    radius: 100,
    path: false,
    reverse: false,
  },
  {
    component: () => <Image width={100} height={100} src="/placeholder.svg?height=100&width=100" alt="Evaluation" />,
    className: "size-[50px] border-none bg-transparent",
    radius: 210,
    duration: 20,
    path: false,
    reverse: false,
  },
]

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { signIn, isLoading, user } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  if (user) {
    if (!user.onboardingCompleted) {
      router.push("/onboarding")
    } else {
      router.push("/dashboard")
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      await signIn(email, password)

      // Redirect will be handled by the auth state listener
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/invalid-email":
            setError("Invalid email address format.")
            break
          case "auth/user-disabled":
            setError("This account has been disabled.")
            break
          case "auth/user-not-found":
          case "auth/wrong-password":
            setError("Invalid email or password. Please try again.")
            break
          default:
            setError("An error occurred during sign in. Please try again.")
        }
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
    }
  }

  const goToSignUp = () => {
    router.push("/auth/signup")
  }

  const goToForgotPassword = () => {
    router.push("/auth/forgot-password")
  }

  const formFields = {
    header: "Welcome to AI Evaluator",
    subHeader: "Sign in to your account to continue",
    fields: [
      {
        label: "Email",
        required: true,
        type: "email",
        placeholder: "Enter your email address",
        onChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      },
      {
        label: "Password",
        required: true,
        type: "password",
        placeholder: "Enter your password",
        onChange: (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
      },
    ],
    submitButton: isLoading ? "Signing in..." : "Sign in",
    textVariantButton: "Forgot password?",
  }

  return (
    <section className="flex max-lg:justify-center min-h-screen">
      {/* Left Side */}
      <div className="flex flex-col justify-center w-1/2 max-lg:hidden">
        <Ripple mainCircleSize={100} />
        <TechOrbitDisplay iconsArray={iconsArray} text="AI Evaluation Tool" />
      </div>

      {/* Right Side */}
      <div className="w-1/2 min-h-screen flex flex-col justify-center items-center max-lg:w-full max-lg:px-[10%]">
        {error && (
          <Alert variant="destructive" className="mb-4 max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AuthTabs formFields={formFields} goTo={goToForgotPassword} handleSubmit={handleSubmit} />

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button onClick={goToSignUp} className="text-primary hover:underline">
              Sign up
            </button>
          </p>
        </div>
      </div>
    </section>
  )
}
