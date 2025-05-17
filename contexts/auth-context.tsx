"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

type User = {
  uid: string
  email: string | null
  displayName: string | null
  preferences?: {
    expertise?: string
    productTypes?: string[]
    evaluationCriteria?: string[]
  }
  onboardingCompleted: boolean
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  updateUserPreferences: (preferences: Partial<User["preferences"]>) => Promise<void>
  completeOnboarding: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true)
      if (firebaseUser) {
        // Get user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))

          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              preferences: userData.preferences || {},
              onboardingCompleted: userData.onboardingCompleted || false,
            })
          } else {
            // Create user document if it doesn't exist
            await setDoc(doc(db, "users", firebaseUser.uid), {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              onboardingCompleted: false,
              createdAt: serverTimestamp(),
            })

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              onboardingCompleted: false,
            })
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // Auth state listener will handle setting the user
    } catch (error) {
      console.error("Sign in error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), {
        email: firebaseUser.email,
        displayName: name,
        onboardingCompleted: false,
        createdAt: serverTimestamp(),
      });

      // Update profile with display name
      await updateProfile(firebaseUser, { displayName: name });

      // Auth state listener will handle setting the user
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      // Auth state listener will handle setting the user to null
      router.push("/auth/signin")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const updateUserPreferences = async (preferences: Partial<User["preferences"]>) => {
    if (!user) return

    try {
      const userRef = doc(db, "users", user.uid)

      // Get current preferences
      const userDoc = await getDoc(userRef)
      const currentPreferences = userDoc.data()?.preferences || {}

      // Update preferences
      await updateDoc(userRef, {
        preferences: {
          ...currentPreferences,
          ...preferences,
        },
      })

      // Update local state
      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          ...preferences,
        },
      })
    } catch (error) {
      console.error("Update preferences error:", error)
      throw error
    }
  }

  const completeOnboarding = async () => {
    if (!user) return

    try {
      const userRef = doc(db, "users", user.uid)

      // Update onboarding status
      await updateDoc(userRef, {
        onboardingCompleted: true,
      })

      // Update local state
      setUser({
        ...user,
        onboardingCompleted: true,
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Complete onboarding error:", error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    setIsLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error("Password reset error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateUserPreferences,
    completeOnboarding,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
