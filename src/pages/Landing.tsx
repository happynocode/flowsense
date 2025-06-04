
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, BookOpen, Clock, Zap, Brain, Sparkles, Shield, Globe2 } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: <Brain className="h-8 w-8 text-electric-blue" />,
      title: "AI-Powered Intelligence",
      description: "Advanced neural networks analyze and synthesize content from thousands of sources in real-time"
    },
    {
      icon: <Sparkles className="h-8 w-8 text-astral-teal" />,
      title: "Instant Synthesis",
      description: "Transform hours of reading into minutes of actionable insights with quantum-speed processing"
    },
    {
      icon: <Shield className="h-8 w-8 text-cosmic-purple" />,
      title: "Secure & Private",
      description: "Enterprise-grade encryption ensures your data remains protected in our quantum-secured environment"
    }
  ];

  const automationFeatures = [
    "Smart content curation from 10,000+ sources",
    "Real-time sentiment analysis",
    "Automated topic clustering",
    "Predictive trend detection",
    "Multi-language processing",
    "Voice synthesis & playback"
  ];

  const customerLogos = [
    { name: "TechCorp", logo: "TC" },
    { name: "InnovateLab", logo: "IL" },
    { name: "FutureWorks", logo: "FW" },
    { name: "QuantumSoft", logo: "QS" },
    { name: "NeuralNet Inc", logo: "NN" },
    { name: "CyberSpace", logo: "CS" }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "AI Research Director",
      company: "TechCorp",
      content: "This platform has revolutionized how our team stays ahead of industry developments. The AI insights are incredibly accurate.",
      avatar: "SC"
    },
    {
      name: "Marcus Rodriguez",
      role: "Innovation Lead",
      company: "FutureWorks",
      content: "The predictive analytics have helped us identify market trends 6 months before our competitors. Game-changing technology.",
      avatar: "MR"
    },
    {
      name: "Dr. Yuki Tanaka",
      role: "CTO",
      company: "QuantumSoft",
      content: "Integration was seamless and the quantum-speed processing delivers insights faster than we ever thought possible.",
      avatar: "YT"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: 29,
      features: [
        "Up to 100 sources",
        "Daily AI digests",
        "Basic analytics",
        "Email delivery",
        "Mobile app access"
      ],
      isPopular: false
    },
    {
      name: "Professional",
      price: 79,
      features: [
        "Unlimited sources",
        "Real-time processing",
        "Advanced AI insights",
        "Custom delivery schedules",
        "API access",
        "Priority support"
      ],
      isPopular: true
    },
    {
      name: "Enterprise",
      price: 199,
      features: [
        "Everything in Professional",
        "Custom AI models",
        "White-label solution",
        "Dedicated support",
        "On-premise deployment",
        "Advanced security"
      ],
      isPopular: false
    }
  ];

  return (
    <div className="min-h-screen relative">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cosmic-purple/20 via-transparent to-electric-blue/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="floating mb-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-midnight/60 backdrop-blur-xl border border-white/10 text-sm text-electric-blue mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                Powered by Advanced AI Neural Networks
              </div>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-space-grotesk font-bold mb-6 leading-tight">
              <span className="text-cosmic-gradient">Future of</span>{" "}
              <span className="text-starlight">Content</span>{" "}
              <span className="text-aurora-gradient">Intelligence</span>
            </h1>
            
            <p className="text-xl text-lunar-grey mb-12 max-w-2xl mx-auto leading-relaxed">
              Harness quantum-powered AI to transform information overload into strategic intelligence. 
              Process thousands of sources instantly and stay ahead of tomorrow's trends.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/login">
                <Button className="btn-cosmic text-lg px-8 py-4 h-auto">
                  <Brain className="w-5 h-5 mr-2" />
                  Start Neural Processing
                </Button>
              </Link>
              <Button variant="outline" className="btn-outline-electric text-lg px-8 py-4 h-auto">
                <Globe2 className="w-5 h-5 mr-2" />
                Explore Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Logos */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <p className="text-center text-lunar-grey mb-12 text-sm uppercase tracking-wider">
            Trusted by Leading Organizations
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {customerLogos.map((customer, index) => (
              <div 
                key={index} 
                className="glass-card p-4 w-20 h-20 flex items-center justify-center floating hover-lift"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <span className="text-electric-blue font-bold text-lg">{customer.logo}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6">
              <span className="text-cosmic-gradient">Advanced AI</span>{" "}
              <span className="text-starlight">Capabilities</span>
            </h2>
            <p className="text-xl text-lunar-grey max-w-2xl mx-auto">
              Experience the next generation of content intelligence with our quantum-enhanced AI platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="glass-card hover-lift floating border-0"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-6 w-16 h-16 bg-cosmic-gradient rounded-2xl flex items-center justify-center glow-purple">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-2xl text-starlight">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-lunar-grey text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Automation Features Grid */}
          <div className="glass-card p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-space-grotesk font-bold mb-6 text-starlight">
                  Complete <span className="text-aurora-gradient">AI Automation</span>
                </h3>
                <p className="text-lunar-grey mb-8 text-lg leading-relaxed">
                  Our neural networks work 24/7 to monitor, analyze, and synthesize content 
                  from across the digital universe, delivering insights at the speed of thought.
                </p>
                <div className="grid gap-4">
                  {automationFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-astral-teal mr-3 flex-shrink-0" />
                      <span className="text-starlight">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="glass-card p-8 text-center floating">
                  <div className="w-24 h-24 mx-auto mb-6 bg-sunset-gradient rounded-full flex items-center justify-center glow-pink">
                    <Zap className="w-12 h-12 text-starlight" />
                  </div>
                  <h4 className="text-xl font-semibold text-starlight mb-2">Quantum Speed</h4>
                  <p className="text-lunar-grey">Process 10,000+ articles in seconds</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6">
              <span className="text-starlight">Choose Your</span>{" "}
              <span className="text-cosmic-gradient">Power Level</span>
            </h2>
            <p className="text-xl text-lunar-grey max-w-2xl mx-auto">
              Scale your AI intelligence with plans designed for every mission
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative glass-card border-0 hover-lift ${
                  plan.isPopular ? 'gradient-border glow-blue scale-105' : ''
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-sunset-gradient text-starlight text-sm font-medium py-2 px-4 rounded-full glow-pink">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl text-starlight mb-4">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-cosmic-gradient">${plan.price}</span>
                    <span className="text-lunar-grey">/month</span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-astral-teal mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-starlight text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full h-12 ${
                      plan.isPopular 
                        ? 'btn-cosmic' 
                        : 'btn-outline-electric'
                    }`}
                  >
                    {plan.isPopular ? 'Get Started' : `Choose ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6">
              <span className="text-aurora-gradient">Quantum</span>{" "}
              <span className="text-starlight">Success Stories</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index} 
                className="glass-card border-0 hover-lift floating"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <CardContent className="p-8">
                  <p className="text-lunar-grey mb-6 italic text-lg leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-cosmic-gradient rounded-full flex items-center justify-center text-starlight font-bold mr-4 glow-purple">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-starlight">{testimonial.name}</p>
                      <p className="text-sm text-electric-blue">{testimonial.role}</p>
                      <p className="text-xs text-lunar-grey">{testimonial.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="glass-card p-12 md:p-16 text-center max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6">
              <span className="text-starlight">Ready to Enter the</span>{" "}
              <span className="text-cosmic-gradient">Future?</span>
            </h2>
            <p className="text-xl text-lunar-grey mb-8 max-w-2xl mx-auto">
              Join thousands of visionaries already using AI to stay ahead of tomorrow's trends
            </p>
            <Link to="/login">
              <Button className="btn-cosmic text-lg px-12 py-4 h-auto mb-4">
                <Brain className="w-5 h-5 mr-2" />
                Activate Neural Interface
              </Button>
            </Link>
            <p className="text-sm text-lunar-grey">
              No quantum computer required • Neural networks included • Future-proof guarantee
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
