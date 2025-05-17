"use client"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UrlInput } from "@/components/url-input"
import { InitialAssessment } from "@/components/initial-assessment"
import { SummaryGeneration } from "@/components/summary-generation"
import ProtectedRoute from "@/components/protected-route"
import { UserCircle, Settings, LogOut } from "lucide-react"

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Evaluation Tool</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.displayName || user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.preferences?.expertise || "User"}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-10 px-4 max-w-5xl">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-4">
              <UserCircle className="h-12 w-12 text-primary" />
              <div>
                <CardTitle>Welcome back, {user?.displayName || "User"}!</CardTitle>
                <CardDescription>Your personalized AI evaluation dashboard is ready</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-medium mb-1">Expertise Level</h3>
                <p className="text-sm">{user?.preferences?.expertise || "Not specified"}</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-medium mb-1">Product Types</h3>
                <p className="text-sm">{user?.preferences?.productTypes?.join(", ") || "Not specified"}</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-medium mb-1">Evaluation Criteria</h3>
                <p className="text-sm">{user?.preferences?.evaluationCriteria?.join(", ") || "Not specified"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="url-input" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url-input">1. Information Gathering</TabsTrigger>
            <TabsTrigger value="assessment">2. Initial Assessment</TabsTrigger>
            <TabsTrigger value="summary">3. Summary Generation</TabsTrigger>
          </TabsList>
          <TabsContent value="url-input">
            <UrlInput />
          </TabsContent>
          <TabsContent value="assessment">
            <InitialAssessment />
          </TabsContent>
          <TabsContent value="summary">
            <SummaryGeneration />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
