import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-robot text-white text-sm"></i>
                </div>
                <span className="text-xl font-bold text-slate-900">BotBuilder AI</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
              <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Docs</a>
              <Link href="/auth">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                  Login
                </Button>
              </Link>
              <Link href="/auth">
                <Button className="bg-primary text-white hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>

            <button className="md:hidden p-2">
              <i className="fas fa-bars text-slate-600"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
              Create AI-Powered<br />
              <span className="bg-gradient-to-r from-primary to-secondary-500 bg-clip-text text-transparent">
                Telegram Bots
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Build intelligent Telegram bots in minutes. Just provide your bot token and let our AI handle the conversations with your custom knowledge base.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" className="bg-primary text-white hover:bg-primary/90 px-8 py-4 text-lg">
                  Start Building Free
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-slate-300 text-slate-700 px-8 py-4 text-lg"
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything you need to build smart bots
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From setup to deployment, we've got you covered with powerful features and seamless integrations.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <i className="fas fa-bolt text-primary text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Quick Setup</h3>
              <p className="text-slate-600">
                Just paste your Telegram bot token and you're ready to go. No complex configuration required.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-secondary-500/10 rounded-lg flex items-center justify-center mb-6">
                <i className="fas fa-brain text-secondary-500 text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">AI-Powered</h3>
              <p className="text-slate-600">
                Powered by OpenAI GPT for natural conversations and intelligent responses to user queries.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-6">
                <i className="fas fa-database text-emerald-600 text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Custom Knowledge</h3>
              <p className="text-slate-600">
                Train your bot with your own content, documents, and product information for personalized responses.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
