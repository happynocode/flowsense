import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { ArrowLeft, Clock, ExternalLink, Calendar, Play, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { digestsApi, userApi } from '../services/api';
import { Digest } from '../types';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import LoadingIndicator from '../components/common/LoadingIndicator';
import AudioPlayer from '../components/digests/AudioPlayer';

const DigestDetail = () => {
  const { user, loading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [userTimezone, setUserTimezone] = useState('UTC');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [showAllSources, setShowAllSources] = useState(true);
  const { toast } = useToast();

  const defaultTab = searchParams.get('tab') === 'audio' ? 'audio' : 'reading';

  useEffect(() => {
    // Only fetch digest when user is authenticated and auth loading is complete
    if (user && !authLoading && id) {
      console.log('✅ User authenticated, fetching digest...');
      fetchDigest(id);
      loadUserTimezone();
    } else if (!authLoading && !user) {
      console.log('❌ User not authenticated');
      setLoading(false);
    }
  }, [user, authLoading, id]);

  const loadUserTimezone = async () => {
    try {
      const settings = await userApi.getAutoDigestSettings();
      setUserTimezone(settings.autoDigestTimezone || 'UTC');
    } catch (error) {
      console.error('Failed to load user timezone:', error);
      setUserTimezone('UTC');
    }
  };

  // Redirect to login if not authenticated and auth loading is complete
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  const fetchDigest = async (digestId: string) => {
    try {
      setLoading(true);
      // 传递用户ID到API调用
      const data = await digestsApi.getDigest(digestId, user?.id);
      setDigest(data);
      
      // Mark as read
      if (!data.isRead) {
        await digestsApi.markDigestAsRead(digestId);
        setDigest(prev => prev ? { ...prev, isRead: true } : null);
      }
    } catch (error) {
      toast({
        title: "Failed to load digest",
        description: "There was an error loading this digest.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string, userTimezone: string = 'UTC') => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: userTimezone
    });
  };

  const formatPublishedDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // 截断文本函数
  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // 生成基于用户时区的digest标题
  const generateDigestTitle = (digest: Digest, userTimezone: string) => {
    // 使用digest创建时间，转换为用户时区的当天日期
    const digestCreatedDate = new Date(digest.createdAt);
    
    // 判断是否为weekly digest（通过原标题或其他方式）
    const isWeekly = digest.title.toLowerCase().includes('weekly');
    
    if (isWeekly) {
      // Weekly digest: "Weekly Digest - M/D/YYYY"
      const formattedDate = digestCreatedDate.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        timeZone: userTimezone
      });
      return `Weekly Digest - ${formattedDate}`;
    } else {
      // Daily digest: "Daily Digest - M/D/YYYY"
      const formattedDate = digestCreatedDate.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        timeZone: userTimezone
      });
      return `Daily Digest - ${formattedDate}`;
    }
  };

  const getTotalReadingTime = (digest: Digest) => {
    return digest.summaries.reduce((total, summary) => total + summary.readingTime, 0);
  };

  // 🎯 按source分组summaries
  const groupSummariesBySource = (digest: Digest) => {
    const grouped = new Map<string, typeof digest.summaries>();
    
    digest.summaries.forEach(summary => {
      const sourceName = summary.sourceName;
      if (!grouped.has(sourceName)) {
        grouped.set(sourceName, []);
      }
      grouped.get(sourceName)?.push(summary);
    });
    
    return Array.from(grouped.entries()).map(([sourceName, summaries]) => ({
      sourceName,
      summaries,
      totalReadingTime: summaries.reduce((total, summary) => total + summary.readingTime, 0)
    }));
  };

  // 🎯 渲染格式化的摘要内容
  const renderFormattedContent = (content: string) => {
    // 将 markdown 格式转换为 HTML
    const formattedContent = content
      .replace(/## (.*)/g, '<h2 class="text-xl font-semibold text-gray-900 mt-6 mb-4">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br/>');

    return `<div class="prose prose-gray max-w-none"><p class="mb-4">${formattedContent}</p></div>`;
  };

  // 🎯 切换source展开状态
  const toggleSourceExpansion = (sourceName: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceName)) {
        newSet.delete(sourceName);
      } else {
        newSet.add(sourceName);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" text="Loading digest..." />
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Digest not found</h3>
            <p className="text-gray-500 mb-4">
              The digest you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/digests">
              <Button>Back to Digests</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const groupedSources = groupSummariesBySource(digest);

  // 🎯 选择source的处理函数
  const handleSourceSelection = (sourceName: string) => {
    if (sourceName === 'all') {
      setShowAllSources(true);
      setSelectedSource('all');
    } else {
      setShowAllSources(false);
      setSelectedSource(sourceName);
    }
  };

  // 🎯 获取当前显示的内容
  const getCurrentContent = () => {
    if (showAllSources) {
      return groupedSources;
    } else {
      return groupedSources.filter(group => group.sourceName === selectedSource);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link to="/digests">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Digests
            </Button>
          </Link>
        </div>

        {/* Left-Right Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Panel - Source Navigation */}
          <div className="lg:w-1/3 xl:w-1/4">
            <div className="sticky top-8 space-y-6">
              {/* Digest Header Info */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {formatDate(digest.createdAt, userTimezone)}
                    </span>
                    {!digest.isRead && (
                      <Badge className="bg-blue-100 text-blue-800">New</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl text-gray-900 mb-3">
                    {generateDigestTitle(digest, userTimezone)}
                  </CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>{digest.summaries.length} summaries</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{getTotalReadingTime(digest)} min read</span>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Source Navigation */}
              <Card className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Sources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Show All Option */}
                  <button
                    onClick={() => handleSourceSelection('all')}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      showAllSources 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">All Sources</span>
                      <Badge variant="outline" className="bg-white border-gray-300">
                        {groupedSources.length}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {digest.summaries.length} articles • {getTotalReadingTime(digest)} min read
                    </div>
                  </button>

                  {/* Individual Sources */}
                  {groupedSources.map((sourceGroup) => (
                    <button
                      key={sourceGroup.sourceName}
                      onClick={() => handleSourceSelection(sourceGroup.sourceName)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedSource === sourceGroup.sourceName && !showAllSources
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate pr-2">{sourceGroup.sourceName}</span>
                        <Badge variant="outline" className="bg-white border-gray-300 flex-shrink-0">
                          {sourceGroup.summaries.length}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {sourceGroup.summaries.length} articles • {sourceGroup.totalReadingTime} min read
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Audio Player */}
              {digest.audioUrl && (
                <Card className="bg-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                      <Play className="h-5 w-5 mr-2" />
                      Audio Version
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AudioPlayer
                      audioUrl={digest.audioUrl}
                      title={generateDigestTitle(digest, userTimezone)}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Panel - Content Display */}
          <div className="lg:w-2/3 xl:w-3/4">
            <div className="space-y-6">
              {getCurrentContent().map((sourceGroup, groupIndex) => (
                <div key={sourceGroup.sourceName} className="modern-card-elevated hover-lift overflow-hidden">
                  {showAllSources ? (
                    // 显示所有sources时，保持collapsible设计
                    <Collapsible
                      open={expandedSources.has(sourceGroup.sourceName)}
                      onOpenChange={() => toggleSourceExpansion(sourceGroup.sourceName)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50">
                          {/* Enhanced Source Header */}
                          <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-3">
                                  {expandedSources.has(sourceGroup.sourceName) ? (
                                    <ChevronDown className="h-5 w-5 text-blue-600" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-blue-600" />
                                  )}
                                  
                                  {/* Source Icon */}
                                  <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center text-white shadow-sm">
                                    <FileText className="h-5 w-5" />
                                  </div>
                                  
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                      {sourceGroup.sourceName}
                                    </h3>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                      <span className="flex items-center space-x-1">
                                        <FileText className="h-3 w-3" />
                                        <span>{sourceGroup.summaries.length} articles</span>
                                      </span>
                                      <span className="flex items-center space-x-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{sourceGroup.totalReadingTime} min read</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Status Badge */}
                              <div className="flex items-center space-x-2">
                                <Badge className="badge-primary">
                                  {expandedSources.has(sourceGroup.sourceName) ? 'Expanded' : 'Collapsed'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="bg-gray-50/50">
                          {sourceGroup.summaries.map((summary, summaryIndex) => (
                            <div key={summary.id} className="border-b last:border-b-0 bg-white mx-3 mb-3 last:mb-0 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                              <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center space-x-3 mb-3">
                                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                      <span className="text-sm text-gray-600 font-medium">
                                        {formatPublishedDate(summary.publishedAt)}
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        • {summary.readingTime} min read
                                      </span>
                                    </div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-3 hover:text-blue-600 transition-colors">
                                      {truncateText(summary.title, 80)}
                                    </h4>
                                  </div>
                                  <a
                                    href={summary.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 ml-4"
                                  >
                                    <Button variant="outline" size="sm" className="btn-ghost hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300">
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </a>
                                </div>
                                <div 
                                  className="prose prose-gray max-w-none leading-relaxed text-gray-700"
                                  dangerouslySetInnerHTML={{ __html: renderFormattedContent(summary.content) }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    // 选中单个source时，直接显示内容
                    <>
                      {/* Enhanced Single Source Header */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
                        <div className="flex items-center space-x-4">
                          {/* Source Icon */}
                          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                            <FileText className="h-6 w-6" />
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {sourceGroup.sourceName}
                            </h3>
                            
                            {/* Stats Cards */}
                            <div className="flex items-center space-x-6">
                              <div className="stats-card bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-white/50 shadow-sm">
                                <div className="flex items-center space-x-2">
                                  <FileText className="stats-card-icon w-5 h-5" />
                                  <div>
                                    <div className="stats-card-value text-xl">{sourceGroup.summaries.length}</div>
                                    <div className="stats-card-label">Articles</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="stats-card bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-white/50 shadow-sm">
                                <div className="flex items-center space-x-2">
                                  <Clock className="stats-card-icon w-5 h-5 text-purple-600" />
                                  <div>
                                    <div className="stats-card-value text-xl">{sourceGroup.totalReadingTime}</div>
                                    <div className="stats-card-label">Min Read</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Quality Badge */}
                          <div>
                            <Badge className="badge-accent">
                              Premium Content
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50/30">
                        {sourceGroup.summaries.map((summary, summaryIndex) => (
                          <div key={summary.id} className="bg-white mx-4 mb-4 first:mt-4 last:mb-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100">
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex items-center space-x-3 mb-3">
                                    <div className="w-3 h-3 bg-gradient-primary rounded-full shadow-sm" />
                                    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                                      {formatPublishedDate(summary.publishedAt)}
                                    </span>
                                    <span className="text-sm text-gray-500 flex items-center space-x-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{summary.readingTime} min read</span>
                                    </span>
                                  </div>
                                  <h4 className="text-xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors cursor-pointer">
                                    {truncateText(summary.title, 100)}
                                  </h4>
                                </div>
                                <a
                                  href={summary.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 ml-4"
                                >
                                  <Button variant="outline" size="sm" className="btn-secondary hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 shadow-sm">
                                    <ExternalLink className="h-4 w-4" />
                                    <span className="hidden sm:inline ml-1">Read Original</span>
                                  </Button>
                                </a>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                                <div 
                                  className="prose prose-gray max-w-none leading-relaxed text-gray-700"
                                  dangerouslySetInnerHTML={{ __html: renderFormattedContent(summary.content) }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigestDetail;