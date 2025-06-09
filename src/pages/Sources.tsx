import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Trash2, Globe, Mic, FileText, Loader2, CheckCircle, AlertCircle, Sparkles, Zap, Eraser } from 'lucide-react';
import { sourcesApi } from '../services/api';
import { ContentSource } from '../types';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import LoadingIndicator from '../components/common/LoadingIndicator';
import SourceForm from '../components/sources/SourceForm';
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
  const { user, loading: authLoading } = useAuth();
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
      
      // 传递用户ID到API调用，避免认证状态不同步问题
      const response = await sourcesApi.getSources(1, 10, user?.id);
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
                  onClick={() => window.location.href = '/digests'}
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
    }, 10000); // 每10秒轮询一次
    
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
      const timeRangeText = timeRange === 'today' ? '今天' : '过去一周';
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
        title: "✅ 内容清除成功",
        description: "所有已抓取的内容和摘要已清除，Sources保留。",
      });
    } catch (error) {
      console.error('Failed to clear scraped content:', error);
      toast({
        title: "❌ 清除失败",
        description: "清除内容时发生错误，请重试。",
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
    user: user ? { id: user.id, email: user.email } : null
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Sources</h1>
            <p className="text-gray-600 mt-2">
              Manage your blogs, podcasts, and news sources
            </p>
          </div>
          <div className="flex space-x-3">
            {/* 🚀 处理按钮 - 今天的内容 */}
            {sourcesArray.length > 0 && (
              <Button 
                onClick={() => handleProcessAllSourcesAsync('today')}
                disabled={globalProcessing}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
              >
                {globalProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Process Today
                  </>
                )}
              </Button>
            )}
            
            {/* 🚀 处理按钮 - 过去一周的内容 */}
            {sourcesArray.length > 0 && (
              <Button 
                onClick={() => {
                  console.log('🔴 Process Week button clicked!');
                  console.log('🔴 Button state - disabled:', globalProcessing);
                  handleProcessAllSourcesAsync('week');
                }}
                disabled={globalProcessing}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {globalProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Process Week
                  </>
                )}
              </Button>
            )}
            
            {/* 🗑️ 清除内容按钮 */}
            {sourcesArray.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowClearDialog(true)}
                className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
              >
                <Eraser className="h-4 w-4 mr-2" />
                Clear Content
              </Button>
            )}
            
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
            
            {/* 🔧 调试重置按钮 */}
            {globalProcessing && (
              <Button
                variant="outline"
                onClick={() => {
                  console.log('🔧 Resetting global processing state');
                  setGlobalProcessing(false);
                  setCurrentTask(null);
                  setTaskProgress(null);
                  setIsPollingTask(false);
                }}
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                🔧 Reset State
              </Button>
            )}
          </div>
        </div>

        {/* 📊 任务进度显示 */}
        {globalProcessing && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-800 flex items-center">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing in Progress
              </h3>
              {taskProgress && (
                <span className="text-sm text-blue-600 font-medium">
                  {taskProgress.current || 0} / {taskProgress.total || 0} sources
                </span>
              )}
            </div>
            
            {/* 预计时间提示 */}
            <div className="text-sm text-blue-700 mb-4 bg-blue-100 rounded-md p-3">
              ⏱️ <strong>Estimated time:</strong> 1-5 minutes • Processing each source and generating AI summaries
            </div>
            
            {/* 进度条 */}
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
            
            {/* 当前处理的源 */}
            {taskProgress?.current_source && (
              <div className="text-sm text-blue-700 mb-3 bg-white rounded-md p-3 border border-blue-100">
                🔄 <strong>Currently processing:</strong> {taskProgress.current_source}
                <div className="text-xs text-blue-600 mt-1">
                  Fetching articles and generating summaries...
                </div>
              </div>
            )}
            
            {/* 已处理和跳过的源统计 */}
            {taskProgress && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-lg font-semibold text-green-600">
                    {taskProgress.processed_sources?.length || 0}
                  </div>
                  <div className="text-green-700">Completed</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-lg font-semibold text-orange-600">
                    {taskProgress.skipped_sources?.length || 0}
                  </div>
                  <div className="text-orange-700">Skipped</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-lg font-semibold text-blue-600">
                    {currentTask?.status || 'running'}
                  </div>
                  <div className="text-blue-700">Status</div>
                </div>
              </div>
            )}
            
            {/* 如果没有taskProgress，显示初始状态 */}
            {!taskProgress && (
              <div className="text-center text-blue-700">
                <div className="text-lg font-medium mb-2">🚀 Initializing...</div>
                <div className="text-sm">Preparing to process your sources</div>
              </div>
            )}
          </div>
        )}

        {/* 全局处理结果显示 */}
        {processResults && (
          <div className="mb-8">
            <Card className={`${
              processResults.success 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-md' 
                : 'bg-red-50 border-red-200'
            }`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`flex items-center ${
                    processResults.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {processResults.success ? (
                      <CheckCircle className="h-6 w-6 mr-2" />
                    ) : (
                      <AlertCircle className="h-6 w-6 mr-2" />
                    )}
                    {processResults.success ? 'Processing Complete!' : 'Processing Failed'}
                  </CardTitle>
                  {processResults.success && (
                    <Button 
                      onClick={() => window.location.href = '/digests'}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      📖 View Digest
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {processResults.success ? (
                  <div className="space-y-6">
                    {/* 成功摘要信息 */}
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <p className="text-green-800 font-medium mb-2">
                        🎉 Your digest has been generated successfully!
                      </p>
                      <p className="text-green-700 text-sm">
                        All processed content has been summarized and organized. 
                        Click "View Digest" to read your personalized content summary.
                      </p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-white rounded-lg border border-green-100">
                        <div className="text-2xl font-bold text-green-600">
                          {processResults.data.processedSources.length}
                        </div>
                        <div className="text-sm text-green-700">Sources Processed</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg border border-green-100">
                        <div className="text-2xl font-bold text-blue-600">
                          {processResults.data.totalSummaries}
                        </div>
                        <div className="text-sm text-blue-700">Summaries Generated</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg border border-green-100">
                        <div className="text-2xl font-bold text-orange-600">
                          {processResults.data.skippedSources.length}
                        </div>
                        <div className="text-sm text-orange-700">Sources Skipped</div>
                      </div>
                    </div>
                    
                    {processResults.data.skippedSources.length > 0 && (
                      <div className="mt-4 bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <h4 className="font-medium text-orange-800 mb-3 flex items-center">
                          ⚠️ Skipped Sources
                        </h4>
                        <div className="space-y-3">
                          {processResults.data.skippedSources.map((source: any, index: number) => (
                            <div key={index} className="bg-white rounded-lg border border-orange-100 p-4">
                              <div className="flex items-start justify-between mb-2">
                                <span className="font-medium text-gray-800">{source.name}</span>
                                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                  Skipped
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                <strong>Reason:</strong> {getFriendlyErrorMessage(source.reason)}
                              </div>
                              {getErrorSuggestion(source.reason) && (
                                <div className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded">
                                  💡 <strong>Suggestion:</strong> {getErrorSuggestion(source.reason)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-700 bg-white rounded-lg p-4 border border-red-200">
                    <p className="font-medium">Processing Failed:</p>
                    <p className="text-sm mt-1">{processResults.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {sourcesArray.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No sources yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Add your favorite blogs, podcasts, and news sites to start generating personalized content digests.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Source
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Sources Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sourcesArray.map((source) => (
              <Card key={source.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(source.type)}
                      <CardTitle className="text-lg truncate">{source.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleSourceStatus(source)}
                        className={`h-2 w-2 rounded-full ${
                          source.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={source.isActive ? 'Active' : 'Inactive'}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 truncate">{source.url}</p>
                    {source.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {source.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant={source.type === 'podcast' ? 'default' : 'secondary'}>
                        {source.type}
                      </Badge>
                      <Badge variant={source.isActive ? 'default' : 'secondary'}>
                        {source.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Last scraped: {formatDate(source.lastScraped)}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(source)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialog(source)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Source</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteDialog?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialog && handleDelete(deleteDialog)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear Content Confirmation Dialog */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Scraped Content</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to clear all scraped content and summaries? 
                This will remove all generated digests and content items but keep your sources intact. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearScrapedContent}
                disabled={clearing}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {clearing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  'Clear Content'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Sources;