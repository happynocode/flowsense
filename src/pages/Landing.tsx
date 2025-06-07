import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, BookOpen, Clock, Zap, Brain, Sparkles, Shield, Globe2 } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: <Brain className="h-8 w-8 text-electric-blue" />,
      title: "Save Hours Every Day",
      description: "Stop scrolling through dozens of websites. Get all your favorite content summarized in one place, ready in minutes."
    },
    {
      icon: <Sparkles className="h-8 w-8 text-astral-teal" />,
      title: "Never Miss What Matters",
      description: "Our smart system monitors your sources 24/7, so you'll always stay informed without the overwhelm."
    },
    {
      icon: <Shield className="h-8 w-8 text-cosmic-purple" />,
      title: "Trustworthy & Secure",
      description: "Your reading preferences stay private. We only summarize content from sources you choose and trust."
    }
  ];

  const automationFeatures = [
    "Automatically checks your favorite blogs and news sites",
    "Creates easy-to-read summaries of the key points",
    "Groups related topics together for better understanding",
    "Spots trending topics before they go mainstream",
    "Works with content in multiple languages",
    "Includes audio versions for listening on-the-go"
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "Research Director",
      company: "TechCorp",
      content: "I used to spend 2 hours every morning reading industry news. Now I get the same insights in 15 minutes. This has been a game-changer for staying informed.",
      avatar: "SC"
    },
    {
      name: "Marcus Rodriguez",
      role: "Innovation Lead",
      company: "FutureWorks",
      content: "The trend spotting feature helped us identify a market opportunity 6 months before our competitors. It's like having a crystal ball for industry trends.",
      avatar: "MR"
    },
    {
      name: "Dr. Yuki Tanaka",
      role: "CTO",
      company: "QuantumSoft",
      content: "Setting it up took 5 minutes. Now I get personalized summaries from 30+ sources every morning. The audio feature is perfect for my commute.",
      avatar: "YT"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: 9,
      features: [
        "Follow up to 10 sources",
        "Daily summary delivered to your inbox",
        "Key insights and takeaways",
        "Mobile-friendly format",
        "Email support"
      ],
      isPopular: false
    },
    {
      name: "Professional",
      price: 19,
      features: [
        "Follow unlimited sources",
        "Real-time updates throughout the day",
        "Advanced trend analysis",
        "Audio summaries for listening",
        "Custom delivery schedule",
        "Priority support"
      ],
      isPopular: true
    },
    {
      name: "Enterprise",
      price: 49,
      features: [
        "Everything in Professional",
        "Team sharing and collaboration",
        "Custom branding options",
        "Dedicated account manager",
        "Advanced security features",
        "Custom integrations"
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
            <div className="mb-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-midnight/60 backdrop-blur-xl border border-white/10 text-sm text-electric-blue mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                Used by 10,000+ professionals worldwide
              </div>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-space-grotesk font-bold mb-6 leading-tight">
              <span className="text-cosmic-gradient">Your Favorite Content,</span>{" "}
              <span className="text-starlight">Summarized</span>{" "}
              <span className="text-aurora-gradient">Daily</span>
            </h1>
            
            <p className="text-xl text-lunar-grey mb-12 max-w-2xl mx-auto leading-relaxed">
              Stop drowning in information overload. Get personalized summaries from all your 
              favorite blogs, podcasts, and news sources delivered to your inbox every morning.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/login">
                <Button className="btn-cosmic text-lg px-8 py-4 h-auto">
                  <Brain className="w-5 h-5 mr-2" />
                  Start Your Free Trial
                </Button>
              </Link>
              <Button variant="outline" className="btn-outline-electric text-lg px-8 py-4 h-auto">
                <Globe2 className="w-5 h-5 mr-2" />
                See How It Works
              </Button>
            </div>
            
            <p className="text-sm text-lunar-grey mt-6">
              No credit card required • 7-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6">
              <span className="text-cosmic-gradient">Why People</span>{" "}
              <span className="text-starlight">Love Daily Digest</span>
            </h2>
            <p className="text-xl text-lunar-grey max-w-2xl mx-auto">
              Join thousands who've reclaimed their time without missing what matters most
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="glass-card border-0"
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
                  <span className="text-aurora-gradient">Smart Automation</span> That Just Works
                </h3>
                <p className="text-lunar-grey mb-8 text-lg leading-relaxed">
                  Set it up once, then sit back and relax. Our system continuously monitors 
                  your chosen sources and delivers perfectly crafted summaries right to your inbox.
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
                <div className="glass-card p-8 text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-sunset-gradient rounded-full flex items-center justify-center glow-pink">
                    <Clock className="w-12 h-12 text-starlight" />
                  </div>
                  <h4 className="text-xl font-semibold text-starlight mb-2">Save 10+ Hours Weekly</h4>
                  <p className="text-lunar-grey">Average time saved by our users each week</p>
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
              <span className="text-cosmic-gradient">Perfect Plan</span>
            </h2>
            <p className="text-xl text-lunar-grey max-w-2xl mx-auto">
              Start free, then pick the plan that fits your information needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative glass-card border-0 ${
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
                    {plan.isPopular ? 'Start Free Trial' : `Try ${plan.name}`}
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
              <span className="text-aurora-gradient">Real Stories</span>{" "}
              <span className="text-starlight">From Real Users</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index} 
                className="glass-card border-0"
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
              <span className="text-starlight">Ready to Reclaim</span>{" "}
              <span className="text-cosmic-gradient">Your Time?</span>
            </h2>
            <p className="text-xl text-lunar-grey mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who stay informed without the overwhelm
            </p>
            <Link to="/login">
              <Button className="btn-cosmic text-lg px-12 py-4 h-auto mb-4">
                <Brain className="w-5 h-5 mr-2" />
                Start Your Free Trial
              </Button>
            </Link>
            <p className="text-sm text-lunar-grey">
              No setup fees • Cancel anytime • Get results in 24 hours
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
