"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { AuthTabs, Ripple, TechOrbitDisplay } from "@/components/ui/modern-animated-sign-in"
import { AlertCircle, CheckCircle } from "lucide-react"
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
]

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { resetPassword, isLoading } = useAuth()
  const router = useRouter()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/invalid-email":
            setError("Invalid email address format.")
            break
          case "auth/user-not-found":
            // For security reasons, don't reveal that the user doesn't exist
            setSuccess(true)
            break
          default:
            setError("An error occurred. Please try again.")
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
    header: "Reset Password",
    subHeader: "Enter your email to receive a password reset link",
    fields: [
      {
        label: "Email",
        required: true,
        type: "email",
        placeholder: "Enter your email address",
        onChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      },
    ],
    submitButton: isLoading ? "Sending..." : "Send reset link",
    textVariantButton: "Back to sign in",
  }

  return (
    <section className="flex max-lg:justify-center min-h-screen">
      {/* Left Side */}
      <div className="flex flex-col justify-center w-1/2 max-lg:hidden">
        <Ripple mainCircleSize={100} />
        <TechOrbitDisplay iconsArray={iconsArray} text="Reset Password" />
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

        {success && (
          <Alert className="mb-4 max-w-md bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Password reset link has been sent to your email address.</AlertDescription>
          </Alert>
        )}

        <AuthTabs formFields={formFields} goTo={goToSignIn} handleSubmit={handleSubmit} />
      </div>
    </section>
  )
}
