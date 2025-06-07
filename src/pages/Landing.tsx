import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, BookOpen, Clock, Zap, Brain, Sparkles, Shield, Globe2 } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: <Brain className="h-8 w-8 text-electric-blue" />,
      title: "每天节省数小时",
      description: "停止浏览数十个网站。在一个地方获取所有您喜爱的内容摘要，几分钟内准备就绪。"
    },
    {
      icon: <Sparkles className="h-8 w-8 text-astral-teal" />,
      title: "永不错过重要内容",
      description: "我们的智能系统24/7监控您的信息源，让您始终保持信息灵通而不会感到overwhelm。"
    },
    {
      icon: <Shield className="h-8 w-8 text-cosmic-purple" />,
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
      avatar: "陈"
    },
    {
      name: "马库斯·罗德里格斯",
      role: "创新负责人",
      company: "未来工作",
      content: "趋势发现功能帮助我们比竞争对手提前6个月发现了市场机会。这就像拥有了行业趋势的水晶球。",
      avatar: "马"
    },
    {
      name: "田中博士",
      role: "首席技术官",
      company: "量子软件",
      content: "设置只需5分钟。现在我每天早上从30多个信息源获得个性化摘要。音频功能非常适合我的通勤时间。",
      avatar: "田"
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
    <div className="min-h-screen relative">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cosmic-purple/20 via-transparent to-electric-blue/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-midnight/60 backdrop-blur-xl border border-white/10 text-sm text-electric-blue mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                全球10,000+专业人士的选择
              </div>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-space-grotesk font-bold mb-6 leading-tight">
              <span className="text-cosmic-gradient">您喜爱的内容，</span>{" "}
              <span className="text-starlight">每日</span>{" "}
              <span className="text-aurora-gradient">智能摘要</span>
            </h1>
            
            <p className="text-xl text-lunar-grey mb-12 max-w-2xl mx-auto leading-relaxed">
              停止在信息海洋中溺水。从您喜爱的博客、播客和新闻源获得个性化摘要，
              每天早上直接发送到您的邮箱。
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/login">
                <Button className="btn-cosmic text-lg px-8 py-4 h-auto">
                  <Brain className="w-5 h-5 mr-2" />
                  开始免费试用
                </Button>
              </Link>
              <Button variant="outline" className="btn-outline-electric text-lg px-8 py-4 h-auto">
                <Globe2 className="w-5 h-5 mr-2" />
                了解工作原理
              </Button>
            </div>
            
            <p className="text-sm text-lunar-grey mt-6">
              无需信用卡 • 7天免费试用 • 随时取消
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6">
              <span className="text-cosmic-gradient">为什么用户</span>{" "}
              <span className="text-starlight">喜爱每日摘要</span>
            </h2>
            <p className="text-xl text-lunar-grey max-w-2xl mx-auto">
              加入数千名已经重新掌控时间而不错过重要内容的用户
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
                  <span className="text-aurora-gradient">智能自动化</span> 轻松运行
                </h3>
                <p className="text-lunar-grey mb-8 text-lg leading-relaxed">
                  一次设置，然后放松享受。我们的系统持续监控您选择的信息源，
                  并将精心制作的摘要直接发送到您的邮箱。
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
                  <h4 className="text-xl font-semibold text-starlight mb-2">每周节省10+小时</h4>
                  <p className="text-lunar-grey">我们用户每周平均节省的时间</p>
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
              <span className="text-starlight">简单</span>{" "}
              <span className="text-cosmic-gradient">定价</span>
            </h2>
            <p className="text-xl text-lunar-grey max-w-2xl mx-auto">
              一个计划，为您提供保持信息灵通所需的一切
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <Card className="glass-card border-0 gradient-border glow-blue">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-cosmic-gradient rounded-2xl flex items-center justify-center glow-purple">
                  <Brain className="w-8 h-8 text-starlight" />
                </div>
                <CardTitle className="text-2xl text-starlight mb-4">{starterPlan.name}</CardTitle>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-cosmic-gradient">¥{starterPlan.price}</span>
                  <span className="text-lunar-grey">/月</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {starterPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-astral-teal mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-starlight text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/login">
                  <Button className="w-full h-12 btn-cosmic">
                    <Brain className="w-4 h-4 mr-2" />
                    开始免费试用
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6">
              <span className="text-aurora-gradient">真实用户</span>{" "}
              <span className="text-starlight">真实故事</span>
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
              <span className="text-starlight">准备重新掌控</span>{" "}
              <span className="text-cosmic-gradient">您的时间？</span>
            </h2>
            <p className="text-xl text-lunar-grey mb-8 max-w-2xl mx-auto">
              加入数千名保持信息灵通而不感到overwhelm的专业人士
            </p>
            <Link to="/login">
              <Button className="btn-cosmic text-lg px-12 py-4 h-auto mb-4">
                <Brain className="w-5 h-5 mr-2" />
                开始免费试用
              </Button>
            </Link>
            <p className="text-sm text-lunar-grey">
              无设置费 • 随时取消 • 24小时内获得结果
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;