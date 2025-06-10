import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, BookOpen, Clock, Zap, Brain, Sparkles, Shield, Globe2, Star, ArrowRight } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: <Brain className="h-8 w-8 text-white" />,
      title: "每天节省数小时",
      description: "停止浏览数十个网站。在一个地方获取所有您喜爱的内容摘要，几分钟内准备就绪。"
    },
    {
      icon: <Sparkles className="h-8 w-8 text-white" />,
      title: "永不错过重要内容",
      description: "我们的智能系统24/7监控您的信息源，让您始终保持信息灵通而不会感到overwhelm。"
    },
    {
      icon: <Shield className="h-8 w-8 text-white" />,
      title: "值得信赖且安全",
      description: "您的阅读偏好保持私密。我们只从您选择和信任的信息源中总结内容。"
    }
  ];

  const automationFeatures = [
    "自动检查您喜爱的博客和新闻网站",
    "创建易于阅读的关键要点摘要",
    "将相关主题分组以便更好理解",
    "在趋势话题成为主流之前发现它们",
    "支持多种语言的内容",
    "包含音频版本，方便随时收听"
  ];

  const testimonials = [
    {
      name: "陈博士",
      role: "研究总监",
      company: "科技公司",
      content: "我过去每天早上要花2小时阅读行业新闻。现在我在15分钟内就能获得同样的见解。这改变了我保持信息灵通的方式。",
      avatar: "陈",
      rating: 5
    },
    {
      name: "马库斯·罗德里格斯",
      role: "创新负责人",
      company: "未来工作",
      content: "趋势发现功能帮助我们比竞争对手提前6个月发现了市场机会。这就像拥有了行业趋势的水晶球。",
      avatar: "马",
      rating: 5
    },
    {
      name: "田中博士",
      role: "首席技术官",
      company: "量子软件",
      content: "设置只需5分钟。现在我每天早上从30多个信息源获得个性化摘要。音频功能非常适合我的通勤时间。",
      avatar: "田",
      rating: 5
    }
  ];

  const starterPlan = {
    name: "入门版",
    price: 9,
    features: [
      "关注多达10个信息源",
      "每日摘要发送到您的邮箱",
      "关键见解和要点",
      "移动友好格式",
      "邮件支持",
      "音频摘要收听功能",
      "自定义发送时间"
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
                全球10,000+专业人士的选择
              </div>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-space-grotesk font-bold mb-6 leading-tight text-balance">
              <span className="text-gradient-primary">您喜爱的内容，</span>{" "}
              <span className="text-gray-800">每日</span>{" "}
              <span className="text-gradient-primary">智能摘要</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed text-balance">
              停止在信息海洋中溺水。从您喜爱的博客、播客和新闻源获得个性化摘要，
              每天早上直接发送到您的邮箱。
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link to="/login">
                <button className="btn-primary btn-lg">
                  <Brain className="w-5 h-5" />
                  开始免费试用
                </button>
              </Link>
              <button className="btn-outline btn-lg">
                <Globe2 className="w-5 h-5" />
                了解工作原理
              </button>
            </div>
            
            {/* Trust Indicators */}
            <p className="text-sm text-gray-500">
              无需信用卡 • 7天免费试用 • 随时取消
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
              <span className="text-gradient-primary">为什么用户</span>{" "}
              <span className="text-gray-800">喜爱每日摘要</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto text-balance">
              加入数千名已经重新掌控时间而不错过重要内容的用户
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
                  <span className="text-gradient-primary">智能自动化</span> 轻松运行
                </h3>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                  一次设置，然后放松享受。我们的系统持续监控您选择的信息源，
                  并将精心制作的摘要直接发送到您的邮箱。
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
                  <h4 className="text-2xl font-semibold mb-2">每周节省10+小时</h4>
                  <p className="text-white/90">我们用户每周平均节省的时间</p>
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
              <span className="text-gray-800">用户</span>{" "}
              <span className="text-gradient-primary">怎么说</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto text-balance">
              来自各行各业专业人士的真实反馈
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
              <span className="text-gray-800">简单</span>{" "}
              <span className="text-gradient-primary">定价</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto text-balance">
              一个计划，为您提供保持信息灵通所需的一切
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="modern-card-elevated p-8 text-center relative">
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="badge-accent px-4 py-2">最受欢迎</span>
              </div>

              {/* Plan Name */}
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{starterPlan.name}</h3>
              
              {/* Price */}
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-800">${starterPlan.price}</span>
                <span className="text-gray-600">/月</span>
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
                  <span>开始免费试用</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              
              <p className="text-sm text-gray-500">
                7天免费试用，随后 ${starterPlan.price}/月
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6 text-balance">
            准备好重新掌控您的时间了吗？
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto text-balance">
            加入数千名专业人士，他们已经在使用每日摘要来简化信息消费
          </p>
          <Link to="/login">
            <button className="bg-white text-primary-600 hover:bg-gray-50 font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center gap-2">
              <Brain className="w-5 h-5" />
              立即开始免费试用
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;