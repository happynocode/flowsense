import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, BookOpen, Clock, Zap, Brain, Sparkles, Shield, Globe2, Star, ArrowRight } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: <Brain className="h-8 w-8 text-white" />,
      title: "Save Hours Every Day",
      description: "Stop browsing dozens of websites. Get all your favorite content summaries in one place, ready in minutes."
    },
    {
      icon: <Sparkles className="h-8 w-8 text-white" />,
      title: "Never Miss Important Content",
      description: "Our intelligent system monitors your sources 24/7, keeping you informed without feeling overwhelmed."
    },
    {
      icon: <Shield className="h-8 w-8 text-white" />,
      title: "Trusted and Secure",
      description: "Your reading preferences stay private. We only summarize content from sources you choose and trust."
    }
  ];

  const automationFeatures = [
    "Automatically check your favorite blogs and news sites",
    "Create easy-to-read key point summaries",
    "Group related topics for better understanding",
    "Discover trending topics before they become mainstream",
    "Support for multi-language content",
    "Includes audio version for convenient listening anytime"
  ];

  const testimonials = [
    {
      name: "Dr. Chen",
      role: "Research Director",
      company: "Tech Company",
      content: "I used to spend 2 hours every morning reading industry news. Now I get the same insights in 15 minutes. This has transformed how I stay informed.",
      avatar: "C",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "Innovation Lead",
      company: "Future Work",
      content: "The trend discovery feature helped us spot a market opportunity 6 months before our competitors. It's like having a crystal ball for industry trends.",
      avatar: "M",
      rating: 5
    },
    {
      name: "Dr. Tanaka",
      role: "CTO",
      company: "Quantum Software",
      content: "Setup took just 5 minutes. Now I get personalized summaries from 30+ sources every morning. The audio feature is perfect for my commute.",
      avatar: "T",
      rating: 5
    }
  ];

  const starterPlan = {
    name: "Premium Plan",
    price: 9,
    features: [
      "Follow up to 20 content sources",
      "Daily digest delivered to your inbox",
      "Key insights and takeaways",
      "Mobile-friendly format",
      "Email support",
      "Audio digest listening feature",
      "Custom delivery time"
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Trust Badge */}
            <div className="mb-8">
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-white border border-blue-200 text-sm text-blue-700 mb-6 shadow-sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Trusted by 10,000+ professionals worldwide
              </div>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-space-grotesk font-bold mb-6 leading-tight text-balance">
              <span className="text-gradient-primary">Your Favorite Content,</span>{" "}
              <span className="text-gray-800">Daily</span>{" "}
              <span className="text-gradient-primary">AI Summaries</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed text-balance">
              Stop drowning in information overload. Get personalized summaries from your favorite blogs, 
              podcasts, and news sources delivered straight to your inbox every morning.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link to="/login">
                <button className="btn-primary btn-lg">
                  <Brain className="w-5 h-5" />
                  Start Free Trial
                </button>
              </Link>
            </div>
            
            {/* Trust Indicators */}
            <p className="text-sm text-gray-500">
              No credit card required • 7-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6 text-balance">
              <span className="text-gradient-primary">Why Users</span>{" "}
              <span className="text-gray-800">Love Daily Digests</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto text-balance">
              Join thousands of users who have regained control of their time without missing important content
            </p>
          </div>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-card-icon">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Automation Features */}
          <div className="modern-card-elevated p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-space-grotesk font-bold mb-6 text-gray-800">
                  <span className="text-gradient-primary">Smart Automation</span> Made Easy
                </h3>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                  Set it up once, then sit back and relax. Our system continuously monitors your chosen sources and delivers carefully crafted summaries directly to your inbox.
                </p>
                <div className="space-y-4">
                  {automationFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="modern-card p-8 text-center bg-gradient-primary text-white">
                  <div className="w-20 h-20 mx-auto mb-6 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Clock className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="text-2xl font-semibold mb-2">Save 10+ Hours Per Week</h4>
                  <p className="text-white/90">Average time saved by our users weekly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6 text-balance">
              <span className="text-gray-800">What Users</span>{" "}
              <span className="text-gradient-primary">Are Saying</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto text-balance">
              Real feedback from professionals across industries
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="modern-card p-6">
                {/* Rating */}
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                {/* Content */}
                <p className="text-gray-700 leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>
                
                {/* Author */}
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6 text-balance">
              <span className="text-gray-800">Simple</span>{" "}
              <span className="text-gradient-primary">Pricing</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto text-balance">
              One plan with everything you need to stay informed
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="modern-card-elevated p-8 text-center relative">
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="badge-accent px-4 py-2">Most Popular</span>
              </div>

              {/* Plan Name */}
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{starterPlan.name}</h3>
              
              {/* Price */}
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-800">${starterPlan.price}</span>
                <span className="text-gray-600">/month</span>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 text-left">
                {starterPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link to="/login">
                <button className="btn-primary w-full mb-4">
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              
              <p className="text-sm text-gray-500">
                7-day free trial, then ${starterPlan.price}/month
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6 text-balance text-white">
            Ready to Take Control of Your Time?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto text-balance">
            Join thousands of professionals who are already using Daily Digest to simplify their information consumption
          </p>
          <Link to="/login">
            <button className="bg-white text-gray-800 hover:bg-gray-50 hover:text-gray-900 font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center gap-2 border border-gray-200">
              <Brain className="w-5 h-5 text-gray-800" />
              Start Free Trial Now
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;