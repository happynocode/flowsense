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
    setIsPollingTask(true);
    const pollInterval = setInterval(async () => {
      try {
        const statusResult = await sourcesApi.getTaskStatus(taskId, user?.id);
        
        if (statusResult.success && statusResult.task) {
          const task = statusResult.task;
          setCurrentTask(task);
          setTaskProgress(task.progress);
          
          console.log('📊 Task status:', task.status, task.progress);
          
          // 任务完成
          if (task.status === 'completed') {
            clearInterval(pollInterval);
            setIsPollingTask(false);
            setGlobalProcessing(false);
            
            const result = task.result;
            setProcessResults({ success: true, data: result });
            
            toast({
              title: "🎉 全局处理完成！",
              description: `成功处理 ${result.processedSources.length} 个sources，生成 ${result.totalSummaries} 个摘要。${result.skippedSources.length > 0 ? `跳过 ${result.skippedSources.length} 个sources。` : ''}`,
            });
            
            // 刷新 sources 列表
            fetchSources();
            
          } else if (task.status === 'failed') {
            clearInterval(pollInterval);
            setIsPollingTask(false);
            setGlobalProcessing(false);
            
            toast({
              title: "❌ 全局处理失败",
              description: task.error_message || "处理过程中发生错误",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error);
      }
    }, 2000); // 每2秒轮询一次
    
    // 设置最大轮询时间（10分钟）
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsPollingTask(false);
      setGlobalProcessing(false);
    }, 10 * 60 * 1000);
  };

  // 🚀 新的异步处理函数
  const handleProcessAllSourcesAsync = async () => {
    setGlobalProcessing(true);
    setProcessResults(null);
    setCurrentTask(null);
    setTaskProgress(null);

    try {
      console.log('🚀 启动异步处理任务...');
      
      const result = await sourcesApi.startProcessingTask(user?.id);
      
      if (result.success && result.task_id) {
        toast({
          title: "🚀 任务已创建",
          description: result.message || "任务已创建，正在启动处理...",
        });
        
        console.log('🔄 手动触发任务执行...');
        
        // 手动触发执行任务
        const triggerResult = await sourcesApi.triggerTaskExecution(result.task_id.toString(), user?.id);
        
        if (triggerResult.success) {
          toast({
            title: "✅ 任务启动成功",
            description: "正在后台处理，请稍候...",
          });
          
          // 开始轮询任务状态
          pollTaskStatus(result.task_id.toString());
        } else {
          toast({
            title: "⚠️ 任务创建成功但启动失败",
            description: triggerResult.error || "请稍后重试",
            variant: "destructive",
          });
          setGlobalProcessing(false);
        }
        
      } else {
        setGlobalProcessing(false);
        toast({
          title: "❌ 任务创建失败",
          description: result.error || "创建处理任务失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('启动异步任务失败:', error);
      setGlobalProcessing(false);
      toast({
        title: "❌ 任务启动失败",
        description: "启动处理任务失败，请重试。",
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
            {/* 🚀 全局处理按钮 */}
            {sourcesArray.length > 0 && (
              <Button 
                onClick={handleProcessAllSourcesAsync}
                disabled={globalProcessing}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {globalProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing All...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Process All Sources
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
          </div>
        </div>

        {/* 📊 任务进度显示 */}
        {globalProcessing && taskProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-blue-800">
                📊 Processing Progress
              </h3>
              <span className="text-sm text-blue-600">
                {taskProgress.current || 0} / {taskProgress.total || 0}
              </span>
            </div>
            
            {/* 进度条 */}
            <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${taskProgress.total ? (taskProgress.current / taskProgress.total) * 100 : 0}%` 
                }}
              ></div>
            </div>
            
            {/* 当前处理的源 */}
            {taskProgress.current_source && (
              <p className="text-sm text-blue-700 mb-2">
                🔄 Currently processing: <strong>{taskProgress.current_source}</strong>
              </p>
            )}
            
            {/* 已处理和跳过的源统计 */}
            <div className="flex space-x-4 text-sm">
              {taskProgress.processed_sources && (
                <span className="text-green-600">
                  ✅ Processed: {taskProgress.processed_sources.length}
                </span>
              )}
              {taskProgress.skipped_sources && (
                <span className="text-orange-600">
                  ⚠️ Skipped: {taskProgress.skipped_sources.length}
                </span>
              )}
              {currentTask?.status && (
                <span className="text-blue-600">
                  📋 Status: {currentTask.status}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 全局处理结果显示 */}
        {processResults && (
          <div className="mb-8">
            <Card className={`${
              processResults.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <CardHeader>
                <CardTitle className={`flex items-center ${
                  processResults.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {processResults.success ? (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mr-2" />
                  )}
                  全局处理结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                {processResults.success ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-white rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {processResults.data.processedSources.length}
                        </div>
                        <div className="text-sm text-green-700">成功处理</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {processResults.data.totalSummaries}
                        </div>
                        <div className="text-sm text-blue-700">生成摘要</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {processResults.data.skippedSources.length}
                        </div>
                        <div className="text-sm text-orange-700">跳过源</div>
                      </div>
                    </div>
                    
                    {processResults.data.skippedSources.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-orange-800 mb-2">跳过的Sources:</h4>
                        <div className="space-y-2">
                          {processResults.data.skippedSources.map((source: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-orange-100 rounded">
                              <span className="font-medium">{source.name}</span>
                              <span className="text-sm text-orange-700">{source.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-700">
                    <p className="font-medium">处理失败:</p>
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