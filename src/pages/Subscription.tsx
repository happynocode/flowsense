import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Brain, ArrowRight } from 'lucide-react';

const Subscription = () => {
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
      {/* Pricing Section */}
      <section className="py-24">
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

export default Subscription;
