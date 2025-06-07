import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Trash2, Globe, Mic, FileText, Loader2, CheckCircle, AlertCircle, Sparkles, Zap } from 'lucide-react';
import { sourcesApi } from '../services/api';
import { ContentSource } from '../types';
import { useToast } from '../hooks/use-toast';
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
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<ContentSource | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<ContentSource | null>(null);
  const [globalProcessing, setGlobalProcessing] = useState(false);
  const [processResults, setProcessResults] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const data = await sourcesApi.getSources();
      setSources(data || []);
    } catch (error) {
      console.error('Failed to load sources:', error);
      setSources([]);
      toast({
        title: "Failed to load sources",
        description: "There was an error loading your content sources.",
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

  // 🚀 全局处理所有sources的功能
  const handleProcessAllSources = async () => {
    setGlobalProcessing(true);
    setProcessResults(null);

    try {
      console.log('🚀 开始全局处理所有sources...');
      
      const result = await sourcesApi.processAllSources();
      
      setProcessResults(result);

      if (result.success) {
        const { processedSources, skippedSources, totalSummaries } = result.data!;
        
        toast({
          title: "🎉 全局处理完成！",
          description: `成功处理 ${processedSources.length} 个sources，生成 ${totalSummaries} 个摘要。${skippedSources.length > 0 ? `跳过 ${skippedSources.length} 个sources。` : ''}`,
        });
        
        // 刷新 sources 列表以更新 lastScraped 时间
        fetchSources();
      } else {
        toast({
          title: "❌ 全局处理失败",
          description: result.error || "处理过程中发生错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('全局处理失败:', error);
      toast({
        title: "❌ 全局处理失败",
        description: "处理过程中发生错误，请重试。",
        variant: "destructive",
      });
    } finally {
      setGlobalProcessing(false);
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

  if (loading) {
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
                onClick={handleProcessAllSources}
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
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </div>
        </div>

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
      </div>
    </div>
  );
};

export default Sources;