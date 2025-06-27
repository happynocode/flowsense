import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Trash2, Globe, Mic, FileText, Loader2, CheckCircle, AlertCircle, Sparkles, Zap, Eraser, Crown, Lock, Calendar, RefreshCw } from 'lucide-react';
import { navigateTo } from '../utils/navigation';
import { sourcesApi, userApi } from '../services/api';
import { ContentSource } from '../types';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { Navigate } from 'react-router-dom';
import LoadingIndicator from '../components/common/LoadingIndicator';
import SourceForm from '../components/sources/SourceForm';
import CombinedControlPanel from '../components/sources/CombinedControlPanel';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const Sources = () => {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { isPremium, limits, canAddSource, canUseFeature, upgradeRequired } = useSubscription();
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<ContentSource | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<ContentSource | null>(null);
  const [globalProcessing, setGlobalProcessing] = useState(false);
  const [processResults, setProcessResults] = useState<any>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  // 新增异步任务相关状态
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [taskProgress, setTaskProgress] = useState<any>(null);
  const [isPollingTask, setIsPollingTask] = useState(false);
  
  const { toast } = useToast();

  // 刷新用户订阅状态
  const handleRefreshUserData = async () => {
    try {
      console.log('🔄 手动刷新用户数据...');
      await refreshUser();
      toast({
        title: "✅ User Data Refreshed",
        description: "Subscription status has been updated.",
      });
    } catch (error) {
      console.error('❌ 刷新用户数据失败:', error);
      toast({
        title: "❌ Refresh Failed",
        description: "Failed to refresh user data. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Only fetch sources when user is authenticated and auth loading is complete
    if (user && !authLoading) {
      console.log('✅ User authenticated, fetching sources...');
      console.log('🔍 User details:', { id: user.id, email: user.email });
      
      // 🔧 Temporary debug info
      console.log('🔍 Auth debug info:', {
        userId: user.id,
        userIdType: typeof user.id,
        userIdLength: user.id.length,
        isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
      });
      
      // Add a small delay to ensure auth state is stable
      const fetchWithDelay = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        fetchSources();
      };
      
      fetchWithDelay();
    } else if (!authLoading && !user) {
      console.log('❌ User not authenticated');
      setLoading(false);
    } else {
      console.log('⏳ Auth still loading...', { authLoading, hasUser: !!user });
    }
  }, [user, authLoading]);

  // Redirect to login if not authenticated and auth loading is complete
  if (!authLoading && !user) {
    console.log('🔄 Redirecting to login...');
    return <Navigate to="/login" replace />;
  }

  const fetchSources = async () => {
    try {
      console.log('📡 Starting fetchSources...');
      setLoading(true);
      
      // 获取所有sources，明确设置大limit以确保没有限制
      const response = await sourcesApi.getSources(1, 1000, user?.id);
      console.log('✅ Sources response:', response);
      setSources(response.data || []);
    } catch (error) {
      console.error('❌ Failed to load sources:', error);
      setSources([]);
      toast({
        title: "Failed to load sources",
        description: error instanceof Error ? error.message : "There was an error loading your content sources.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSourceSuccess = (source: ContentSource) => {
    if (editingSource) {
      setSources(prev => (prev || []).map(s => s.id === source.id ? source : s));
    } else {
      setSources(prev => [...(prev || []), source]);
    }
    setShowForm(false);
    setEditingSource(null);
  };

  const handleEdit = (source: ContentSource) => {
    setEditingSource(source);
    setShowForm(true);
  };

  const handleDelete = async (source: ContentSource) => {
    try {
      await sourcesApi.deleteSource(source.id);
      setSources(prev => (prev || []).filter(s => s.id !== source.id));
      toast({
        title: "Source deleted",
        description: "The content source has been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the source.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog(null);
    }
  };

  const toggleSourceStatus = async (source: ContentSource) => {
    try {
      const updatedSource = await sourcesApi.updateSource(source.id, {
        isActive: !source.isActive
      });
      setSources(prev => (prev || []).map(s => s.id === source.id ? updatedSource : s));
      toast({
        title: updatedSource.isActive ? "Source activated" : "Source deactivated",
        description: updatedSource.isActive 
          ? "This source will be included in future digests."
          : "This source will be excluded from future digests.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "There was an error updating the source.",
        variant: "destructive",
      });
    }
  };



  // 🔄 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    console.log('🔄 开始轮询任务状态, TaskID:', taskId);
    setIsPollingTask(true);
    const pollInterval = setInterval(async () => {
      try {
        const statusResult = await sourcesApi.getTaskStatus(taskId, user?.id);
        
        if (statusResult.success && statusResult.task) {
          const task = statusResult.task;
          setCurrentTask(task);
          setTaskProgress(task.progress);
          
          console.log('📊 Task status:', {
            taskId,
            status: task.status,
            progress: task.progress,
            created_at: task.created_at,
            started_at: task.started_at,
            elapsed_time: task.progress?.elapsed_time
          });
          
          // 任务完成
          if (task.status === 'completed') {
            clearInterval(pollInterval);
            setIsPollingTask(false);
            setGlobalProcessing(false);
            
            const result = task.result;
            setProcessResults({ success: true, data: result });
            
            // 🎉 任务完成通知，引导用户查看digest
            toast({
              title: "🎉 Processing Complete!",
              description: `Successfully processed ${result.processedSources.length} sources and generated ${result.totalSummaries} summaries. Click to view your digest!`,
              action: (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigateTo('/digests')}
                  className="ml-2"
                >
                  View Digest
                </Button>
              ),
            });
            
            // 刷新 sources 列表
            fetchSources();
            
          } else if (task.status === 'failed') {
            clearInterval(pollInterval);
            setIsPollingTask(false);
            setGlobalProcessing(false);
            
            toast({
              title: "❌ Processing Failed",
              description: task.error_message || "An error occurred during processing",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('❌ 轮询任务状态失败:', {
          taskId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: error,
          timestamp: new Date().toISOString()
        });
        
        // 记录轮询失败
        console.warn('⚠️ Polling failure, this may indicate the task has failed or timed out');
      }
    }, 3000); // 每3秒轮询一次以获得更及时的进度更新
    
    // 设置最大轮询时间（10分钟）
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsPollingTask(false);
      setGlobalProcessing(false);
    }, 10 * 60 * 1000);
  };

  // 🚀 新的异步处理函数 - 支持时间范围参数
  const handleProcessAllSourcesAsync = async (timeRange: 'today' | 'week') => {
    console.log('🔴 ===== handleProcessAllSourcesAsync CALLED =====');
    console.log('🔴 timeRange:', timeRange);
    console.log('🔴 user:', user);
    console.log('🔴 globalProcessing before:', globalProcessing);
    
    setGlobalProcessing(true);
    setProcessResults(null);
    setCurrentTask(null);
    setTaskProgress(null);

    try {
      const timeRangeText = timeRange === 'today' ? 'today' : 'this week';
      console.log(`🚀 启动异步处理任务 (${timeRangeText})...`);
      console.log('🔴 About to call sourcesApi.startProcessingTask...');
      
      const result = await sourcesApi.startProcessingTask(user?.id, timeRange);
      
      console.log('🔴 startProcessingTask result:', result);
      
      if (result.success && result.task_id) {
        const timeRangeText = timeRange === 'today' ? 'today' : 'this week';
        
        toast({
          title: "🚀 Task Started",
          description: `Processing ${timeRangeText}'s content has begun. This will take approximately 1-5 minutes.`,
        });
        
        console.log('🔄 手动触发任务执行...');
        
        // 手动触发执行任务
        const triggerResult = await sourcesApi.triggerTaskExecution(result.task_id.toString(), user?.id);
        
        if (triggerResult.success) {
          console.log('✅ 任务触发成功，开始轮询 TaskID:', result.task_id);
          
          toast({
            title: "✅ Processing Started Successfully",
            description: `Processing ${timeRangeText}'s content in background. You'll be notified when complete.`,
          });
          
          // 开始轮询任务状态
          pollTaskStatus(result.task_id.toString());
        } else {
          toast({
            title: "⚠️ Failed to Start Processing",
            description: triggerResult.error || "Please try again",
            variant: "destructive",
          });
          setGlobalProcessing(false);
        }
        
      } else {
        setGlobalProcessing(false);
        toast({
          title: "❌ Task Creation Failed",
          description: result.error || "Failed to create processing task",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('🔴 ===== CATCH BLOCK =====');
      console.error('🔴 启动异步任务失败:', error);
      console.error('🔴 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        error: error
      });
      setGlobalProcessing(false);
      toast({
        title: "❌ Task Start Failed",
        description: "Failed to start processing task. Please try again.",
        variant: "destructive",
      });
    }
  };

  // 🎯 NEW: 直接处理函数 - 用于手动按钮
  const handleProcessDirectly = async (timeRange: 'today' | 'week') => {
    console.log('🎯 ===== handleProcessDirectly CALLED =====');
    console.log('🎯 timeRange:', timeRange);
    console.log('🎯 user:', user);
    
    setGlobalProcessing(true);
    setProcessResults(null);
    setCurrentTask(null);
    setTaskProgress(null);

    try {
      const timeRangeText = timeRange === 'today' ? 'today' : 'this week';
      console.log(`🎯 启动直接处理 (${timeRangeText})...`);
      
      toast({
        title: "🚀 Processing Started",
        description: `Processing ${timeRangeText}'s content directly...`,
      });
      
      // 直接调用处理函数，不通过任务系统
      const result = await userApi.processDirectly(timeRange);
      
      console.log('🎯 Direct processing result:', result);
      
      if (result.success) {
                  toast({
            title: "🎉 Processing Complete!",
            description: `Successfully processed ${timeRangeText}'s content directly. Click to view your digest!`,
            action: (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateTo('/digests')}
                className="ml-2"
              >
                View Digest
              </Button>
            ),
          });
      } else {
        toast({
          title: "❌ Processing Failed",
          description: result.error || "Failed to process content directly",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('🎯 ===== DIRECT PROCESSING ERROR =====');
      console.error('🎯 直接处理失败:', error);
      toast({
        title: "❌ Processing Failed",
        description: "Failed to process content directly. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGlobalProcessing(false);
    }
  };

  // 🗑️ 清除已抓取内容的功能
  const handleClearScrapedContent = async () => {
    setClearing(true);
    try {
      await sourcesApi.clearScrapedContent(user?.id);
      
      // 刷新sources列表以更新状态
      fetchSources();
      
      // 清除处理结果显示
      setProcessResults(null);
      
      toast({
        title: "✅ Content Cleared Successfully",
        description: "All fetched content and digests have been cleared. Sources are preserved.",
      });
    } catch (error) {
      console.error('Failed to clear scraped content:', error);
      toast({
        title: "❌ Clear Failed",
        description: "An error occurred while clearing content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
      setShowClearDialog(false);
    }
  };

  const getTypeIcon = (type: ContentSource['type']) => {
    switch (type) {
      case 'podcast':
        return <Mic className="h-4 w-4" />;
      case 'blog':
        return <FileText className="h-4 w-4" />;
      case 'news':
        return <Globe className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // 🎯 将技术错误信息转换为用户友好的信息
  const getFriendlyErrorMessage = (originalError: string): string => {
    const errorMap: { [key: string]: string } = {
      '未能从RSS feed中解析文章': 'No new articles found for the selected time period',
      '无法访问该URL': 'Unable to access this source - the website may be down or blocking our requests',
      'RSS处理失败': 'Technical error while processing RSS feed',
      '网页处理失败': 'Technical error while processing webpage content',
      '未能从网页中提取文章内容': 'No articles could be extracted from this webpage',
      'Failed to access URL': 'Unable to access this source - the website may be down or blocking our requests',
      'Could not fetch article content': 'Unable to fetch article content from this source',
      'Article content too short': 'Articles found but content was too short to process',
      'No articles found': 'No articles found in the specified time range'
    };

    // 检查是否包含特定关键词
    const lowerError = originalError.toLowerCase();
    
    if (lowerError.includes('too old') || lowerError.includes('time-ordered')) {
      return 'No new articles published in the selected time period';
    }
    
    if (lowerError.includes('timeout') || lowerError.includes('fetch')) {
      return 'Connection timeout - the source website is too slow to respond';
    }
    
    if (lowerError.includes('403') || lowerError.includes('forbidden')) {
      return 'Access denied - the website is blocking automated requests';
    }
    
    if (lowerError.includes('404') || lowerError.includes('not found')) {
      return 'Source not found - the URL may have changed or been removed';
    }
    
    if (lowerError.includes('500') || lowerError.includes('server error')) {
      return 'Server error on the source website - try again later';
    }

    // 查找完全匹配
    for (const [key, value] of Object.entries(errorMap)) {
      if (originalError.includes(key)) {
        return value;
      }
    }

    // 如果没有匹配，返回稍微清理过的原始错误信息
    return originalError.length > 100 
      ? originalError.substring(0, 100) + '...' 
      : originalError;
  };

  // 🎯 根据错误类型提供解决建议
  const getErrorSuggestion = (originalError: string): string | null => {
    const lowerError = originalError.toLowerCase();
    
    if (lowerError.includes('未能从rss feed中解析文章') || 
        lowerError.includes('no new articles') ||
        lowerError.includes('too old')) {
      return 'Try selecting "Process Week" instead of "Process Today" for a longer time range, or check if this source publishes content regularly.';
    }
    
    if (lowerError.includes('无法访问') || 
        lowerError.includes('failed to access') ||
        lowerError.includes('timeout')) {
      return 'Check if the website is accessible in your browser. Some websites may block automated requests.';
    }
    
    if (lowerError.includes('403') || lowerError.includes('forbidden')) {
      return 'This website blocks automated access. Try finding an alternative RSS feed URL for this source.';
    }
    
    if (lowerError.includes('404') || lowerError.includes('not found')) {
      return 'Update the source URL or check if the website has moved to a new address.';
    }
    
    if (lowerError.includes('rss处理失败') || 
        lowerError.includes('technical error')) {
      return 'This is likely a temporary issue. Try processing again in a few minutes.';
    }

    return null;
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" text="Loading your sources..." />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SourceForm
            source={editingSource || undefined}
            onSuccess={handleSourceSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingSource(null);
            }}
          />
        </div>
      </div>
    );
  }

  // Ensure sources is always an array before checking length
  const sourcesArray = sources || [];
  
  console.log('🔴 Sources state:', { 
    sources, 
    sourcesArray, 
    sourcesLength: sourcesArray.length,
    loading,
    authLoading,
    globalProcessing,
    user: user ? { id: user.id, email: user.email } : null,
    limits,
    isPremium
  });

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="mobile-container mobile-section">
        {/* Mobile-optimized Layout */}
        <div className="mobile-content">
          {/* Mobile Control Panel - Shown at top on mobile */}
          <div className="block lg:hidden mb-6">
            <CombinedControlPanel
              sourcesArray={sourcesArray}
              globalProcessing={globalProcessing}
              onProcessToday={() => handleProcessDirectly('today')}
              onProcessWeek={() => handleProcessDirectly('week')}
              onClearContent={() => setShowClearDialog(true)}
            />
          </div>

          {/* Desktop Left-Right Layout */}
          <div className="hidden lg:flex lg:gap-8">
            {/* Left Panel - Control Panel */}
            <div className="lg:w-1/3 xl:w-1/4">
              <div className="sticky top-8 space-y-6">
                <CombinedControlPanel
                  sourcesArray={sourcesArray}
                  globalProcessing={globalProcessing}
                  onProcessToday={() => handleProcessDirectly('today')}
                  onProcessWeek={() => handleProcessDirectly('week')}
                  onClearContent={() => setShowClearDialog(true)}
                />
              </div>
            </div>

            {/* Right Panel - Main Content (Desktop only wrapper) */}
            <div className="lg:w-2/3 xl:w-3/4">
              <div className="sources-main-content">
                {/* Content will be filled below */}
              </div>
            </div>
          </div>

          {/* Main Content - Responsive for both mobile and desktop */}
          <div className="sources-main-content lg:hidden">
            {/* Content will be filled below */}
          </div>
        </div>

        {/* Header Section */}
        <div className="mobile-stack mb-8">
          <div className="flex-1 mb-4 lg:mb-0">
            <h1 className="responsive-title font-bold text-gray-800">Content Sources</h1>
            <p className="text-gray-600 mt-2 responsive-subtitle">
              Add RSS feeds from your favorite blogs and news sites
            </p>
            {/* Debug Info - Mobile responsive */}
            <div className="mt-2 text-xs text-gray-500 bg-gray-100 rounded p-2 lg:p-3">
              <div className="flex flex-wrap gap-2">
                <span>📊 Sources: {sourcesArray.length}</span>
                <span>Plan: {isPremium ? 'Premium' : 'Free'}</span>
                <span>Limit: {sources.length}/{limits.maxSources}</span>
                <span>Status: {loading ? 'Loading' : 'Loaded'}</span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons - Mobile responsive */}
          <div className="mobile-stack">
            {canAddSource(sources.length) ? (
              <button onClick={() => setShowForm(true)} className="mobile-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Source
              </button>
            ) : (
              <div className="relative group">
                <button 
                  onClick={() => {
                    toast({
                      title: "Upgrade to Premium",
                      description: `Free users can add up to ${limits.maxSources} sources. Upgrade to Premium to add 20 sources.`,
                      action: (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigateTo('/subscription')}
                          className="ml-2"
                        >
                          <Crown className="w-4 h-4 mr-1" />
                          Upgrade
                        </Button>
                      ),
                    });
                  }}
                  className="mobile-button opacity-50 cursor-not-allowed"
                  disabled
                >
                  <Lock className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Source ({sources.length}/{limits.maxSources})</span>
                  <span className="sm:hidden">Locked</span>
                </button>
                <div className="absolute -top-2 -right-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
            )}
            
            {/* Debug Reset Button - Mobile responsive */}
            {globalProcessing && (
              <button
                onClick={() => {
                  console.log('🔧 Resetting global processing state');
                  setGlobalProcessing(false);
                  setCurrentTask(null);
                  setTaskProgress(null);
                  setIsPollingTask(false);
                }}
                className="btn-secondary text-red-600 border-red-300 hover:bg-red-50 hover:border-red-500"
              >
                <span className="hidden sm:inline">🔧 重置状态</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Task Progress - Mobile optimized */}
        {globalProcessing && (
          <div className="mobile-card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
            <div className="mobile-stack mb-4">
              <h3 className="text-lg font-semibold text-blue-800 flex items-center">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                <span className="hidden sm:inline">Processing in Progress</span>
                <span className="sm:hidden">Processing...</span>
              </h3>
              {taskProgress && (
                <span className="text-sm text-blue-600 font-medium">
                  {taskProgress.current || 0} / {taskProgress.total || 0}
                </span>
              )}
            </div>
            
            {/* Mobile-friendly progress info */}
            <div className="text-sm text-blue-700 mb-4 bg-blue-100 rounded-md p-3">
              ⏱️ <strong>Time:</strong> 1-5 min • AI summaries generating
            </div>
            
            {/* Progress bar */}
            {taskProgress && (
              <div className="w-full bg-blue-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out" 
                  style={{ 
                    width: `${taskProgress.total ? Math.max(5, (taskProgress.current / taskProgress.total) * 100) : 5}%` 
                  }}
                ></div>
              </div>
            )}
            
            {/* Current source - mobile responsive */}
            {taskProgress?.current_source && (
              <div className="text-sm text-blue-700 mb-3 bg-white rounded-md p-3 border border-blue-100">
                🔄 <strong>Processing:</strong>
                <div className="mt-1 text-blue-800 font-medium truncate">
                  {taskProgress.current_source}
                </div>
              </div>
            )}
            
            {/* Mobile-friendly progress grid */}
            {taskProgress && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-lg font-semibold text-green-600">
                    {taskProgress.processed_sources?.length || 0}
                  </div>
                  <div className="text-green-700 text-xs">Completed</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-lg font-semibold text-orange-600">
                    {taskProgress.skipped_sources?.length || 0}
                  </div>
                  <div className="text-orange-700 text-xs">Skipped</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-lg font-semibold text-blue-600">
                    {taskProgress.processed_sources?.reduce((total: number, source: any) => total + (source.articles_count || 0), 0) || 0}
                  </div>
                  <div className="text-blue-700 text-xs">Articles</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-lg font-semibold text-purple-600">
                    {currentTask?.status || 'running'}
                  </div>
                  <div className="text-purple-700 text-xs">Status</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Process Results - Mobile optimized */}
        {processResults && (
          <div className="mb-8">
            <Card className={`mobile-card ${
              processResults.success 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-md' 
                : 'bg-red-50 border-red-200'
            }`}>
              <CardHeader className="pb-4">
                <div className="mobile-stack">
                  <CardTitle className={`flex items-center ${
                    processResults.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {processResults.success ? (
                      <CheckCircle className="h-6 w-6 mr-2" />
                    ) : (
                      <AlertCircle className="h-6 w-6 mr-2" />
                    )}
                    <span className="hidden sm:inline">
                      {processResults.success ? 'Processing Complete!' : 'Processing Failed'}
                    </span>
                    <span className="sm:hidden">
                      {processResults.success ? 'Complete!' : 'Failed'}
                    </span>
                  </CardTitle>
                  {processResults.success && (
                    <Button 
                      onClick={() => window.location.href = '/digests'}
                      className="mobile-button bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      📖 View Digest
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Mobile-optimized success content */}
                {processResults.success ? (
                  <div className="mobile-content">
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <p className="text-green-800 font-medium mb-2 text-sm sm:text-base">
                        🎉 Your digest has been generated successfully!
                      </p>
                      <p className="text-green-700 text-sm">
                        Content summarized and ready to read.
                      </p>
                    </div>
                    
                    <div className="mobile-grid">
                      <div className="text-center p-4 bg-white rounded-lg border border-green-100">
                        <div className="text-xl sm:text-2xl font-bold text-green-600">
                          {processResults?.data?.processedSources?.length || 0}
                        </div>
                        <div className="text-xs sm:text-sm text-green-700">Sources</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg border border-green-100">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600">
                          {processResults?.data?.totalSummaries || 0}
                        </div>
                        <div className="text-xs sm:text-sm text-blue-700">Summaries</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg border border-green-100">
                        <div className="text-xl sm:text-2xl font-bold text-orange-600">
                          {processResults?.data?.skippedSources?.length || 0}
                        </div>
                        <div className="text-xs sm:text-sm text-orange-700">Skipped</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-700 bg-white rounded-lg p-4 border border-red-200">
                    <p className="font-medium text-sm sm:text-base">Processing Failed:</p>
                    <p className="text-sm mt-1">{processResults?.error || 'Unknown error occurred'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sources List - Mobile optimized */}
        {sourcesArray.length === 0 ? (
          <div className="mobile-card text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="responsive-title font-semibold text-gray-800 mb-2">No Sources Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto responsive-subtitle">
              Add your favorite blogs and news sites to start generating content digests.
            </p>
            <button onClick={() => setShowForm(true)} className="mobile-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Source
            </button>
          </div>
        ) : (
          /* Mobile-responsive Sources Grid */
          <div className="mobile-grid">
            {sourcesArray.map((source) => (
              <div key={source.id} className="mobile-card hover-lift">
                <div className="space-y-4">
                  {/* Source Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getTypeIcon(source.type)}
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate" title={source.name}>
                        {source.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => toggleSourceStatus(source)}
                      className={`flex-shrink-0 w-3 h-3 rounded-full transition-colors ${
                        source.isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      title={source.isActive ? 'Active' : 'Inactive'}
                    />
                  </div>

                  {/* Source Details */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 truncate" title={source.url}>{source.url}</p>
                    {source.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {source.description}
                      </p>
                    )}
                  </div>

                  {/* Source Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-secondary text-xs">
                      {source.type === 'podcast' ? 'Podcast' : source.type === 'blog' ? 'Blog' : 'Website'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      source.isActive ? 'badge-success' : 'badge-secondary'
                    }`}>
                      {source.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Last Scraped */}
                  <div className="text-xs text-gray-500">
                    Last Scraped: {formatDate(source.lastScraped)}
                  </div>

                  {/* Action Buttons - Mobile friendly */}
                  <div className="mobile-stack">
                    <button
                      onClick={() => handleEdit(source)}
                      className="btn-ghost btn-sm flex-1 sm:flex-none touch-target"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteDialog(source)}
                      className="btn-ghost btn-sm text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none touch-target"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal - Mobile optimized */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <SourceForm
              source={editingSource}
              onSuccess={handleSourceSuccess}
              onCancel={() => {
                setShowForm(false);
                setEditingSource(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="mobile-container max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Delete Source</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete "{deleteDialog?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mobile-stack">
            <AlertDialogCancel className="flex-1 sm:flex-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Content Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className="mobile-container max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Clear Scraped Content</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to clear all scraped content and summaries? 
              This will remove all generated digests but keep your sources intact. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mobile-stack">
            <AlertDialogCancel className="flex-1 sm:flex-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearScrapedContent}
              disabled={clearing}
              className="bg-orange-600 hover:bg-orange-700 flex-1 sm:flex-none"
            >
              {clearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Clearing...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                'Clear Content'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sources;