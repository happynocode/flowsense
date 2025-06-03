
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, BookOpen, Clock, Zap, Star, ArrowRight, Sparkles, Bot, Brain, Cpu } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: <Bot className="h-8 w-8" />,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning algorithms analyze and summarize content with 99% accuracy"
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "Smart Personalization",
      description: "Neural networks learn your preferences to deliver perfectly curated content"
    },
    {
      icon: <Cpu className="h-8 w-8" />,
      title: "Real-time Processing",
      description: "Quantum-speed processing delivers insights faster than human thought"
    }
  ];

  const customerLogos = [
    "TechCorp", "InnovateLab", "FutureSync", "DataFlow", "NextGen AI", "Quantum Labs"
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      features: [
        "Up to 100 sources",
        "Daily AI summaries",
        "Basic analytics",
        "Email support"
      ],
      popular: false
    },
    {
      name: "Pro",
      price: "$79",
      period: "/month",
      features: [
        "Unlimited sources",
        "Real-time processing",
        "Advanced AI insights",
        "Priority support",
        "Custom integrations"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/month",
      features: [
        "Everything in Pro",
        "White-label solution",
        "Dedicated AI model",
        "24/7 phone support",
        "Custom deployment"
      ],
      popular: false
    }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "AI Research Director",
      company: "TechCorp",
      content: "This platform has revolutionized how we process information. The AI insights are incredibly accurate.",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "CTO",
      company: "InnovateLab",
      content: "The real-time processing capabilities are beyond anything we've seen. Simply incredible.",
      rating: 5
    },
    {
      name: "Dr. Emily Watson",
      role: "Data Scientist",
      company: "FutureSync",
      content: "The neural network personalization is so advanced, it feels like it reads my mind.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="particles">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 py-16 relative">
        {/* Hero Section */}
        <div className="text-center mb-20 float">
          <div className="glass-card p-12 mb-8">
            <div className="inline-block p-4 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-600/20 mb-6">
              <Sparkles className="h-12 w-12 text-cyan-400" />
            </div>
            <h1 className="text-6xl font-bold mb-6">
              The Future of 
              <span className="gradient-text block mt-2">AI Content Intelligence</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Harness the power of advanced neural networks to transform information overload into 
              actionable intelligence. Experience content curation like never before.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/login">
                <button className="glow-button px-8 py-4 text-lg font-semibold">
                  Start Your AI Journey
                  <ArrowRight className="ml-2 h-5 w-5 inline" />
                </button>
              </Link>
              <button className="glass border border-cyan-500/30 hover:border-cyan-400 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300">
                Watch Neural Demo
              </button>
            </div>
          </div>
        </div>

        {/* Customer Logos */}
        <div className="mb-20 float-delayed">
          <div className="glass-card p-8 text-center">
            <p className="text-gray-400 mb-6 text-sm uppercase tracking-wider">Trusted by Industry Leaders</p>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {customerLogos.map((logo, index) => (
                <div key={index} className="glass p-4 rounded-xl hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                  <div className="text-cyan-400 font-bold text-lg">{logo}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-20 float-delayed-2">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Next-Generation Features</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Powered by quantum-inspired algorithms and neural architecture
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card text-center p-8 hover:transform hover:scale-105 transition-all duration-300">
                <CardHeader>
                  <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
                    <div className="text-cyan-400">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-300 text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Choose Your Intelligence Level</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Scale your AI capabilities with our flexible quantum-powered plans
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`glass-card p-8 text-center relative ${plan.popular ? 'ring-2 ring-cyan-400 scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="glow-button-secondary px-4 py-1 text-sm">Most Popular</span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold gradient-text-blue">
                    {plan.price}<span className="text-lg text-gray-400">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center text-gray-300">
                      <CheckCircle className="h-5 w-5 text-cyan-400 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  <Link to="/login">
                    <button className={`w-full mt-6 ${plan.popular ? 'glow-button' : 'glass border border-cyan-500/30 hover:border-cyan-400'} py-3 px-6 rounded-xl font-semibold transition-all duration-300`}>
                      Activate {plan.name}
                    </button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">What AI Pioneers Say</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="glass-card p-8">
                <CardContent>
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6 italic leading-relaxed">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-cyan-400">{testimonial.role}</p>
                    <p className="text-sm text-gray-400">{testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="glass-card p-12">
            <CardContent>
              <h2 className="text-4xl font-bold mb-4 text-white">Ready to Join the AI Revolution?</h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Experience the future of content intelligence today. No quantum computer required.
              </p>
              <Link to="/login">
                <button className="glow-button px-8 py-4 text-lg font-semibold">
                  Launch Your AI Experience
                  <Sparkles className="ml-2 h-5 w-5 inline" />
                </button>
              </Link>
              <p className="text-sm text-gray-400 mt-4">No credit card required • Quantum-speed setup • 14-day neural trial</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Landing;
