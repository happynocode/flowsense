import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, BookOpen, Clock, Zap, Palette, Layout } from 'lucide-react';

const Landing = () => {
  const [designStyle, setDesignStyle] = useState<'modern' | 'minimal' | 'bold'>('modern');
  const [modernLayout, setModernLayout] = useState<'classic' | 'asymmetric' | 'cards'>('classic');

  const features = [
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Curated Content",
      description: "Get personalized digests from your favorite sources"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Save Time",
      description: "Condensed summaries save you hours of reading"
    },
    {
      icon: <Zap className="h-6 w-6" />,
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

  const getStyleClasses = () => {
    switch (designStyle) {
      case 'modern':
        return {
          container: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100",
          hero: "bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-white/20",
          title: "text-5xl font-bold text-gray-900 mb-6",
          subtitle: "text-xl text-gray-600 mb-8 max-w-3xl mx-auto",
          button: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg",
          card: "bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1",
          accent: "text-blue-600"
        };
      case 'minimal':
        return {
          container: "min-h-screen bg-white",
          hero: "border border-gray-200 rounded-lg p-12",
          title: "text-4xl font-light text-gray-900 mb-6 tracking-tight",
          subtitle: "text-lg text-gray-500 mb-8 max-w-2xl mx-auto font-light",
          button: "bg-black hover:bg-gray-800 text-white border-0",
          card: "bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors",
          accent: "text-black"
        };
      case 'bold':
        return {
          container: "min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500",
          hero: "bg-white rounded-2xl p-12 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-300",
          title: "text-6xl font-black text-gray-900 mb-6 transform -skew-x-6",
          subtitle: "text-xl text-gray-700 mb-8 max-w-3xl mx-auto font-bold",
          button: "bg-yellow-400 hover:bg-yellow-500 text-black font-black text-lg transform hover:scale-105 transition-transform shadow-lg",
          card: "bg-gradient-to-br from-yellow-200 to-orange-200 border-4 border-black shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105",
          accent: "text-red-600"
        };
    }
  };

  const styles = getStyleClasses();

  const renderHeroSection = () => {
    if (designStyle !== 'modern') {
      // Classic hero for non-modern styles
      return (
        <div className={`text-center mb-16 ${styles.hero}`}>
          <h1 className={styles.title}>
            Your Daily Dose of 
            <span className={styles.accent}> Knowledge</span>
          </h1>
          <p className={styles.subtitle}>
            Transform information overload into actionable insights. Get personalized content digests 
            delivered daily, powered by AI and tailored to your interests.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className={`px-8 py-3 text-lg ${styles.button}`}>
                Start Your Free Trial
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
              Watch Demo
            </Button>
          </div>
        </div>
      );
    }

    // Modern style variations
    switch (modernLayout) {
      case 'classic':
        return (
          <div className={`text-center mb-16 ${styles.hero}`}>
            <h1 className={styles.title}>
              Your Daily Dose of 
              <span className={styles.accent}> Knowledge</span>
            </h1>
            <p className={styles.subtitle}>
              Transform information overload into actionable insights. Get personalized content digests 
              delivered daily, powered by AI and tailored to your interests.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login">
                <Button size="lg" className={`px-8 py-3 text-lg ${styles.button}`}>
                  Start Your Free Trial
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                Watch Demo
              </Button>
            </div>
          </div>
        );

      case 'asymmetric':
        return (
          <div className="grid lg:grid-cols-2 gap-12 mb-16 items-center">
            <div className="space-y-8">
              <h1 className="text-6xl font-bold text-gray-900 leading-tight">
                Your Daily Dose of 
                <span className="text-blue-600 block"> Knowledge</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Transform information overload into actionable insights. Get personalized content digests 
                delivered daily, powered by AI and tailored to your interests.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login">
                  <Button size="lg" className={`px-8 py-3 text-lg ${styles.button}`}>
                    Start Your Free Trial
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <div className="text-6xl text-blue-600">📰</div>
              </div>
            </div>
          </div>
        );

      case 'cards':
        return (
          <div className="mb-16">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-gray-900 mb-4">
                Your Daily Dose of 
                <span className="text-blue-600"> Knowledge</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Transform information overload into actionable insights.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg text-center p-6">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="font-semibold mb-2">Personalized</h3>
                <p className="text-sm text-gray-600">Tailored to your interests</p>
              </Card>
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg text-center p-6">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="font-semibold mb-2">Fast</h3>
                <p className="text-sm text-gray-600">Save hours of reading</p>
              </Card>
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg text-center p-6">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="font-semibold mb-2">AI-Powered</h3>
                <p className="text-sm text-gray-600">Smart content curation</p>
              </Card>
            </div>

            <div className="text-center">
              <Link to="/login">
                <Button size="lg" className={`px-8 py-3 text-lg mr-4 ${styles.button}`}>
                  Start Your Free Trial
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                Watch Demo
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Style Switcher */}
      <div className="fixed top-20 right-4 z-50 bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-4 w-4" />
          <span className="text-sm font-medium">Design Style</span>
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <button
            onClick={() => setDesignStyle('modern')}
            className={`px-3 py-1 text-sm rounded ${designStyle === 'modern' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
          >
            Modern
          </button>
          <button
            onClick={() => setDesignStyle('minimal')}
            className={`px-3 py-1 text-sm rounded ${designStyle === 'minimal' ? 'bg-gray-100 text-gray-700' : 'hover:bg-gray-100'}`}
          >
            Minimal
          </button>
          <button
            onClick={() => setDesignStyle('bold')}
            className={`px-3 py-1 text-sm rounded ${designStyle === 'bold' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100'}`}
          >
            Bold
          </button>
        </div>

        {/* Modern Layout Options */}
        {designStyle === 'modern' && (
          <>
            <div className="flex items-center gap-2 mb-2 pt-2 border-t">
              <Layout className="h-4 w-4" />
              <span className="text-sm font-medium">Modern Layout</span>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setModernLayout('classic')}
                className={`px-3 py-1 text-sm rounded ${modernLayout === 'classic' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              >
                Classic
              </button>
              <button
                onClick={() => setModernLayout('asymmetric')}
                className={`px-3 py-1 text-sm rounded ${modernLayout === 'asymmetric' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              >
                Asymmetric
              </button>
              <button
                onClick={() => setModernLayout('cards')}
                className={`px-3 py-1 text-sm rounded ${modernLayout === 'cards' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              >
                Cards
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        {renderHeroSection()}

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className={`text-center ${styles.card}`}>
              <CardHeader>
                <div className={`mx-auto mb-4 w-12 h-12 ${designStyle === 'bold' ? 'bg-black' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                  <div className={designStyle === 'bold' ? 'text-yellow-400' : styles.accent}>
                    {feature.icon}
                  </div>
                </div>
                <CardTitle className={`text-xl ${designStyle === 'bold' ? 'font-black' : ''}`}>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className={`text-base ${designStyle === 'bold' ? 'font-bold text-gray-800' : ''}`}>
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How It Works Section */}
        <div className="mb-16">
          <h2 className={`text-3xl font-bold text-center mb-12 ${designStyle === 'bold' ? 'font-black text-4xl' : 'text-gray-900'}`}>How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((step, index) => {
              const titles = ["Choose Your Sources", "AI Processes Content", "Receive Your Digest"];
              const descriptions = [
                "Select from thousands of trusted news sources, blogs, and publications",
                "Our AI analyzes and summarizes the most important information",
                "Get personalized summaries delivered to your inbox daily"
              ];
              
              return (
                <div key={step} className="text-center">
                  <div className={`w-16 h-16 ${designStyle === 'bold' ? 'bg-black border-4 border-yellow-400' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 ${designStyle === 'bold' ? 'transform rotate-12' : ''}`}>
                    {step}
                  </div>
                  <h3 className={`text-xl font-semibold mb-2 ${designStyle === 'bold' ? 'font-black' : ''}`}>{titles[index]}</h3>
                  <p className={`${designStyle === 'minimal' ? 'text-gray-500' : 'text-gray-600'} ${designStyle === 'bold' ? 'font-bold' : ''}`}>{descriptions[index]}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="mb-16">
          <h2 className={`text-3xl font-bold text-center mb-12 ${designStyle === 'bold' ? 'font-black text-4xl' : 'text-gray-900'}`}>What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className={styles.card}>
                <CardContent className="p-6">
                  <p className={`mb-4 italic ${designStyle === 'minimal' ? 'text-gray-500' : 'text-gray-600'} ${designStyle === 'bold' ? 'font-bold text-gray-800' : ''}`}>"{testimonial.content}"</p>
                  <div>
                    <p className={`font-semibold ${designStyle === 'bold' ? 'font-black' : 'text-gray-900'}`}>{testimonial.name}</p>
                    <p className={`text-sm ${designStyle === 'minimal' ? 'text-gray-400' : 'text-gray-500'}`}>{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className={`text-center ${styles.card} p-12`}>
          <h2 className={`text-3xl font-bold mb-4 ${designStyle === 'bold' ? 'font-black text-4xl' : 'text-gray-900'}`}>Ready to Get Started?</h2>
          <p className={`text-xl mb-8 ${designStyle === 'minimal' ? 'text-gray-500' : 'text-gray-600'} ${designStyle === 'bold' ? 'font-bold' : ''}`}>Join thousands of professionals who save time with Daily Digest</p>
          <Link to="/login">
            <Button size="lg" className={`px-8 py-3 text-lg ${styles.button}`}>
              Start Your Free Trial Today
            </Button>
          </Link>
          <p className={`text-sm mt-4 ${designStyle === 'minimal' ? 'text-gray-400' : 'text-gray-500'}`}>No credit card required • 14-day free trial</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
