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

export default function SignUp() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { signUp, isLoading, user } = useAuth()
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    try {
      await signUp(email, password, name)

      // Redirect will be handled by the auth state listener
      router.push("/onboarding")
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/email-already-in-use":
            setError("An account with this email already exists.")
            break
          case "auth/invalid-email":
            setError("Invalid email address format.")
            break
          case "auth/weak-password":
            setError("Password is too weak. Please choose a stronger password.")
            break
          default:
            setError("An error occurred during sign up. Please try again.")
        }
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
    }
  }

  const goToSignIn = () => {
    router.push("/auth/signin")
  }

  const formFields = {
    header: "Create an Account",
    subHeader: "Sign up to start using AI Evaluator",
    fields: [
      {
        label: "Name",
        required: true,
        type: "text",
        placeholder: "Enter your full name",
        onChange: (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      },
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
        placeholder: "Create a password (min. 6 characters)",
        onChange: (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
      },
    ],
    submitButton: isLoading ? "Creating account..." : "Create account",
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

        <AuthTabs formFields={formFields} goTo={goToSignIn} handleSubmit={handleSubmit} />

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <button onClick={goToSignIn} className="text-primary hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </section>
  )
}
