
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, BookOpen, Clock, Zap } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: <BookOpen className="h-6 w-6 text-blue-600" />,
      title: "Curated Content",
      description: "Get personalized digests from your favorite sources"
    },
    {
      icon: <Clock className="h-6 w-6 text-blue-600" />,
      title: "Save Time",
      description: "Condensed summaries save you hours of reading"
    },
    {
      icon: <Zap className="h-6 w-6 text-blue-600" />,
      title: "Stay Updated",
      description: "Never miss important news and updates"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Marketing Manager",
      content: "Daily Digest has transformed how I stay informed. I save 2 hours every day!"
    },
    {
      name: "Michael Chen",
      role: "Tech Lead",
      content: "The AI-powered summaries are incredibly accurate and relevant to my interests."
    },
    {
      name: "Emily Davis",
      role: "Entrepreneur",
      content: "Perfect for busy professionals who need to stay on top of industry trends."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Your Daily Dose of 
            <span className="text-blue-600"> Knowledge</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform information overload into actionable insights. Get personalized content digests 
            delivered daily, powered by AI and tailored to your interests.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="px-8 py-3 text-lg">
                Start Your Free Trial
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How It Works Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose Your Sources</h3>
              <p className="text-gray-600">Select from thousands of trusted news sources, blogs, and publications</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Processes Content</h3>
              <p className="text-gray-600">Our AI analyzes and summarizes the most important information</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Receive Your Digest</h3>
              <p className="text-gray-600">Get personalized summaries delivered to your inbox daily</p>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl p-12 shadow-lg">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">Join thousands of professionals who save time with Daily Digest</p>
          <Link to="/login">
            <Button size="lg" className="px-8 py-3 text-lg">
              Start Your Free Trial Today
            </Button>
          </Link>
          <p className="text-sm text-gray-500 mt-4">No credit card required • 14-day free trial</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
