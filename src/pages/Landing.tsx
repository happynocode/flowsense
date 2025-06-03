
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, BookOpen, Clock, Zap, Palette, Layout, Sparkles, Shield, Bot, Cpu, Database, Workflow, Users, Building2, TrendingUp, Star } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: <Bot className="h-8 w-8" />,
      title: "AI-Powered Automation",
      description: "Intelligent workflows that adapt and learn from your business patterns"
    },
    {
      icon: <Workflow className="h-8 w-8" />,
      title: "Smart Process Management",
      description: "Streamline complex operations with our advanced AI decision engine"
    },
    {
      icon: <Cpu className="h-8 w-8" />,
      title: "Neural Network Integration",
      description: "Leverage cutting-edge machine learning for predictive automation"
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "Intelligent Data Processing",
      description: "Transform raw data into actionable insights with AI-driven analytics"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Enterprise Security",
      description: "Military-grade encryption with AI-powered threat detection"
    },
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: "Predictive Intelligence",
      description: "Anticipate business needs with our advanced forecasting algorithms"
    }
  ];

  const customers = [
    { name: "TechCorp", logo: "🚀" },
    { name: "DataFlow", logo: "📊" },
    { name: "AutoScale", logo: "⚡" },
    { name: "CloudSync", logo: "☁️" },
    { name: "AI Dynamics", logo: "🤖" },
    { name: "FutureWorks", logo: "🌟" }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$49",
      period: "/month",
      description: "Perfect for small teams getting started with AI automation",
      features: [
        "Up to 1,000 AI operations/month",
        "Basic workflow automation",
        "Email support",
        "Standard integrations",
        "Data encryption"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "$149",
      period: "/month",
      description: "Advanced AI capabilities for growing businesses",
      features: [
        "Up to 10,000 AI operations/month",
        "Advanced neural networks",
        "Priority support",
        "Custom integrations",
        "Predictive analytics",
        "Team collaboration tools"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$499",
      period: "/month",
      description: "Unlimited AI power for large organizations",
      features: [
        "Unlimited AI operations",
        "Custom AI model training",
        "24/7 dedicated support",
        "White-label solutions",
        "Advanced security features",
        "On-premise deployment"
      ],
      popular: false
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "CTO at TechFlow",
      content: "This AI automation platform transformed our operations. We've seen 300% efficiency gains.",
      rating: 5,
      avatar: "👩‍💼"
    },
    {
      name: "Marcus Rodriguez",
      role: "Operations Director",
      content: "The predictive capabilities are incredible. It's like having a crystal ball for our business.",
      rating: 5,
      avatar: "👨‍💼"
    },
    {
      name: "Emily Watson",
      role: "CEO at DataScale",
      content: "Implementation was seamless. The AI learns our patterns and optimizes everything automatically.",
      rating: 5,
      avatar: "👩‍💻"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-6 py-2 mb-8 border border-white/20">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-white/90 text-sm font-medium">Next-Generation AI Automation</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-6 leading-tight">
              Automate Everything
              <br />
              <span className="text-white">with AI Intelligence</span>
            </h1>
            
            <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Transform your business with cutting-edge AI automation. Our neural networks learn, adapt, 
              and optimize your workflows in real-time, delivering unprecedented efficiency gains.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/login">
                <Button className="px-8 py-4 text-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-full shadow-2xl shadow-purple-500/25 border border-white/20 backdrop-blur-sm transform hover:scale-105 transition-all duration-300 glow-effect">
                  Start Free Trial
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" className="px-8 py-4 text-lg bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 rounded-full">
                Watch Demo
              </Button>
            </div>
            
            <div className="mt-12 text-white/60 text-sm">
              ✨ No credit card required • 14-day free trial • Setup in minutes
            </div>
          </div>

          {/* Floating Dashboard Preview */}
          <div className="relative max-w-6xl mx-auto mb-32">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl shadow-purple-500/20 transform hover:scale-105 transition-all duration-500 floating-card">
              <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20"></div>
                <div className="relative z-10 flex items-center justify-center h-full">
                  <div className="text-6xl animate-pulse">🤖</div>
                  <div className="ml-4 text-white">
                    <div className="text-2xl font-bold">AI Dashboard</div>
                    <div className="text-white/60">Real-time automation insights</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Logos */}
        <div className="container mx-auto px-4 mb-32">
          <div className="text-center mb-16">
            <p className="text-white/60 mb-8">Trusted by innovative companies worldwide</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-8">
              {customers.map((customer, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 floating-card">
                  <div className="text-center">
                    <div className="text-3xl mb-2">{customer.logo}</div>
                    <div className="text-white/80 text-sm font-medium">{customer.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="container mx-auto px-4 mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Powered by Advanced AI
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Our neural networks continuously learn and optimize your business processes, 
              delivering intelligent automation that evolves with your needs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl shadow-purple-500/10 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 transform hover:-translate-y-2 floating-card">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25">
                    <div className="text-white">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-white/70 text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Section */}
        <div className="container mx-auto px-4 mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Choose Your AI Power Level
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Scale your automation capabilities with flexible pricing designed for businesses of all sizes.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative bg-white/10 backdrop-blur-xl border transition-all duration-500 transform hover:-translate-y-4 floating-card ${plan.popular ? 'border-cyan-400/50 shadow-2xl shadow-cyan-500/25 scale-105' : 'border-white/20 hover:border-white/40'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      Most Popular
                    </div>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-white mb-2">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center mb-4">
                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{plan.price}</span>
                    <span className="text-white/60 ml-2">{plan.period}</span>
                  </div>
                  <CardDescription className="text-white/70">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-white/80">
                        <CheckCircle className="h-5 w-5 text-cyan-400 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${plan.popular ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25' : 'bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30'}`}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="container mx-auto px-4 mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Loved by Industry Leaders
            </h2>
            <p className="text-xl text-white/70">
              See how our AI automation is transforming businesses worldwide.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 floating-card">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-white/80 mb-6 italic leading-relaxed">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center text-2xl mr-4">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{testimonial.name}</p>
                      <p className="text-white/60 text-sm">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-4 pb-20">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl shadow-purple-500/20 text-center floating-card">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to Revolutionize Your Business?
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Join thousands of forward-thinking companies using our AI automation platform 
                to scale their operations and drive unprecedented growth.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link to="/login">
                  <Button className="px-8 py-4 text-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-full shadow-2xl shadow-purple-500/25 border border-white/20 backdrop-blur-sm transform hover:scale-105 transition-all duration-300 glow-effect">
                    Start Your AI Journey
                    <Bot className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="outline" className="px-8 py-4 text-lg bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 rounded-full">
                  Talk to Sales
                </Button>
              </div>
              <div className="mt-8 text-white/60">
                🔒 Enterprise-grade security • 🚀 Setup in minutes • 💬 24/7 support
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .glow-effect {
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
        }
        .floating-card {
          animation: float 6s ease-in-out infinite;
        }
        .floating-card:nth-child(2n) {
          animation-delay: -3s;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default Landing;
