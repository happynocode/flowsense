import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { digestsApi, sourcesApi } from '../services/api';
import { Digest, ContentSource } from '../types';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { FileText, Play, Clock, TrendingUp, Plus, Brain, Sparkles } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const [recentDigests, setRecentDigests] = useState<Digest[]>([]);
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDigests: 0,
    unreadDigests: 0,
    activeSources: 0,
    totalReadingTime: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Mock data for demonstration since we don't have a real backend
        const mockDigests: Digest[] = [
          {
            id: '1',
            title: 'Tech Weekly Digest',
            date: new Date().toISOString(),
            summaries: [
              {
                id: '1',
                title: 'AI Breakthrough in Natural Language',
                content: 'Recent advances in AI have shown remarkable progress...',
                sourceUrl: 'https://example.com/article1',
                sourceName: 'Tech News',
                publishedAt: new Date().toISOString(),
                readingTime: 5
              }
            ],
            audioUrl: 'https://example.com/audio1.mp3',
            duration: 300,
            isRead: false,
            createdAt: new Date().toISOString()
          }
        ];

        const mockSources: ContentSource[] = [
          {
            id: '1',
            name: 'Tech News',
            url: 'https://technews.com',
            type: 'blog',
            description: 'Latest technology news and updates',
            isActive: true,
            lastScraped: new Date().toISOString(),
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            name: 'AI Podcast',
            url: 'https://aipodcast.com',
            type: 'podcast',
            description: 'Weekly AI discussions',
            isActive: true,
            lastScraped: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
        ];

        setRecentDigests(mockDigests);
        setSources(mockSources);
        
        // Calculate stats safely
        const unreadCount = mockDigests.filter(d => !d.isRead).length;
        const activeSourceCount = mockSources.filter(s => s.isActive).length;
        const totalReadingTime = mockDigests.reduce((acc, digest) => {
          return acc + (digest.summaries || []).reduce((summaryAcc, summary) => summaryAcc + summary.readingTime, 0);
        }, 0);

        setStats({
          totalDigests: mockDigests.length,
          unreadDigests: unreadCount,
          activeSources: activeSourceCount,
          totalReadingTime
        });
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Set empty arrays to prevent undefined errors
        setRecentDigests([]);
        setSources([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple">
            <Brain className="w-8 h-8 text-starlight" />
          </div>
          <LoadingIndicator size="lg" text="正在加载您的神经仪表板..." />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 relative">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-4">
            <span className="text-cosmic-gradient">欢迎回来，</span>{" "}
            <span className="text-starlight">{user?.name?.split(' ')[0] || '用户'}!</span>
          </h1>
          <p className="text-lunar-grey text-xl">
            这里是您的内容摘要中心的最新动态
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-lunar-grey">总摘要数</p>
                  <p className="text-2xl font-bold text-starlight">{stats.totalDigests}</p>
                </div>
                <div className="w-12 h-12 bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple">
                  <FileText className="h-6 w-6 text-starlight" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-lunar-grey">未读摘要</p>
                  <p className="text-2xl font-bold text-starlight">{stats.unreadDigests}</p>
                </div>
                <div className="w-12 h-12 bg-sunset-gradient rounded-full flex items-center justify-center glow-pink">
                  <div className="h-3 w-3 bg-starlight rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-lunar-grey">活跃源</p>
                  <p className="text-2xl font-bold text-starlight">{stats.activeSources}</p>
                </div>
                <div className="w-12 h-12 bg-aurora-gradient rounded-full flex items-center justify-center glow-teal">
                  <TrendingUp className="h-6 w-6 text-midnight" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-lunar-grey">阅读时间</p>
                  <p className="text-2xl font-bold text-starlight">{stats.totalReadingTime}分钟</p>
                </div>
                <div className="w-12 h-12 bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple">
                  <Clock className="h-6 w-6 text-starlight" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Digests */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-space-grotesk font-semibold text-starlight">最近摘要</h2>
              <Link to="/digests">
                <Button variant="outline" size="sm" className="btn-outline-electric">
                  查看全部
                </Button>
              </Link>
            </div>

            {recentDigests.length === 0 ? (
              <Card className="glass-card border-0">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-cosmic-gradient rounded-full flex items-center justify-center glow-purple">
                    <FileText className="h-8 w-8 text-starlight" />
                  </div>
                  <h3 className="text-lg font-medium text-starlight mb-2">暂无摘要</h3>
                  <p className="text-lunar-grey mb-4">
                    添加一些内容源来开始生成您的每日摘要
                  </p>
                  <Link to="/sources">
                    <Button className="btn-cosmic">
                      <Plus className="h-4 w-4 mr-2" />
                      添加源
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recentDigests.map((digest) => (
                  <Card key={digest.id} className="glass-card border-0 hover:glow-blue transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-medium text-starlight">
                              {digest.title}
                            </h3>
                            {!digest.isRead && (
                              <Badge className="bg-electric-blue/20 text-electric-blue border-electric-blue/30">
                                新
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-lunar-grey mb-3">
                            {digest.summaries?.length || 0} 个摘要 • {formatDate(digest.date)}
                          </p>
                          
                          <div className="flex items-center space-x-4">
                            <Link to={`/digests/${digest.id}`}>
                              <Button size="sm" className="btn-cosmic">
                                <FileText className="h-4 w-4 mr-1" />
                                阅读
                              </Button>
                            </Link>
                            
                            {digest.audioUrl && (
                              <Button variant="outline" size="sm" className="btn-outline-electric">
                                <Play className="h-4 w-4 mr-1" />
                                收听
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sources Sidebar */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-space-grotesk font-semibold text-starlight">您的源</h2>
              <Link to="/sources">
                <Button variant="outline" size="sm" className="btn-outline-electric">
                  管理
                </Button>
              </Link>
            </div>

            {sources.length === 0 ? (
              <Card className="glass-card border-0">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-aurora-gradient rounded-full flex items-center justify-center glow-teal">
                    <TrendingUp className="h-6 w-6 text-midnight" />
                  </div>
                  <h3 className="font-medium text-starlight mb-2">未添加源</h3>
                  <p className="text-sm text-lunar-grey mb-4">
                    添加您喜爱的博客、播客和新闻网站
                  </p>
                  <Link to="/sources">
                    <Button size="sm" className="btn-cosmic">
                      <Plus className="h-4 w-4 mr-1" />
                      添加源
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sources.slice(0, 5).map((source) => (
                  <Card key={source.id} className="glass-card border-0 hover:glow-blue transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-starlight truncate">
                            {source.name}
                          </h4>
                          <p className="text-sm text-lunar-grey truncate">
                            {source.url}
                          </p>
                        </div>
                        <div className={`ml-2 h-2 w-2 rounded-full ${
                          source.isActive ? 'bg-astral-teal glow-teal' : 'bg-lunar-grey'
                        }`} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {sources.length > 5 && (
                  <Link to="/sources">
                    <Button variant="ghost" size="sm" className="w-full text-lunar-grey hover:text-starlight">
                      查看其他 {sources.length - 5} 个源
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;