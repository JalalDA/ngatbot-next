import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Bot, Zap, Brain, Database, Users, Shield, ArrowRight, Check, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LandingPage() {
  const { user } = useAuth();

  // Redirect to dashboard if already logged in
  if (user) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>;
  }

  const features = [
    {
      icon: Zap,
      title: "Setup dalam Menit",
      description: "Cukup masukkan token bot Telegram Anda dan bot AI langsung siap digunakan. Tidak perlu coding atau konfigurasi rumit."
    },
    {
      icon: Brain,
      title: "AI-Powered Conversations",
      description: "Didukung OpenAI GPT-4o untuk percakapan yang natural dan respon yang cerdas terhadap pertanyaan pengguna."
    },
    {
      icon: Database,
      title: "Knowledge Base Kustom",
      description: "Latih bot Anda dengan konten, dokumen, dan informasi produk sendiri untuk memberikan jawaban yang personal."
    }
  ];

  const plans = [
    {
      name: "Free",
      price: "Gratis",
      description: "Cocok untuk mencoba platform",
      features: [
        "1,000 responses per bulan",
        "1 bot",
        "Basic knowledge base",
        "Community support"
      ],
      cta: "Mulai Gratis",
      popular: false
    },
    {
      name: "Pro",
      price: "Rp 299,000",
      description: "Untuk penggunaan profesional",
      features: [
        "10,000 responses",
        "Unlimited bots",
        "Advanced knowledge base",
        "Priority support",
        "Analytics dashboard"
      ],
      cta: "Upgrade ke Pro",
      popular: true
    },
    {
      name: "Business",
      price: "Rp 550,000",
      description: "Untuk bisnis dan tim",
      features: [
        "20,000 responses",
        "Unlimited bots",
        "Team collaboration",
        "Premium support",
        "Custom integrations",
        "API access"
      ],
      cta: "Upgrade ke Business",
      popular: false
    }
  ];

  const testimonials = [
    {
      name: "Ahmad Rifai",
      role: "E-commerce Owner",
      content: "BotBuilder membantu saya mengotomatisasi customer service toko online. Sekarang bot AI saya bisa menjawab pertanyaan produk 24/7!",
      rating: 5
    },
    {
      name: "Sarah Dewi",
      role: "Digital Marketer",
      content: "Platform yang sangat mudah digunakan. Dalam 10 menit saja bot Telegram saya sudah bisa menjawab FAQ dengan cerdas.",
      rating: 5
    },
    {
      name: "Budi Santoso",
      role: "Startup Founder",
      content: "Fitur knowledge base-nya luar biasa. Bot saya bisa memahami konteks bisnis dan memberikan jawaban yang akurat.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-2 rounded-full mb-6">
              <Zap className="h-4 w-4" />
              AI-Powered Telegram Bots
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Buat Bot Telegram{" "}
              <span className="bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Cerdas AI
              </span>{" "}
              dalam Hitungan Menit
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Platform no-code untuk membuat bot Telegram yang didukung AI. 
              Cukup masukkan token bot dan knowledge base Anda, biarkan AI menghandle sisanya.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/auth">
                <Button size="lg" className="btn-primary px-8 py-4 text-lg font-medium h-14 group">
                  Mulai Gratis Sekarang
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-4 text-lg h-14 border-2"
              >
                <Bot className="mr-2 h-5 w-5" />
                Lihat Demo
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Setup 5 menit
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                No coding required
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Free trial
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Fitur Lengkap untuk Bot AI Anda
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Semua yang Anda butuhkan untuk membuat bot Telegram yang cerdas dan responsif, 
              dari setup hingga deployment.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group">
                <div className="bg-card p-8 rounded-2xl border hover:shadow-lg transition-all duration-300 h-full">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Paket Harga yang Fleksibel
            </h2>
            <p className="text-xl text-muted-foreground">
              Pilih paket yang sesuai dengan kebutuhan bisnis Anda
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`relative bg-card rounded-2xl border p-8 ${
                  plan.popular 
                    ? 'ring-2 ring-primary shadow-lg scale-105' 
                    : 'hover:shadow-lg'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-full">
                      Paling Populer
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold mb-2">{plan.price}</div>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href="/auth" className="block">
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'btn-primary' 
                        : 'btn-secondary'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Dipercaya oleh Ribuan Pengguna
            </h2>
            <p className="text-xl text-muted-foreground">
              Lihat apa kata mereka tentang BotBuilder
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-card p-6 rounded-xl border">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current text-yellow-500" />
                  ))}
                </div>
                
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  "{testimonial.content}"
                </p>
                
                <div>
                  <div className="font-medium">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Siap Membuat Bot AI Anda?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Bergabunglah dengan ribuan pengguna yang sudah merasakan kemudahan BotBuilder. 
            Mulai gratis hari ini!
          </p>
          
          <Link href="/auth">
            <Button size="lg" className="btn-primary px-8 py-4 text-lg font-medium h-14 group">
              Mulai Sekarang - Gratis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          
          <p className="text-sm text-muted-foreground mt-4">
            Tidak perlu kartu kredit • Setup 5 menit • Support 24/7
          </p>
        </div>
      </section>
    </div>
  );
}