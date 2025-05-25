import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChatbotBuilderPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Chatbot Builder</h1>
        <p className="text-muted-foreground">Create and manage your automated chatbots</p>
      </div>

      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl mb-2">🚧 Under Construction</CardTitle>
            <CardDescription>
              This feature is currently being developed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The chatbot builder functionality will be available soon. 
              Stay tuned for updates!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}